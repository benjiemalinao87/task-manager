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

// Helper function to create Asana task
async function createAsanaTask(
  env: Env,
  userId: string,
  taskName: string,
  description: string
): Promise<string | null> {
  try {
    // Get active Asana integration
    const integration = await env.DB.prepare(
      'SELECT api_key, config FROM integrations WHERE user_id = ? AND integration_type = ? AND is_active = 1'
    ).bind(userId, 'asana').first<{ api_key: string; config: string }>();

    if (!integration || !integration.api_key) {
      console.log('No active Asana integration found');
      return null;
    }

    const config = typeof integration.config === 'string'
      ? JSON.parse(integration.config)
      : integration.config;

    const projectGid = config?.project_gid;
    const assigneeEmail = config?.default_assignee_email;
    const workspaceGid = config?.workspace_gid;

    console.log('Asana config:', JSON.stringify({
      projectGid,
      assigneeEmail,
      workspaceGid,
      hasApiKey: !!integration.api_key
    }));

    if (!projectGid) {
      console.log('No Asana project configured');
      return null;
    }

    // Create task in Asana with today as due date
    const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD

    const asanaPayload: any = {
      data: {
        name: taskName,
        notes: description,
        projects: [projectGid],
        due_on: today,
      }
    };

    // Add assignee if configured
    if (assigneeEmail && workspaceGid) {
      try {
        console.log(`Looking up assignee ${assigneeEmail} in workspace ${workspaceGid}`);

        // Get all users in workspace and find by email
        const usersResponse = await fetch(
          `https://app.asana.com/api/1.0/workspaces/${workspaceGid}/users`,
          {
            headers: {
              'Authorization': `Bearer ${integration.api_key}`,
              'Content-Type': 'application/json',
            },
          }
        );

        console.log('Users API response status:', usersResponse.status);

        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          console.log(`Found ${usersData.data?.length || 0} users in workspace`);

          const user = usersData.data?.find((u: any) =>
            u.email?.toLowerCase() === assigneeEmail.toLowerCase()
          );

          if (user && user.gid) {
            asanaPayload.data.assignee = user.gid;
            console.log(`✓ Assigned task to user: ${user.name} (${user.gid})`);
          } else {
            console.log(`✗ User with email ${assigneeEmail} not found. Available users:`,
              usersData.data?.map((u: any) => u.email).join(', '));
          }
        } else {
          const errorText = await usersResponse.text();
          console.error('Failed to fetch workspace users:', errorText);
        }
      } catch (err) {
        console.error('Error looking up assignee:', err);
      }
    } else {
      console.log('Skipping assignee:', { hasEmail: !!assigneeEmail, hasWorkspace: !!workspaceGid });
    }

    const response = await fetch('https://app.asana.com/api/1.0/tasks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${integration.api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(asanaPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Asana task creation failed:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    return data.data.gid;

  } catch (error) {
    console.error('Error creating Asana task:', error);
    return null;
  }
}

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

    // Try to create Asana task first
    const asanaTaskId = await createAsanaTask(c.env, auth.userId, taskName, description);

    await c.env.DB.prepare(`
      INSERT INTO tasks (
        id, user_id, task_name, description, estimated_time,
        task_link, asana_task_id, started_at, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      taskId, auth.userId, taskName, description, estimatedTime,
      taskLink || null, asanaTaskId || null, now, now, now
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

// Helper function to complete Asana task
async function completeAsanaTask(
  env: Env,
  userId: string,
  asanaTaskId: string
): Promise<boolean> {
  try {
    const integration = await env.DB.prepare(
      'SELECT api_key FROM integrations WHERE user_id = ? AND integration_type = ? AND is_active = 1'
    ).bind(userId, 'asana').first<{ api_key: string }>();

    if (!integration || !integration.api_key) {
      return false;
    }

    const response = await fetch(`https://app.asana.com/api/1.0/tasks/${asanaTaskId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${integration.api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          completed: true
        }
      }),
    });

    if (!response.ok) {
      console.error('Failed to complete Asana task:', await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error completing Asana task:', error);
    return false;
  }
}

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

        // Complete task in Asana if it exists
        if (task.asana_task_id) {
          await completeAsanaTask(c.env, auth.userId, task.asana_task_id as string);
        }

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
