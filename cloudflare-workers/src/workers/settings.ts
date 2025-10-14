import { Hono } from 'hono';
import type { Env } from '../types';
import { requireAuth } from '../middleware/auth';
import { getCurrentTimestamp, generateId } from '../utils/crypto';

const settings = new Hono<{ Bindings: Env }>();

// GET /api/settings - Get user settings
settings.get('/', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    // Get user settings
    let userSettings = await c.env.DB.prepare(
      'SELECT * FROM settings WHERE user_id = ?'
    ).bind(auth.userId).first();

    // If no settings exist, create default settings
    if (!userSettings) {
      const settingsId = generateId();
      await c.env.DB.prepare(
        `INSERT INTO settings (
          id, user_id, default_email, timezone, notifications_enabled,
          notify_task_created, notify_task_completed, notify_daily_summary, notify_weekly_summary,
          onboarding_completed, invoice_module_enabled
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        settingsId,
        auth.userId,
        '',
        'America/Los_Angeles',
        1,
        1,
        1,
        0,
        0,
        0,
        0
      ).run();

      userSettings = await c.env.DB.prepare(
        'SELECT * FROM settings WHERE user_id = ?'
      ).bind(auth.userId).first();
    }

    return c.json(userSettings);

  } catch (error) {
    console.error('Get settings error:', error);
    return c.json({ error: 'Failed to get settings' }, 500);
  }
});

// PATCH /api/settings - Update user settings
settings.patch('/', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    const updates = await c.req.json();

    // Get existing settings
    let userSettings = await c.env.DB.prepare(
      'SELECT * FROM settings WHERE user_id = ?'
    ).bind(auth.userId).first();

    // If no settings exist, create them first
    if (!userSettings) {
      const settingsId = generateId();
      await c.env.DB.prepare(
        `INSERT INTO settings (
          id, user_id, default_email, timezone, notifications_enabled,
          notify_task_created, notify_task_completed, notify_daily_summary, notify_weekly_summary,
          onboarding_completed, invoice_module_enabled
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        settingsId,
        auth.userId,
        '',
        'America/Los_Angeles',
        1,
        1,
        1,
        0,
        0,
        0,
        0
      ).run();
    }

    // Build dynamic update query
    const allowedFields = [
      'default_email',
      'timezone',
      'notifications_enabled',
      'notify_task_created',
      'notify_task_completed',
      'notify_daily_summary',
      'notify_weekly_summary',
      'onboarding_completed',
      'email_subject_task_created',
      'email_subject_task_completed',
      'invoice_module_enabled'
    ];

    const updateFields = Object.keys(updates).filter(key => allowedFields.includes(key));
    
    if (updateFields.length === 0) {
      return c.json({ error: 'No valid fields to update' }, 400);
    }

    const setClause = updateFields.map(field => `${field} = ?`).join(', ');
    const values = updateFields.map(field => updates[field]);
    
    await c.env.DB.prepare(
      `UPDATE settings SET ${setClause}, updated_at = ? WHERE user_id = ?`
    ).bind(...values, getCurrentTimestamp(), auth.userId).run();

    // Return updated settings
    const updatedSettings = await c.env.DB.prepare(
      'SELECT * FROM settings WHERE user_id = ?'
    ).bind(auth.userId).first();

    return c.json(updatedSettings);

  } catch (error) {
    console.error('Update settings error:', error);
    return c.json({ error: 'Failed to update settings' }, 500);
  }
});

// POST /api/settings/notifications - Set notification preferences (onboarding)
settings.post('/notifications', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    const { 
      notifyTaskCreated, 
      notifyTaskCompleted, 
      notifyDailySummary, 
      notifyWeeklySummary 
    } = await c.req.json();

    // Get existing settings
    let userSettings = await c.env.DB.prepare(
      'SELECT * FROM settings WHERE user_id = ?'
    ).bind(auth.userId).first();

    // If no settings exist, create them
    if (!userSettings) {
      const settingsId = generateId();
      await c.env.DB.prepare(
        `INSERT INTO settings (
          id, user_id, default_email, timezone, notifications_enabled,
          notify_task_created, notify_task_completed, notify_daily_summary, notify_weekly_summary,
          onboarding_completed, invoice_module_enabled
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        settingsId,
        auth.userId,
        '',
        'America/Los_Angeles',
        1,
        notifyTaskCreated ? 1 : 0,
        notifyTaskCompleted ? 1 : 0,
        notifyDailySummary ? 1 : 0,
        notifyWeeklySummary ? 1 : 0,
        1, // Mark onboarding as completed
        0  // Invoice module disabled by default
      ).run();
    } else {
      // Update existing settings
      await c.env.DB.prepare(
        `UPDATE settings SET 
          notify_task_created = ?,
          notify_task_completed = ?,
          notify_daily_summary = ?,
          notify_weekly_summary = ?,
          onboarding_completed = 1,
          updated_at = ?
        WHERE user_id = ?`
      ).bind(
        notifyTaskCreated ? 1 : 0,
        notifyTaskCompleted ? 1 : 0,
        notifyDailySummary ? 1 : 0,
        notifyWeeklySummary ? 1 : 0,
        getCurrentTimestamp(),
        auth.userId
      ).run();
    }

    return c.json({ 
      success: true, 
      message: 'Notification preferences saved',
      onboardingCompleted: true
    });

  } catch (error) {
    console.error('Save notification preferences error:', error);
    return c.json({ error: 'Failed to save notification preferences' }, 500);
  }
});

export default settings;

