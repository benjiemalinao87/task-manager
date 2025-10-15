import { Hono } from 'hono';
import type { Env } from '../types';
import { requireAuth } from '../middleware/auth';
import { generateId, getCurrentTimestamp } from '../utils/crypto';

const workspaces = new Hono<{ Bindings: Env }>();

// ============================================
// GET /api/workspaces - Get user's workspaces
// ============================================
workspaces.get('/', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    // Get all workspaces where user is a member
    const result = await c.env.DB.prepare(`
      SELECT
        w.id,
        w.name,
        w.owner_id,
        w.created_at,
        w.updated_at,
        wm.role,
        u.name as owner_name,
        u.email as owner_email,
        (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id) as member_count,
        (SELECT COUNT(*) FROM tasks WHERE workspace_id = w.id) as task_count
      FROM workspaces w
      INNER JOIN workspace_members wm ON w.id = wm.workspace_id
      LEFT JOIN users u ON w.owner_id = u.id
      WHERE wm.user_id = ?
      ORDER BY w.created_at DESC
    `).bind(auth.userId).all();

    return c.json({
      workspaces: result.results || []
    });

  } catch (error) {
    console.error('Get workspaces error:', error);
    return c.json({ error: 'Failed to fetch workspaces' }, 500);
  }
});

// ============================================
// GET /api/workspaces/:id - Get workspace details
// ============================================
workspaces.get('/:id', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  const workspaceId = c.req.param('id');

  try {
    // Check if user is a member of this workspace
    const membership = await c.env.DB.prepare(`
      SELECT role FROM workspace_members
      WHERE workspace_id = ? AND user_id = ?
    `).bind(workspaceId, auth.userId).first<{ role: string }>();

    if (!membership) {
      return c.json({ error: 'Workspace not found or access denied' }, 404);
    }

    // Get workspace details
    const workspace = await c.env.DB.prepare(`
      SELECT
        w.id,
        w.name,
        w.owner_id,
        w.created_at,
        w.updated_at,
        u.name as owner_name,
        u.email as owner_email
      FROM workspaces w
      LEFT JOIN users u ON w.owner_id = u.id
      WHERE w.id = ?
    `).bind(workspaceId).first();

    if (!workspace) {
      return c.json({ error: 'Workspace not found' }, 404);
    }

    return c.json({
      workspace: {
        ...workspace,
        user_role: membership.role
      }
    });

  } catch (error) {
    console.error('Get workspace error:', error);
    return c.json({ error: 'Failed to fetch workspace' }, 500);
  }
});

// ============================================
// POST /api/workspaces - Create new workspace
// ============================================
workspaces.post('/', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    const body = await c.req.json<{ name: string }>();

    if (!body.name || body.name.trim() === '') {
      return c.json({ error: 'Workspace name is required' }, 400);
    }

    const workspaceId = generateId();
    const memberId = generateId();
    const timestamp = getCurrentTimestamp();

    // Create workspace
    await c.env.DB.prepare(`
      INSERT INTO workspaces (id, name, owner_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(workspaceId, body.name.trim(), auth.userId, timestamp, timestamp).run();

    // Add creator as owner
    await c.env.DB.prepare(`
      INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at, created_at)
      VALUES (?, ?, ?, 'owner', ?, ?)
    `).bind(memberId, workspaceId, auth.userId, timestamp, timestamp).run();

    return c.json({
      workspace: {
        id: workspaceId,
        name: body.name.trim(),
        owner_id: auth.userId,
        created_at: timestamp,
        updated_at: timestamp,
        user_role: 'owner'
      }
    }, 201);

  } catch (error) {
    console.error('Create workspace error:', error);
    return c.json({ error: 'Failed to create workspace' }, 500);
  }
});

// ============================================
// PUT /api/workspaces/:id - Update workspace
// ============================================
workspaces.put('/:id', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  const workspaceId = c.req.param('id');

  try {
    // Check if user is owner or admin
    const membership = await c.env.DB.prepare(`
      SELECT role FROM workspace_members
      WHERE workspace_id = ? AND user_id = ?
    `).bind(workspaceId, auth.userId).first<{ role: string }>();

    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return c.json({ error: 'Permission denied. Only owners and admins can update workspace' }, 403);
    }

    const body = await c.req.json<{ name: string }>();

    if (!body.name || body.name.trim() === '') {
      return c.json({ error: 'Workspace name is required' }, 400);
    }

    const timestamp = getCurrentTimestamp();

    await c.env.DB.prepare(`
      UPDATE workspaces
      SET name = ?, updated_at = ?
      WHERE id = ?
    `).bind(body.name.trim(), timestamp, workspaceId).run();

    return c.json({
      workspace: {
        id: workspaceId,
        name: body.name.trim(),
        updated_at: timestamp
      }
    });

  } catch (error) {
    console.error('Update workspace error:', error);
    return c.json({ error: 'Failed to update workspace' }, 500);
  }
});

// ============================================
// DELETE /api/workspaces/:id - Delete workspace
// ============================================
workspaces.delete('/:id', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  const workspaceId = c.req.param('id');

  try {
    // Check if user is owner
    const membership = await c.env.DB.prepare(`
      SELECT role FROM workspace_members
      WHERE workspace_id = ? AND user_id = ?
    `).bind(workspaceId, auth.userId).first<{ role: string }>();

    if (!membership || membership.role !== 'owner') {
      return c.json({ error: 'Permission denied. Only workspace owner can delete workspace' }, 403);
    }

    // Check if this is the user's last workspace
    const workspaceCount = await c.env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM workspace_members
      WHERE user_id = ?
    `).bind(auth.userId).first<{ count: number }>();

    if (workspaceCount && workspaceCount.count <= 1) {
      return c.json({ error: 'Cannot delete your last workspace' }, 400);
    }

    // Delete workspace (CASCADE will delete members, invitations, tasks, time_sessions)
    await c.env.DB.prepare(`
      DELETE FROM workspaces WHERE id = ?
    `).bind(workspaceId).run();

    return c.json({ success: true, message: 'Workspace deleted successfully' });

  } catch (error) {
    console.error('Delete workspace error:', error);
    return c.json({ error: 'Failed to delete workspace' }, 500);
  }
});

// ============================================
// GET /api/workspaces/:id/members - Get workspace members
// ============================================
workspaces.get('/:id/members', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  const workspaceId = c.req.param('id');

  try {
    // Check if user is a member of this workspace
    const membership = await c.env.DB.prepare(`
      SELECT role FROM workspace_members
      WHERE workspace_id = ? AND user_id = ?
    `).bind(workspaceId, auth.userId).first<{ role: string }>();

    if (!membership) {
      return c.json({ error: 'Workspace not found or access denied' }, 404);
    }

    // Get all members
    const result = await c.env.DB.prepare(`
      SELECT
        wm.id,
        wm.user_id,
        wm.role,
        wm.joined_at,
        u.name,
        u.email,
        inviter.name as invited_by_name,
        (SELECT COUNT(*) FROM tasks WHERE workspace_id = ? AND assigned_to = wm.user_id) as assigned_tasks_count,
        (SELECT COUNT(*) FROM tasks WHERE workspace_id = ? AND assigned_to = wm.user_id AND status = 'completed') as completed_tasks_count,
        (SELECT COALESCE(SUM(duration_minutes), 0) FROM time_sessions WHERE workspace_id = ? AND user_id = wm.user_id) as total_minutes
      FROM workspace_members wm
      INNER JOIN users u ON wm.user_id = u.id
      LEFT JOIN users inviter ON wm.invited_by = inviter.id
      WHERE wm.workspace_id = ?
      ORDER BY
        CASE wm.role
          WHEN 'owner' THEN 1
          WHEN 'admin' THEN 2
          WHEN 'member' THEN 3
        END,
        wm.joined_at ASC
    `).bind(workspaceId, workspaceId, workspaceId, workspaceId).all();

    return c.json({
      members: result.results || []
    });

  } catch (error) {
    console.error('Get workspace members error:', error);
    return c.json({ error: 'Failed to fetch workspace members' }, 500);
  }
});

// ============================================
// DELETE /api/workspaces/:id/members/:userId - Remove member
// ============================================
workspaces.delete('/:id/members/:userId', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  const workspaceId = c.req.param('id');
  const userIdToRemove = c.req.param('userId');

  try {
    // Check if requester is owner or admin
    const requesterMembership = await c.env.DB.prepare(`
      SELECT role FROM workspace_members
      WHERE workspace_id = ? AND user_id = ?
    `).bind(workspaceId, auth.userId).first<{ role: string }>();

    if (!requesterMembership || (requesterMembership.role !== 'owner' && requesterMembership.role !== 'admin')) {
      return c.json({ error: 'Permission denied. Only owners and admins can remove members' }, 403);
    }

    // Check if trying to remove the owner
    const memberToRemove = await c.env.DB.prepare(`
      SELECT role FROM workspace_members
      WHERE workspace_id = ? AND user_id = ?
    `).bind(workspaceId, userIdToRemove).first<{ role: string }>();

    if (!memberToRemove) {
      return c.json({ error: 'Member not found' }, 404);
    }

    if (memberToRemove.role === 'owner') {
      return c.json({ error: 'Cannot remove workspace owner' }, 400);
    }

    // Admins cannot remove other admins, only owner can
    if (requesterMembership.role === 'admin' && memberToRemove.role === 'admin') {
      return c.json({ error: 'Admins cannot remove other admins' }, 403);
    }

    // Remove member
    await c.env.DB.prepare(`
      DELETE FROM workspace_members
      WHERE workspace_id = ? AND user_id = ?
    `).bind(workspaceId, userIdToRemove).run();

    // Unassign all tasks assigned to this user in this workspace
    await c.env.DB.prepare(`
      UPDATE tasks
      SET assigned_to = NULL, assigned_by = NULL, assigned_at = NULL
      WHERE workspace_id = ? AND assigned_to = ?
    `).bind(workspaceId, userIdToRemove).run();

    return c.json({ success: true, message: 'Member removed successfully' });

  } catch (error) {
    console.error('Remove member error:', error);
    return c.json({ error: 'Failed to remove member' }, 500);
  }
});

export default workspaces;
