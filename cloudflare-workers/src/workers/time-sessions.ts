import { Hono } from 'hono';
import type { Env } from '../types';
import { requireAuth } from '../middleware/auth';
import { getCurrentTimestamp, generateId } from '../utils/crypto';

const timeSessions = new Hono<{ Bindings: Env }>();

// GET /api/time-sessions/active - Get active session
timeSessions.get('/active', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    const session = await c.env.DB.prepare(
      'SELECT * FROM time_sessions WHERE user_id = ? AND clock_out IS NULL ORDER BY clock_in DESC LIMIT 1'
    ).bind(auth.userId).first();

    if (!session) {
      return c.json({ session: null });
    }

    return c.json({ session });
  } catch (error) {
    console.error('Get active session error:', error);
    return c.json({ error: 'Failed to get active session' }, 500);
  }
});

// POST /api/time-sessions/clock-in - Clock in
timeSessions.post('/clock-in', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    // Check if already clocked in
    const existingSession = await c.env.DB.prepare(
      'SELECT * FROM time_sessions WHERE user_id = ? AND clock_out IS NULL'
    ).bind(auth.userId).first();

    if (existingSession) {
      return c.json({ error: 'Already clocked in' }, 400);
    }

    // Create new session
    const sessionId = generateId();
    const clockInTime = getCurrentTimestamp();

    await c.env.DB.prepare(
      'INSERT INTO time_sessions (id, user_id, clock_in) VALUES (?, ?, ?)'
    ).bind(sessionId, auth.userId, clockInTime).run();

    const session = await c.env.DB.prepare(
      'SELECT * FROM time_sessions WHERE id = ?'
    ).bind(sessionId).first();

    // Get user email for notification
    const settings = await c.env.DB.prepare(
      'SELECT default_email FROM settings WHERE user_id = ?'
    ).bind(auth.userId).first<{ default_email: string }>();

    // Queue clock-in email if email is set
    if (settings?.default_email) {
      await c.env.EMAIL_QUEUE.send({
        type: 'clock_in',
        userId: auth.userId,
        email: settings.default_email,
        sessionId: sessionId,
      });
    }

    return c.json({ session, message: 'Clocked in successfully' });
  } catch (error) {
    console.error('Clock in error:', error);
    return c.json({ error: 'Failed to clock in' }, 500);
  }
});

// POST /api/time-sessions/clock-out - Clock out
timeSessions.post('/clock-out', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    // Get active session
    const session = await c.env.DB.prepare(
      'SELECT * FROM time_sessions WHERE user_id = ? AND clock_out IS NULL ORDER BY clock_in DESC LIMIT 1'
    ).bind(auth.userId).first<{ id: string; clock_in: string }>();

    if (!session) {
      return c.json({ error: 'No active session found' }, 404);
    }

    // Calculate duration
    const clockOutTime = getCurrentTimestamp();
    const clockInTime = new Date(session.clock_in);
    const clockOut = new Date(clockOutTime);
    const durationMinutes = Math.floor((clockOut.getTime() - clockInTime.getTime()) / 60000);

    // Update session
    await c.env.DB.prepare(
      'UPDATE time_sessions SET clock_out = ?, duration_minutes = ?, updated_at = ? WHERE id = ?'
    ).bind(clockOutTime, durationMinutes, clockOutTime, session.id).run();

    const updatedSession = await c.env.DB.prepare(
      'SELECT * FROM time_sessions WHERE id = ?'
    ).bind(session.id).first();

    // Fetch tasks created during the session for the daily report
    const tasksResult = await c.env.DB.prepare(`
      SELECT task_name, description, estimated_time, actual_time, ai_summary
      FROM tasks
      WHERE user_id = ?
      AND created_at >= ?
      AND created_at <= ?
      ORDER BY created_at ASC
    `).bind(auth.userId, session.clock_in, clockOutTime).all();

    const tasks = (tasksResult.results || []).map((task: any) => ({
      taskName: task.task_name,
      description: task.description,
      estimatedTime: task.estimated_time,
      actualTime: task.actual_time || 'N/A',
      aiSummary: task.ai_summary
    }));

    // Get user email for daily report
    const settings = await c.env.DB.prepare(
      'SELECT default_email FROM settings WHERE user_id = ?'
    ).bind(auth.userId).first<{ default_email: string }>();

    // Queue daily report email
    if (settings?.default_email) {
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      const durationFormatted = `${hours}h ${minutes}m`;

      await c.env.EMAIL_QUEUE.send({
        type: 'daily_report',
        userId: auth.userId,
        email: settings.default_email,
        sessionId: session.id,
        session: {
          clockIn: session.clock_in,
          clockOut: clockOutTime,
          durationMinutes,
          durationFormatted
        },
        tasks
      });
      console.log(`✅ Daily report email queued for ${settings.default_email}`);
    }

    return c.json({
      session: updatedSession,
      message: 'Clocked out successfully',
      durationMinutes
    });
  } catch (error) {
    console.error('Clock out error:', error);
    return c.json({ error: 'Failed to clock out' }, 500);
  }
});

// GET /api/time-sessions - Get all sessions
timeSessions.get('/', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM time_sessions WHERE user_id = ? ORDER BY clock_in DESC LIMIT 50'
    ).bind(auth.userId).all();

    return c.json(results || []);
  } catch (error) {
    console.error('Get sessions error:', error);
    return c.json({ error: 'Failed to get sessions' }, 500);
  }
});

export default timeSessions;

