import { Hono } from 'hono';
import type { Env, CreateTaskRequest, CompleteTaskRequest } from '../types';
import { requireAuth } from '../middleware/auth';
import { generateId, getCurrentTimestamp } from '../utils/crypto';

const tasks = new Hono<{ Bindings: Env }>();

// GET /api/tasks - List user's tasks
tasks.get('/', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    const url = new URL(c.req.url);
    const status = url.searchParams.get('status') || 'in_progress';

    const result = await c.env.DB.prepare(`
      SELECT * FROM tasks
      WHERE user_id = ? AND status = ?
      ORDER BY created_at DESC
    `).bind(auth.userId, status).all();

    return c.json(result.results || []);

  } catch (error) {
    console.error('Get tasks error:', error);
    return c.json({ error: 'Failed to fetch tasks' }, 500);
  }
});

// POST /api/tasks - Create task
tasks.post('/', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    const { taskName, description, estimatedTime, taskLink } = await c.req.json<CreateTaskRequest>();

    if (!taskName || !description || !estimatedTime) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const taskId = generateId();
    const now = getCurrentTimestamp();

    await c.env.DB.prepare(`
      INSERT INTO tasks (
        id, user_id, task_name, description, estimated_time,
        task_link, started_at, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      taskId, auth.userId, taskName, description, estimatedTime,
      taskLink || null, now, now, now
    ).run();

    const task = await c.env.DB.prepare('SELECT * FROM tasks WHERE id = ?')
      .bind(taskId).first();

    // Queue AI summary generation with email notification (fire and forget)
    // Email will be sent AFTER AI summary is generated
    c.executionCtx.waitUntil(
      fetch(`${new URL(c.req.url).origin}/api/ai/generate-summary`, {
        method: 'POST',
        headers: {
          'Authorization': c.req.header('Authorization') || '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ taskId, taskName, description, estimatedTime, sendEmail: true })
      }).catch(err => console.error('AI summary failed:', err))
    );

    return c.json(task, 201);

  } catch (error) {
    console.error('Create task error:', error);
    return c.json({ error: 'Failed to create task' }, 500);
  }
});

// PATCH /api/tasks/:id - Update/Complete task
tasks.patch('/:id', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    const taskId = c.req.param('id');
    const { status, notes, actualTime } = await c.req.json();

    // Verify task belongs to user
    const task = await c.env.DB.prepare(
      'SELECT * FROM tasks WHERE id = ? AND user_id = ?'
    ).bind(taskId, auth.userId).first();

    if (!task) {
      return c.json({ error: 'Task not found' }, 404);
    }

    const now = getCurrentTimestamp();
    const updates: string[] = ['updated_at = ?'];
    const bindings: any[] = [now];

    if (status) {
      updates.push('status = ?');
      bindings.push(status);

      if (status === 'completed') {
        updates.push('completed_at = ?');
        bindings.push(now);

        // Calculate actual time if not provided
        if (!actualTime && task.started_at) {
          const startTime = new Date(task.started_at as string);
          const endTime = new Date(now);
          const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
          const hours = Math.floor(durationMinutes / 60);
          const minutes = durationMinutes % 60;
          const calculatedTime = `${hours}h ${minutes}m`;

          updates.push('actual_time = ?');
          bindings.push(calculatedTime);
        }
      }
    }

    if (actualTime) {
      updates.push('actual_time = ?');
      bindings.push(actualTime);
    }

    if (notes) {
      updates.push('notes = ?');
      bindings.push(notes);
    }

    bindings.push(taskId, auth.userId);

    await c.env.DB.prepare(`
      UPDATE tasks
      SET ${updates.join(', ')}
      WHERE id = ? AND user_id = ?
    `).bind(...bindings).run();

    const updatedTask = await c.env.DB.prepare(
      'SELECT * FROM tasks WHERE id = ? AND user_id = ?'
    ).bind(taskId, auth.userId).first();

    // Queue completion email if task is completed
    if (status === 'completed') {
      const settings = await c.env.DB.prepare(
        'SELECT default_email FROM settings WHERE user_id = ?'
      ).bind(auth.userId).first();

      if (settings && settings.default_email) {
        await c.env.EMAIL_QUEUE.send({
          type: 'task_completed',
          userId: auth.userId,
          email: settings.default_email as string,
          taskId,
          task: {
            name: updatedTask.task_name as string,
            description: updatedTask.description as string,
            estimatedTime: updatedTask.estimated_time as string,
            actualTime: updatedTask.actual_time as string || 'N/A',
            aiSummary: updatedTask.ai_summary as string || undefined,
            notes: updatedTask.notes as string || undefined
          }
        });
      }
    }

    return c.json(updatedTask);

  } catch (error) {
    console.error('Update task error:', error);
    return c.json({ error: 'Failed to update task' }, 500);
  }
});

// DELETE /api/tasks/:id - Delete task
tasks.delete('/:id', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    const taskId = c.req.param('id');

    // Verify task belongs to user
    const task = await c.env.DB.prepare(
      'SELECT id FROM tasks WHERE id = ? AND user_id = ?'
    ).bind(taskId, auth.userId).first();

    if (!task) {
      return c.json({ error: 'Task not found' }, 404);
    }

    await c.env.DB.prepare(
      'DELETE FROM tasks WHERE id = ? AND user_id = ?'
    ).bind(taskId, auth.userId).run();

    return c.json({ message: 'Task deleted successfully' });

  } catch (error) {
    console.error('Delete task error:', error);
    return c.json({ error: 'Failed to delete task' }, 500);
  }
});

export default tasks;
