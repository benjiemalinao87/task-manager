import { Hono } from 'hono';
import type { Env } from '../types';
import { requireAuth } from '../middleware/auth';
import { getCurrentTimestamp, generateId } from '../utils/crypto';

const activity = new Hono<{ Bindings: Env }>();

// POST /api/activity/log - Log an activity event
activity.post('/log', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    const body = await c.req.json<{
      eventType: string;
      idleDurationSeconds?: number;
      wasClockedIn?: boolean;
      wasTaskTimerRunning?: boolean;
      promptResponseTimeSeconds?: number;
      tabVisible?: boolean;
      notes?: string;
    }>();

    const {
      eventType,
      idleDurationSeconds,
      wasClockedIn = false,
      wasTaskTimerRunning = false,
      promptResponseTimeSeconds,
      tabVisible = true,
      notes,
    } = body;

    // Validate event type
    const validEventTypes = [
      'idle_detected',
      'prompt_shown',
      'user_continued',
      'auto_paused',
      'manual_paused',
      'resumed',
      'tab_hidden',
      'tab_visible',
    ];

    if (!validEventTypes.includes(eventType)) {
      return c.json({ error: 'Invalid event type' }, 400);
    }

    // Get current session if exists
    const session = await c.env.DB.prepare(`
      SELECT id, workspace_id FROM time_sessions
      WHERE user_id = ? AND clock_out IS NULL
      ORDER BY clock_in DESC LIMIT 1
    `).bind(auth.userId).first<{ id: string; workspace_id: string }>();

    // Get user agent from request
    const userAgent = c.req.header('user-agent') || null;

    // Create activity log
    const logId = generateId();
    const timestamp = getCurrentTimestamp();

    await c.env.DB.prepare(`
      INSERT INTO activity_logs (
        id, user_id, workspace_id, session_id,
        event_type, timestamp, idle_duration_seconds,
        was_clocked_in, was_task_timer_running,
        prompt_response_time_seconds, user_agent, tab_visible, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      logId,
      auth.userId,
      session?.workspace_id || null,
      session?.id || null,
      eventType,
      timestamp,
      idleDurationSeconds || null,
      wasClockedIn ? 1 : 0,
      wasTaskTimerRunning ? 1 : 0,
      promptResponseTimeSeconds || null,
      userAgent,
      tabVisible ? 1 : 0,
      notes || null
    ).run();

    console.log(`📊 Activity logged: ${eventType} for user ${auth.userId}`);

    return c.json({
      success: true,
      logId,
      message: 'Activity logged successfully'
    });
  } catch (error) {
    console.error('Error logging activity:', error);
    return c.json({ error: 'Failed to log activity' }, 500);
  }
});

// GET /api/activity/logs - Get activity logs for current user
activity.get('/logs', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    const { searchParams } = new URL(c.req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const eventType = searchParams.get('eventType');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    let query = `
      SELECT * FROM activity_logs
      WHERE user_id = ?
    `;
    const bindings: any[] = [auth.userId];

    if (eventType) {
      query += ` AND event_type = ?`;
      bindings.push(eventType);
    }

    if (dateFrom) {
      query += ` AND date(timestamp) >= date(?)`;
      bindings.push(dateFrom);
    }

    if (dateTo) {
      query += ` AND date(timestamp) <= date(?)`;
      bindings.push(dateTo);
    }

    query += ` ORDER BY timestamp DESC LIMIT ?`;
    bindings.push(limit);

    const { results } = await c.env.DB.prepare(query).bind(...bindings).all();

    return c.json({
      logs: results || [],
      count: results?.length || 0
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return c.json({ error: 'Failed to fetch activity logs' }, 500);
  }
});

// GET /api/activity/stats - Get activity statistics
activity.get('/stats', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    const { searchParams } = new URL(c.req.url);
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    let dateFilter = '';
    const bindings: any[] = [auth.userId];

    if (dateFrom && dateTo) {
      dateFilter = `AND date(timestamp) BETWEEN date(?) AND date(?)`;
      bindings.push(dateFrom, dateTo);
    }

    // Get event type counts
    const { results: eventCounts } = await c.env.DB.prepare(`
      SELECT 
        event_type,
        COUNT(*) as count,
        AVG(idle_duration_seconds) as avg_idle_seconds,
        AVG(prompt_response_time_seconds) as avg_response_seconds
      FROM activity_logs
      WHERE user_id = ? ${dateFilter}
      GROUP BY event_type
      ORDER BY count DESC
    `).bind(...bindings).all();

    // Get total auto-pauses
    const totalAutoPauses = await c.env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM activity_logs
      WHERE user_id = ? AND event_type = 'auto_paused' ${dateFilter}
    `).bind(...bindings).first<{ count: number }>();

    // Get average idle time
    const avgIdleTime = await c.env.DB.prepare(`
      SELECT AVG(idle_duration_seconds) as avg_seconds
      FROM activity_logs
      WHERE user_id = ? AND idle_duration_seconds IS NOT NULL ${dateFilter}
    `).bind(...bindings).first<{ avg_seconds: number }>();

    return c.json({
      eventCounts: eventCounts || [],
      totalAutoPauses: totalAutoPauses?.count || 0,
      avgIdleTimeSeconds: avgIdleTime?.avg_seconds || 0,
    });
  } catch (error) {
    console.error('Error fetching activity stats:', error);
    return c.json({ error: 'Failed to fetch activity stats' }, 500);
  }
});

// GET /api/activity/settings - Get user's activity settings
activity.get('/settings', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    const settings = await c.env.DB.prepare(`
      SELECT * FROM activity_settings WHERE user_id = ?
    `).bind(auth.userId).first();

    // If no settings exist, return defaults
    if (!settings) {
      return c.json({
        settings: {
          idle_timeout_minutes: 5,
          prompt_timeout_seconds: 60,
          activity_tracking_enabled: 1,
          track_tab_visibility: 1,
          notify_on_auto_pause: 1,
        }
      });
    }

    return c.json({ settings });
  } catch (error) {
    console.error('Error fetching activity settings:', error);
    return c.json({ error: 'Failed to fetch activity settings' }, 500);
  }
});

// PATCH /api/activity/settings - Update user's activity settings
activity.patch('/settings', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    const body = await c.req.json<{
      idleTimeoutMinutes?: number;
      promptTimeoutSeconds?: number;
      activityTrackingEnabled?: boolean;
      trackTabVisibility?: boolean;
      notifyOnAutoPause?: boolean;
    }>();

    const now = getCurrentTimestamp();

    // Check if settings exist
    const existing = await c.env.DB.prepare(`
      SELECT user_id FROM activity_settings WHERE user_id = ?
    `).bind(auth.userId).first();

    if (existing) {
      // Update existing settings
      const updates: string[] = [];
      const bindings: any[] = [];

      if (body.idleTimeoutMinutes !== undefined) {
        updates.push('idle_timeout_minutes = ?');
        bindings.push(body.idleTimeoutMinutes);
      }
      if (body.promptTimeoutSeconds !== undefined) {
        updates.push('prompt_timeout_seconds = ?');
        bindings.push(body.promptTimeoutSeconds);
      }
      if (body.activityTrackingEnabled !== undefined) {
        updates.push('activity_tracking_enabled = ?');
        bindings.push(body.activityTrackingEnabled ? 1 : 0);
      }
      if (body.trackTabVisibility !== undefined) {
        updates.push('track_tab_visibility = ?');
        bindings.push(body.trackTabVisibility ? 1 : 0);
      }
      if (body.notifyOnAutoPause !== undefined) {
        updates.push('notify_on_auto_pause = ?');
        bindings.push(body.notifyOnAutoPause ? 1 : 0);
      }

      if (updates.length > 0) {
        updates.push('updated_at = ?');
        bindings.push(now);
        bindings.push(auth.userId);

        await c.env.DB.prepare(`
          UPDATE activity_settings
          SET ${updates.join(', ')}
          WHERE user_id = ?
        `).bind(...bindings).run();
      }
    } else {
      // Insert new settings
      await c.env.DB.prepare(`
        INSERT INTO activity_settings (
          user_id, idle_timeout_minutes, prompt_timeout_seconds,
          activity_tracking_enabled, track_tab_visibility, notify_on_auto_pause,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        auth.userId,
        body.idleTimeoutMinutes || 5,
        body.promptTimeoutSeconds || 60,
        body.activityTrackingEnabled !== false ? 1 : 0,
        body.trackTabVisibility !== false ? 1 : 0,
        body.notifyOnAutoPause !== false ? 1 : 0,
        now
      ).run();
    }

    return c.json({
      success: true,
      message: 'Activity settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating activity settings:', error);
    return c.json({ error: 'Failed to update activity settings' }, 500);
  }
});

export default activity;

