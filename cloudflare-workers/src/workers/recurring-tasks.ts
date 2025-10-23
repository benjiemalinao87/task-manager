import { Hono } from 'hono';
import type { Env } from '../types';
import { requireAuth } from '../middleware/auth';
import { getCurrentTimestamp, generateId } from '../utils/crypto';

const recurringTasks = new Hono<{ Bindings: Env }>();

// Helper function to calculate next occurrence date
function calculateNextOccurrence(pattern: any): string | null {
  const now = new Date();
  const start = new Date(pattern.start_date);
  
  // If we haven't reached start date yet, return start date
  if (start > now) {
    return pattern.start_date;
  }
  
  // Check if pattern has ended
  if (pattern.end_date) {
    const end = new Date(pattern.end_date);
    if (now > end) {
      return null;
    }
  }
  
  // Check occurrences limit
  if (pattern.occurrences_limit && pattern.occurrences_count >= pattern.occurrences_limit) {
    return null;
  }
  
  let nextDate = pattern.last_generated_date ? new Date(pattern.last_generated_date) : start;
  
  switch (pattern.frequency) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + pattern.interval);
      break;
      
    case 'weekly':
      const daysOfWeek = pattern.days_of_week ? JSON.parse(pattern.days_of_week) : [];
      if (daysOfWeek.length === 0) {
        // If no specific days, just add weeks
        nextDate.setDate(nextDate.getDate() + (7 * pattern.interval));
      } else {
        // Find next matching day of week
        const dayMap: { [key: string]: number } = {
          'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
          'thursday': 4, 'friday': 5, 'saturday': 6
        };
        
        let found = false;
        for (let i = 1; i <= 14; i++) { // Look up to 2 weeks ahead
          const testDate = new Date(nextDate);
          testDate.setDate(testDate.getDate() + i);
          const dayName = testDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
          
          if (daysOfWeek.includes(dayName)) {
            nextDate = testDate;
            found = true;
            break;
          }
        }
        
        if (!found) {
          nextDate.setDate(nextDate.getDate() + (7 * pattern.interval));
        }
      }
      break;
      
    case 'monthly':
      if (pattern.day_of_month) {
        nextDate.setMonth(nextDate.getMonth() + pattern.interval);
        nextDate.setDate(pattern.day_of_month);
      } else if (pattern.week_of_month && pattern.day_name) {
        // e.g., "second Tuesday of every month"
        nextDate.setMonth(nextDate.getMonth() + pattern.interval);
        // Calculate the specific day (complex logic would go here)
        nextDate.setDate(nextDate.getDate() + 1);
      } else {
        nextDate.setMonth(nextDate.getMonth() + pattern.interval);
      }
      break;
      
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + pattern.interval);
      break;
  }
  
  // Check if next date exceeds end date
  if (pattern.end_date) {
    const end = new Date(pattern.end_date);
    if (nextDate > end) {
      return null;
    }
  }
  
  return nextDate.toISOString().split('T')[0];
}

// POST /api/recurring-tasks - Create a recurring pattern
recurringTasks.post('/', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    const body = await c.req.json<{
      task_name: string;
      description: string;
      estimated_time: string;
      task_link?: string;
      priority?: string;
      assigned_to?: string;
      frequency: string;
      interval?: number;
      days_of_week?: string[];
      day_of_month?: number;
      time_of_day?: string;
      start_date: string;
      end_date?: string;
      occurrences_limit?: number;
    }>();

    const {
      task_name,
      description,
      estimated_time,
      task_link,
      priority = 'medium',
      assigned_to,
      frequency,
      interval = 1,
      days_of_week,
      day_of_month,
      time_of_day,
      start_date,
      end_date,
      occurrences_limit
    } = body;

    // Validate required fields
    if (!task_name || !description || !estimated_time || !frequency || !start_date) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Get workspace if user is in one
    const workspaceMember = await c.env.DB.prepare(`
      SELECT workspace_id FROM workspace_members
      WHERE user_id = ?
      LIMIT 1
    `).bind(auth.userId).first<{ workspace_id: string }>();

    const patternId = generateId();
    const timestamp = getCurrentTimestamp();

    // Calculate first occurrence
    const tempPattern = {
      frequency,
      interval,
      days_of_week: days_of_week ? JSON.stringify(days_of_week) : null,
      day_of_month,
      start_date,
      end_date,
      occurrences_limit,
      occurrences_count: 0,
      last_generated_date: null
    };
    
    const nextOccurrence = calculateNextOccurrence(tempPattern);

    // Create recurring pattern
    await c.env.DB.prepare(`
      INSERT INTO recurring_patterns (
        id, user_id, workspace_id, task_name, description,
        estimated_time, task_link, priority, assigned_to,
        frequency, interval, days_of_week, day_of_month,
        time_of_day, start_date, end_date, occurrences_limit,
        is_active, next_occurrence_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      patternId,
      auth.userId,
      workspaceMember?.workspace_id || null,
      task_name,
      description,
      estimated_time,
      task_link || null,
      priority,
      assigned_to || null,
      frequency,
      interval,
      days_of_week ? JSON.stringify(days_of_week) : null,
      day_of_month || null,
      time_of_day || null,
      start_date,
      end_date || null,
      occurrences_limit || null,
      1, // is_active
      nextOccurrence,
      timestamp,
      timestamp
    ).run();

    console.log(`📅 Recurring pattern created: ${patternId} for user ${auth.userId}`);

    // Automatically generate the first task instance if start date is today or in the past
    let firstTaskId = null;
    const startDate = new Date(start_date);
    const today = new Date();
    startDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    // For the first instance, use the start date (today) instead of nextOccurrence (tomorrow)
    const firstInstanceDate = startDate <= today ? start_date : nextOccurrence;

    if (startDate <= today && firstInstanceDate) {
      try {
        // Create first task instance
        firstTaskId = generateId();
        
        await c.env.DB.prepare(`
          INSERT INTO tasks (
            id, user_id, workspace_id, task_name, description,
            estimated_time, task_link, priority, assigned_to, assigned_by,
            is_recurring, recurring_pattern_id, recurrence_instance_date,
            status, started_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          firstTaskId,
          auth.userId,
          workspaceMember?.workspace_id || null,
          task_name,
          description,
          estimated_time,
          task_link || null,
          priority,
          assigned_to || null,
          auth.userId, // assigned_by
          1, // is_recurring
          patternId,
          firstInstanceDate,
          assigned_to ? 'pending' : 'in_progress', // Don't auto-start the timer for assigned tasks
          timestamp, // started_at always has a value (NOT NULL constraint)
          timestamp,
          timestamp
        ).run();

        // Update pattern with first generation
        const newNextOccurrence = calculateNextOccurrence({
          frequency,
          interval,
          days_of_week: days_of_week ? JSON.stringify(days_of_week) : null,
          day_of_month,
          start_date,
          end_date,
          occurrences_limit,
          occurrences_count: 1,
          last_generated_date: firstInstanceDate
        });

        await c.env.DB.prepare(`
          UPDATE recurring_patterns
          SET 
            last_generated_date = ?,
            next_occurrence_date = ?,
            occurrences_count = 1,
            updated_at = ?
          WHERE id = ?
        `).bind(
          firstInstanceDate,
          newNextOccurrence,
          timestamp,
          patternId
        ).run();

        console.log(`✅ First task instance created: ${firstTaskId}`);
      } catch (error) {
        console.error('Error creating first task instance:', error);
        // Don't fail the whole request if task creation fails
      }
    }

    return c.json({
      success: true,
      patternId,
      firstTaskId,
      nextOccurrence,
      message: firstTaskId 
        ? 'Recurring pattern created and first task generated successfully'
        : 'Recurring pattern created successfully'
    }, 201);

  } catch (error) {
    console.error('Error creating recurring pattern:', error);
    return c.json({ error: 'Failed to create recurring pattern' }, 500);
  }
});

// GET /api/recurring-tasks - List all recurring patterns
recurringTasks.get('/', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    const { results } = await c.env.DB.prepare(`
      SELECT 
        rp.*,
        u.name as assigned_to_name,
        u.email as assigned_to_email
      FROM recurring_patterns rp
      LEFT JOIN users u ON rp.assigned_to = u.id
      WHERE rp.user_id = ? AND rp.is_active = 1
      ORDER BY rp.next_occurrence_date ASC, rp.created_at DESC
    `).bind(auth.userId).all();

    return c.json({ patterns: results });
  } catch (error) {
    console.error('Error fetching recurring patterns:', error);
    return c.json({ error: 'Failed to fetch recurring patterns' }, 500);
  }
});

// GET /api/recurring-tasks/:id - Get specific pattern
recurringTasks.get('/:id', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    const patternId = c.req.param('id');

    const pattern = await c.env.DB.prepare(`
      SELECT 
        rp.*,
        u.name as assigned_to_name,
        u.email as assigned_to_email
      FROM recurring_patterns rp
      LEFT JOIN users u ON rp.assigned_to = u.id
      WHERE rp.id = ? AND rp.user_id = ?
    `).bind(patternId, auth.userId).first();

    if (!pattern) {
      return c.json({ error: 'Recurring pattern not found' }, 404);
    }

    return c.json({ pattern });
  } catch (error) {
    console.error('Error fetching recurring pattern:', error);
    return c.json({ error: 'Failed to fetch recurring pattern' }, 500);
  }
});

// PATCH /api/recurring-tasks/:id - Update pattern
recurringTasks.patch('/:id', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    const patternId = c.req.param('id');
    const body = await c.req.json();

    // Check ownership
    const existing = await c.env.DB.prepare(`
      SELECT id FROM recurring_patterns
      WHERE id = ? AND user_id = ?
    `).bind(patternId, auth.userId).first();

    if (!existing) {
      return c.json({ error: 'Recurring pattern not found' }, 404);
    }

    const updates: string[] = [];
    const values: any[] = [];

    // Buildable fields
    const updateableFields = [
      'task_name', 'description', 'estimated_time', 'task_link',
      'priority', 'assigned_to', 'frequency', 'interval',
      'days_of_week', 'day_of_month', 'time_of_day',
      'start_date', 'end_date', 'occurrences_limit', 'is_active'
    ];

    for (const field of updateableFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        if (field === 'days_of_week' && Array.isArray(body[field])) {
          values.push(JSON.stringify(body[field]));
        } else {
          values.push(body[field]);
        }
      }
    }

    if (updates.length > 0) {
      updates.push('updated_at = ?');
      values.push(getCurrentTimestamp());
      values.push(patternId);

      await c.env.DB.prepare(`
        UPDATE recurring_patterns
        SET ${updates.join(', ')}
        WHERE id = ?
      `).bind(...values).run();
    }

    return c.json({
      success: true,
      message: 'Recurring pattern updated successfully'
    });

  } catch (error) {
    console.error('Error updating recurring pattern:', error);
    return c.json({ error: 'Failed to update recurring pattern' }, 500);
  }
});

// DELETE /api/recurring-tasks/:id - Delete/deactivate pattern
recurringTasks.delete('/:id', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    const patternId = c.req.param('id');

    // Check ownership
    const existing = await c.env.DB.prepare(`
      SELECT id FROM recurring_patterns
      WHERE id = ? AND user_id = ?
    `).bind(patternId, auth.userId).first();

    if (!existing) {
      return c.json({ error: 'Recurring pattern not found' }, 404);
    }

    // Soft delete - mark as inactive
    await c.env.DB.prepare(`
      UPDATE recurring_patterns
      SET is_active = 0, updated_at = ?
      WHERE id = ?
    `).bind(getCurrentTimestamp(), patternId).run();

    return c.json({
      success: true,
      message: 'Recurring pattern deactivated successfully'
    });

  } catch (error) {
    console.error('Error deleting recurring pattern:', error);
    return c.json({ error: 'Failed to delete recurring pattern' }, 500);
  }
});

// POST /api/recurring-tasks/:id/generate - Manually generate next task instance
recurringTasks.post('/:id/generate', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    const patternId = c.req.param('id');

    const pattern = await c.env.DB.prepare(`
      SELECT * FROM recurring_patterns
      WHERE id = ? AND user_id = ? AND is_active = 1
    `).bind(patternId, auth.userId).first();

    if (!pattern) {
      return c.json({ error: 'Recurring pattern not found or inactive' }, 404);
    }

    // Calculate next occurrence
    console.log('🔍 Pattern data for calculation:', {
      frequency: pattern.frequency,
      interval: pattern.interval,
      last_generated_date: pattern.last_generated_date,
      end_date: pattern.end_date,
      occurrences_limit: pattern.occurrences_limit,
      occurrences_count: pattern.occurrences_count
    });
    
    const nextOccurrence = calculateNextOccurrence(pattern);
    console.log('📅 Calculated next occurrence:', nextOccurrence);
    
    if (!nextOccurrence) {
      return c.json({ error: 'No more occurrences for this pattern' }, 400);
    }

    // Create task instance
    const taskId = generateId();
    const timestamp = getCurrentTimestamp();
    
    console.log('🆔 Creating task instance:', {
      taskId,
      patternId,
      nextOccurrence,
      userId: auth.userId,
      workspaceId: pattern.workspace_id
    });
    
    try {
      await c.env.DB.prepare(`
        INSERT INTO tasks (
          id, user_id, workspace_id, task_name, description,
          estimated_time, task_link, priority, assigned_to, assigned_by,
          is_recurring, recurring_pattern_id, recurrence_instance_date,
          status, started_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        taskId,
        auth.userId,
        pattern.workspace_id,
        pattern.task_name,
        pattern.description,
        pattern.estimated_time,
        pattern.task_link,
        pattern.priority,
        pattern.assigned_to,
        auth.userId, // assigned_by
        1, // is_recurring
        patternId,
        nextOccurrence,
        pattern.assigned_to ? 'pending' : 'in_progress', // Don't auto-start the timer for assigned tasks
        timestamp, // started_at always has a value (NOT NULL constraint)
        timestamp,
        timestamp
      ).run();
      
      console.log('✅ Task instance created successfully:', taskId);
    } catch (error) {
      console.error('❌ Error creating task instance:', error);
      throw error;
    }

    // Update pattern - increment count and update next occurrence
    const newNextOccurrence = calculateNextOccurrence({
      ...pattern,
      last_generated_date: nextOccurrence,
      occurrences_count: pattern.occurrences_count + 1
    });

    await c.env.DB.prepare(`
      UPDATE recurring_patterns
      SET 
        last_generated_date = ?,
        next_occurrence_date = ?,
        occurrences_count = occurrences_count + 1,
        updated_at = ?
      WHERE id = ?
    `).bind(
      nextOccurrence,
      newNextOccurrence,
      timestamp,
      patternId
    ).run();

    return c.json({
      success: true,
      taskId,
      instanceDate: nextOccurrence,
      nextOccurrence: newNextOccurrence,
      message: 'Task instance created successfully'
    }, 201);

  } catch (error) {
    console.error('Error generating task instance:', error);
    return c.json({ error: 'Failed to generate task instance' }, 500);
  }
});

// GET /api/recurring-tasks/:id/instances - Get all task instances for a pattern
recurringTasks.get('/:id/instances', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    const patternId = c.req.param('id');

    const { results } = await c.env.DB.prepare(`
      SELECT 
        t.*,
        u1.name as creator_name,
        u1.email as creator_email,
        u2.name as assignee_name,
        u2.email as assignee_email
      FROM tasks t
      LEFT JOIN users u1 ON t.user_id = u1.id
      LEFT JOIN users u2 ON t.assigned_to = u2.id
      WHERE t.recurring_pattern_id = ? AND t.user_id = ?
      ORDER BY t.recurrence_instance_date DESC
    `).bind(patternId, auth.userId).all();

    return c.json({ instances: results });
  } catch (error) {
    console.error('Error fetching task instances:', error);
    return c.json({ error: 'Failed to fetch task instances' }, 500);
  }
});

// GET /api/recurring-tasks/:id/next-occurrence - Get next occurrence date
recurringTasks.get('/:id/next-occurrence', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    const patternId = c.req.param('id');

    const pattern = await c.env.DB.prepare(`
      SELECT * FROM recurring_patterns
      WHERE id = ? AND user_id = ? AND is_active = 1
    `).bind(patternId, auth.userId).first();

    if (!pattern) {
      return c.json({ error: 'Recurring pattern not found' }, 404);
    }

    const nextOccurrence = calculateNextOccurrence({
      frequency: pattern.frequency,
      interval: pattern.interval,
      days_of_week: pattern.days_of_week,
      day_of_month: pattern.day_of_month,
      start_date: pattern.start_date,
      end_date: pattern.end_date,
      occurrences_limit: pattern.occurrences_limit,
      occurrences_count: pattern.occurrences_count || 0,
      last_generated_date: pattern.last_generated_date
    });

    return c.json({ 
      nextOccurrence,
      pattern: {
        task_name: pattern.task_name,
        frequency: pattern.frequency,
        interval: pattern.interval,
        next_occurrence_date: pattern.next_occurrence_date
      }
    });
  } catch (error) {
    console.error('Error getting next occurrence:', error);
    return c.json({ error: 'Failed to get next occurrence' }, 500);
  }
});

export default recurringTasks;

