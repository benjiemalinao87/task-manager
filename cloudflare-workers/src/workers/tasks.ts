import { Hono } from 'hono';
import type { Env, CreateTaskRequest, CompleteTaskRequest } from '../types';
import { requireAuth } from '../middleware/auth';
import { generateId, getCurrentTimestamp } from '../utils/crypto';

const tasks = new Hono<{ Bindings: Env }>();

// ============================================
// GET /api/tasks - List tasks (with workspace support)
// ============================================
tasks.get('/', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    const url = new URL(c.req.url);
    const status = url.searchParams.get('status') || 'in_progress';
    const workspaceId = url.searchParams.get('workspaceId');
    const assignedTo = url.searchParams.get('assignedTo'); // 'me', 'unassigned', or user_id
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');

    let query = `
      SELECT
        t.*,
        creator.name as creator_name,
        creator.email as creator_email,
        assignee.name as assignee_name,
        assignee.email as assignee_email,
        assigner.name as assigned_by_name
      FROM tasks t
      LEFT JOIN users creator ON t.user_id = creator.id
      LEFT JOIN users assignee ON t.assigned_to = assignee.id
      LEFT JOIN users assigner ON t.assigned_by = assigner.id
      WHERE 1=1
    `;

    const bindings: any[] = [];

    // Workspace filter
    if (workspaceId) {
      // Verify user has access to this workspace
      const membership = await c.env.DB.prepare(`
        SELECT role FROM workspace_members
        WHERE workspace_id = ? AND user_id = ?
      `).bind(workspaceId, auth.userId).first<{ role: string }>();

      if (!membership) {
        return c.json({ error: 'Workspace not found or access denied' }, 404);
      }

      query += ` AND t.workspace_id = ?`;
      bindings.push(workspaceId);
    } else {
      // Default: show tasks from user's workspaces only
      query += ` AND t.workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = ?
      )`;
      bindings.push(auth.userId);
    }

    // Status filter
    query += ` AND t.status = ?`;
    bindings.push(status);

    // Assignment filter
    if (assignedTo === 'me') {
      query += ` AND t.assigned_to = ?`;
      bindings.push(auth.userId);
    } else if (assignedTo === 'unassigned') {
      query += ` AND t.assigned_to IS NULL`;
    } else if (assignedTo) {
      query += ` AND t.assigned_to = ?`;
      bindings.push(assignedTo);
    }

    // Date range filter
    if (dateFrom) {
      query += ` AND date(t.created_at) >= date(?)`;
      bindings.push(dateFrom);
    }
    if (dateTo) {
      query += ` AND date(t.created_at) <= date(?)`;
      bindings.push(dateTo);
    }

    query += ` ORDER BY t.created_at DESC`;

    const stmt = c.env.DB.prepare(query);
    const result = await stmt.bind(...bindings).all();

    return c.json(result.results || []);

  } catch (error) {
    console.error('Get tasks error:', error);
    return c.json({ error: 'Failed to fetch tasks' }, 500);
  }
});

// ============================================
// GET /api/tasks/:id - Get task details
// ============================================
tasks.get('/:id', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  const taskId = c.req.param('id');

  try {
    const task = await c.env.DB.prepare(`
      SELECT
        t.*,
        creator.name as creator_name,
        creator.email as creator_email,
        assignee.name as assignee_name,
        assignee.email as assignee_email,
        assigner.name as assigned_by_name,
        w.name as workspace_name
      FROM tasks t
      LEFT JOIN users creator ON t.user_id = creator.id
      LEFT JOIN users assignee ON t.assigned_to = assignee.id
      LEFT JOIN users assigner ON t.assigned_by = assigner.id
      LEFT JOIN workspaces w ON t.workspace_id = w.id
      WHERE t.id = ?
    `).bind(taskId).first();

    if (!task) {
      return c.json({ error: 'Task not found' }, 404);
    }

    // Check if user has access (member of workspace or task creator)
    const hasAccess = await c.env.DB.prepare(`
      SELECT 1 FROM workspace_members
      WHERE workspace_id = ? AND user_id = ?
    `).bind((task as any).workspace_id, auth.userId).first();

    if (!hasAccess && (task as any).user_id !== auth.userId) {
      return c.json({ error: 'Access denied' }, 403);
    }

    return c.json(task);

  } catch (error) {
    console.error('Get task error:', error);
    return c.json({ error: 'Failed to fetch task' }, 500);
  }
});

// Helper function to create Asana task
async function createAsanaTask(
  env: Env,
  userId: string,
  taskName: string,
  description: string,
  specificProjectId?: string
): Promise<string | null> {
  try {
    const integration = await env.DB.prepare(
      'SELECT api_key, config FROM integrations WHERE user_id = ? AND integration_type = ? AND is_active = 1'
    ).bind(userId, 'asana').first<{ api_key: string; config: string }>();

    if (!integration || !integration.api_key) {
      return null;
    }

    const config = typeof integration.config === 'string'
      ? JSON.parse(integration.config)
      : integration.config;

    const projectGid = specificProjectId || config?.project_gid;

    if (!projectGid) {
      return null;
    }

    const today = new Date().toISOString().split('T')[0];

    const asanaPayload: any = {
      data: {
        name: taskName,
        notes: description,
        projects: [projectGid],
        due_on: today,
      }
    };

    const meResponse = await fetch('https://app.asana.com/api/1.0/users/me', {
      headers: {
        'Authorization': `Bearer ${integration.api_key}`,
        'Content-Type': 'application/json',
      },
    });

    if (meResponse.ok) {
      const userData = await meResponse.json() as { data: { gid: string } };
      if (userData.data?.gid) {
        asanaPayload.data.assignee = userData.data.gid;
      }
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
      return null;
    }

    const data = await response.json() as { data: { gid: string } };
    return data.data.gid;

  } catch (error) {
    console.error('Error creating Asana task:', error);
    return null;
  }
}

// ============================================
// POST /api/tasks - Create task (with workspace & assignment)
// ============================================
tasks.post('/', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    const body = await c.req.json<CreateTaskRequest & {
      workspaceId?: string;
      assignedTo?: string;
    }>();

    const { taskName, description, estimatedTime, taskLink, priority, asanaProjectId, workspaceId, assignedTo } = body;

    if (!taskName || !description || !estimatedTime) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Determine workspace
    let finalWorkspaceId = workspaceId;

    if (!finalWorkspaceId) {
      // Get user's default workspace
      const defaultWorkspace = await c.env.DB.prepare(`
        SELECT workspace_id FROM workspace_members
        WHERE user_id = ?
        ORDER BY created_at ASC
        LIMIT 1
      `).bind(auth.userId).first<{ workspace_id: string }>();

      if (!defaultWorkspace) {
        return c.json({ error: 'No workspace found. Please create or join a workspace first.' }, 400);
      }

      finalWorkspaceId = defaultWorkspace.workspace_id;
    } else {
      // Verify user is member of specified workspace
      const membership = await c.env.DB.prepare(`
        SELECT role FROM workspace_members
        WHERE workspace_id = ? AND user_id = ?
      `).bind(finalWorkspaceId, auth.userId).first<{ role: string }>();

      if (!membership) {
        return c.json({ error: 'Workspace not found or access denied' }, 404);
      }
    }

    // If assigning to someone, verify they're in the workspace
    if (assignedTo) {
      const assigneeMembership = await c.env.DB.prepare(`
        SELECT user_id FROM workspace_members
        WHERE workspace_id = ? AND user_id = ?
      `).bind(finalWorkspaceId, assignedTo).first();

      if (!assigneeMembership) {
        return c.json({ error: 'Assigned user is not a member of this workspace' }, 400);
      }
    }

    const taskId = generateId();
    const now = getCurrentTimestamp();
    const taskPriority = priority || 'medium';

    // Try to create Asana task first
    const asanaTaskId = await createAsanaTask(c.env, auth.userId, taskName, description, asanaProjectId);

    await c.env.DB.prepare(`
      INSERT INTO tasks (
        id, user_id, task_name, description, estimated_time,
        task_link, priority, asana_task_id, workspace_id,
        assigned_to, assigned_by, assigned_at,
        started_at, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      taskId, auth.userId, taskName, description, estimatedTime,
      taskLink || null, taskPriority, asanaTaskId || null, finalWorkspaceId,
      assignedTo || null, assignedTo ? auth.userId : null, assignedTo ? now : null,
      now, now, now
    ).run();

    const task = await c.env.DB.prepare(`
      SELECT
        t.*,
        creator.name as creator_name,
        assignee.name as assignee_name,
        assignee.email as assignee_email
      FROM tasks t
      LEFT JOIN users creator ON t.user_id = creator.id
      LEFT JOIN users assignee ON t.assigned_to = assignee.id
      WHERE t.id = ?
    `).bind(taskId).first();

    // Queue AI summary generation
    try {
      await c.env.AI_QUEUE.send({
        type: 'generate_summary',
        userId: auth.userId,
        taskId,
        taskName,
        description,
        estimatedTime,
        sendEmail: true,
        assignedTo: assignedTo || null
      });
    } catch (err) {
      console.error('Failed to queue AI summary generation:', err);
    }

    // If task is assigned, queue assignment notification email
    if (assignedTo && assignedTo !== auth.userId) {
      try {
        await c.env.EMAIL_QUEUE.send({
          type: 'task_assigned',
          taskId: taskId,
          assignedTo: assignedTo,
          assignedBy: auth.userId
        });
      } catch (err) {
        console.error('Failed to queue task assignment email:', err);
      }
    }

    return c.json(task, 201);

  } catch (error) {
    console.error('Create task error:', error);
    return c.json({ error: 'Failed to create task' }, 500);
  }
});

// ============================================
// PUT /api/tasks/:id/assign - Assign/reassign task
// ============================================
tasks.put('/:id/assign', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  const taskId = c.req.param('id');

  try {
    const body = await c.req.json<{ assignedTo: string | null }>();

    // Get task
    const task = await c.env.DB.prepare(`
      SELECT workspace_id, assigned_to FROM tasks WHERE id = ?
    `).bind(taskId).first<{ workspace_id: string; assigned_to: string | null }>();

    if (!task) {
      return c.json({ error: 'Task not found' }, 404);
    }

    // Verify user can assign (owner, admin, or task creator)
    const membership = await c.env.DB.prepare(`
      SELECT role FROM workspace_members
      WHERE workspace_id = ? AND user_id = ?
    `).bind(task.workspace_id, auth.userId).first<{ role: string }>();

    if (!membership || membership.role === 'member') {
      return c.json({ error: 'Permission denied. Only owners and admins can assign tasks' }, 403);
    }

    // If assigning to someone, verify they're in workspace
    if (body.assignedTo) {
      const assigneeMembership = await c.env.DB.prepare(`
        SELECT user_id FROM workspace_members
        WHERE workspace_id = ? AND user_id = ?
      `).bind(task.workspace_id, body.assignedTo).first();

      if (!assigneeMembership) {
        return c.json({ error: 'Assigned user is not a member of this workspace' }, 400);
      }
    }

    const now = getCurrentTimestamp();

    // Update task assignment
    await c.env.DB.prepare(`
      UPDATE tasks
      SET assigned_to = ?,
          assigned_by = ?,
          assigned_at = ?,
          updated_at = ?
      WHERE id = ?
    `).bind(
      body.assignedTo || null,
      body.assignedTo ? auth.userId : null,
      body.assignedTo ? now : null,
      now,
      taskId
    ).run();

    // Queue notification email if assigned to someone else
    if (body.assignedTo && body.assignedTo !== auth.userId && body.assignedTo !== task.assigned_to) {
      try {
        await c.env.EMAIL_QUEUE.send({
          type: 'task_assigned',
          taskId: taskId,
          assignedTo: body.assignedTo,
          assignedBy: auth.userId
        });
      } catch (err) {
        console.error('Failed to queue task assignment email:', err);
      }
    }

    return c.json({ success: true, message: 'Task assignment updated' });

  } catch (error) {
    console.error('Assign task error:', error);
    return c.json({ error: 'Failed to assign task' }, 500);
  }
});

// ============================================
// POST /api/tasks/:id/complete - Complete task
// ============================================
tasks.post('/:id/complete', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  const taskId = c.req.param('id');

  try {
    const body = await c.req.json<CompleteTaskRequest>();
    const now = getCurrentTimestamp();

    await c.env.DB.prepare(`
      UPDATE tasks
      SET
        status = 'completed',
        actual_time = ?,
        notes = ?,
        completed_at = ?,
        updated_at = ?
      WHERE id = ? AND user_id = ?
    `).bind(
      body.actualTime || null,
      body.notes || null,
      now,
      now,
      taskId,
      auth.userId
    ).run();

    return c.json({ success: true, message: 'Task completed successfully' });
  } catch (error) {
    console.error('Complete task error:', error);
    return c.json({ error: 'Failed to complete task' }, 500);
  }
});

// ============================================
// DELETE /api/tasks/:id - Delete task
// ============================================
tasks.delete('/:id', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  const taskId = c.req.param('id');

  try {
    // Get task to verify ownership or workspace access
    const task = await c.env.DB.prepare(`
      SELECT t.*, wm.role
      FROM tasks t
      LEFT JOIN workspace_members wm ON t.workspace_id = wm.workspace_id AND wm.user_id = ?
      WHERE t.id = ?
    `).bind(auth.userId, taskId).first<{ user_id: string; workspace_id: string | null; role: string | null }>();

    if (!task) {
      return c.json({ error: 'Task not found' }, 404);
    }

    // Check if user can delete: task owner, or workspace owner/admin
    const canDelete = task.user_id === auth.userId || 
                      (task.workspace_id && (task.role === 'owner' || task.role === 'admin'));

    if (!canDelete) {
      return c.json({ error: 'Permission denied. Only task owner or workspace admins can delete tasks.' }, 403);
    }

    // Delete the task
    await c.env.DB.prepare(`
      DELETE FROM tasks WHERE id = ?
    `).bind(taskId).run();

    return c.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    return c.json({ error: 'Failed to delete task' }, 500);
  }
});

export default tasks;
