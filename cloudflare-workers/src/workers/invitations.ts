import { Hono } from 'hono';
import type { Env } from '../types';
import { requireAuth } from '../middleware/auth';
import { generateId, getCurrentTimestamp, generateToken } from '../utils/crypto';

const invitations = new Hono<{ Bindings: Env }>();

// ============================================
// POST /api/workspaces/:id/invitations - Invite member
// ============================================
invitations.post('/:workspaceId/invitations', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  const workspaceId = c.req.param('workspaceId');

  try {
    // Check if user is owner or admin
    const membership = await c.env.DB.prepare(`
      SELECT role FROM workspace_members
      WHERE workspace_id = ? AND user_id = ?
    `).bind(workspaceId, auth.userId).first<{ role: string }>();

    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return c.json({ error: 'Permission denied. Only owners and admins can invite members' }, 403);
    }

    const body = await c.req.json<{ email: string; role?: 'admin' | 'member' }>();

    if (!body.email || !body.email.trim()) {
      return c.json({ error: 'Email is required' }, 400);
    }

    const email = body.email.trim().toLowerCase();
    const role = body.role || 'member';

    // Validate role
    if (role !== 'admin' && role !== 'member') {
      return c.json({ error: 'Invalid role. Must be "admin" or "member"' }, 400);
    }

    // Only owner can invite admins
    if (role === 'admin' && membership.role !== 'owner') {
      return c.json({ error: 'Only workspace owner can invite admins' }, 403);
    }

    // Check if user with this email exists
    const existingUser = await c.env.DB.prepare(`
      SELECT id FROM users WHERE email = ?
    `).bind(email).first<{ id: string }>();

    // If user exists, check if already a member
    if (existingUser) {
      const existingMember = await c.env.DB.prepare(`
        SELECT id FROM workspace_members
        WHERE workspace_id = ? AND user_id = ?
      `).bind(workspaceId, existingUser.id).first();

      if (existingMember) {
        return c.json({ error: 'User is already a member of this workspace' }, 400);
      }
    }

    // Check for pending invitation
    const existingInvitation = await c.env.DB.prepare(`
      SELECT id, status FROM workspace_invitations
      WHERE workspace_id = ? AND email = ? AND status = 'pending'
    `).bind(workspaceId, email).first<{ id: string; status: string }>();

    if (existingInvitation) {
      return c.json({ error: 'Invitation already sent to this email' }, 400);
    }

    // Create invitation
    const invitationId = generateId();
    const token = generateToken();
    const timestamp = getCurrentTimestamp();

    // Expires in 7 days
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await c.env.DB.prepare(`
      INSERT INTO workspace_invitations
      (id, workspace_id, email, role, invited_by, token, status, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `).bind(invitationId, workspaceId, email, role, auth.userId, token, expiresAt, timestamp).run();

    // Get workspace and inviter details for email
    const workspace = await c.env.DB.prepare(`
      SELECT w.name as workspace_name, u.name as inviter_name, u.email as inviter_email
      FROM workspaces w
      LEFT JOIN users u ON w.owner_id = u.id
      WHERE w.id = ?
    `).bind(workspaceId).first<{ workspace_name: string; inviter_name: string; inviter_email: string }>();

    const inviter = await c.env.DB.prepare(`
      SELECT name, email FROM users WHERE id = ?
    `).bind(auth.userId).first<{ name: string; email: string }>();

    // Queue invitation email
    try {
      await c.env.EMAIL_QUEUE.send({
        type: 'workspace_invitation',
        to: email,
        data: {
          workspace_name: workspace?.workspace_name || 'Unknown Workspace',
          inviter_name: inviter?.name || inviter?.email || 'A team member',
          role: role,
          invitation_token: token,
          invitation_link: `${c.env.FRONTEND_URL || 'https://app.workoto.com'}/accept-invitation?token=${token}`,
          expires_at: expiresAt
        }
      });
    } catch (emailError) {
      console.error('Failed to queue invitation email:', emailError);
      // Continue anyway - invitation is created
    }

    return c.json({
      invitation: {
        id: invitationId,
        email: email,
        role: role,
        token: token,
        status: 'pending',
        expires_at: expiresAt,
        created_at: timestamp
      }
    }, 201);

  } catch (error) {
    console.error('Create invitation error:', error);
    return c.json({ error: 'Failed to create invitation' }, 500);
  }
});

// ============================================
// GET /api/workspaces/:id/invitations - Get workspace invitations
// ============================================
invitations.get('/:workspaceId/invitations', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  const workspaceId = c.req.param('workspaceId');

  try {
    // Check if user is owner or admin
    const membership = await c.env.DB.prepare(`
      SELECT role FROM workspace_members
      WHERE workspace_id = ? AND user_id = ?
    `).bind(workspaceId, auth.userId).first<{ role: string }>();

    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return c.json({ error: 'Permission denied' }, 403);
    }

    // Get all invitations for this workspace
    const result = await c.env.DB.prepare(`
      SELECT
        i.id,
        i.email,
        i.role,
        i.status,
        i.expires_at,
        i.created_at,
        u.name as invited_by_name,
        u.email as invited_by_email
      FROM workspace_invitations i
      LEFT JOIN users u ON i.invited_by = u.id
      WHERE i.workspace_id = ?
      ORDER BY i.created_at DESC
    `).bind(workspaceId).all();

    return c.json({
      invitations: result.results || []
    });

  } catch (error) {
    console.error('Get invitations error:', error);
    return c.json({ error: 'Failed to fetch invitations' }, 500);
  }
});

// ============================================
// GET /api/invitations/pending - Get user's pending invitations
// ============================================
invitations.get('/pending', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    // Get user email
    const user = await c.env.DB.prepare(`
      SELECT email FROM users WHERE id = ?
    `).bind(auth.userId).first<{ email: string }>();

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Get pending invitations for this user's email
    const result = await c.env.DB.prepare(`
      SELECT
        i.id,
        i.workspace_id,
        i.role,
        i.token,
        i.expires_at,
        i.created_at,
        w.name as workspace_name,
        u.name as invited_by_name,
        u.email as invited_by_email
      FROM workspace_invitations i
      INNER JOIN workspaces w ON i.workspace_id = w.id
      LEFT JOIN users u ON i.invited_by = u.id
      WHERE i.email = ? AND i.status = 'pending'
      AND datetime(i.expires_at) > datetime('now')
      ORDER BY i.created_at DESC
    `).bind(user.email).all();

    return c.json({
      invitations: result.results || []
    });

  } catch (error) {
    console.error('Get pending invitations error:', error);
    return c.json({ error: 'Failed to fetch pending invitations' }, 500);
  }
});

// ============================================
// POST /api/invitations/:token/accept - Accept invitation
// ============================================
invitations.post('/:token/accept', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  const token = c.req.param('token');

  try {
    // Get user email
    const user = await c.env.DB.prepare(`
      SELECT email FROM users WHERE id = ?
    `).bind(auth.userId).first<{ email: string }>();

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Get invitation
    const invitation = await c.env.DB.prepare(`
      SELECT * FROM workspace_invitations
      WHERE token = ? AND email = ? AND status = 'pending'
    `).bind(token, user.email).first<{
      id: string;
      workspace_id: string;
      email: string;
      role: string;
      invited_by: string;
      expires_at: string;
    }>();

    if (!invitation) {
      return c.json({ error: 'Invitation not found or already used' }, 404);
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      await c.env.DB.prepare(`
        UPDATE workspace_invitations
        SET status = 'expired'
        WHERE id = ?
      `).bind(invitation.id).run();

      return c.json({ error: 'Invitation has expired' }, 400);
    }

    // Check if already a member
    const existingMember = await c.env.DB.prepare(`
      SELECT id FROM workspace_members
      WHERE workspace_id = ? AND user_id = ?
    `).bind(invitation.workspace_id, auth.userId).first();

    if (existingMember) {
      return c.json({ error: 'Already a member of this workspace' }, 400);
    }

    const memberId = generateId();
    const timestamp = getCurrentTimestamp();

    // Add user as member
    await c.env.DB.prepare(`
      INSERT INTO workspace_members (id, workspace_id, user_id, role, invited_by, joined_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(memberId, invitation.workspace_id, auth.userId, invitation.role, invitation.invited_by, timestamp, timestamp).run();

    // Update invitation status
    await c.env.DB.prepare(`
      UPDATE workspace_invitations
      SET status = 'accepted'
      WHERE id = ?
    `).bind(invitation.id).run();

    // Get workspace details
    const workspace = await c.env.DB.prepare(`
      SELECT id, name, owner_id FROM workspaces WHERE id = ?
    `).bind(invitation.workspace_id).first();

    return c.json({
      success: true,
      workspace: workspace,
      message: 'Successfully joined workspace'
    });

  } catch (error) {
    console.error('Accept invitation error:', error);
    return c.json({ error: 'Failed to accept invitation' }, 500);
  }
});

// ============================================
// POST /api/invitations/:token/decline - Decline invitation
// ============================================
invitations.post('/:token/decline', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  const token = c.req.param('token');

  try {
    // Get user email
    const user = await c.env.DB.prepare(`
      SELECT email FROM users WHERE id = ?
    `).bind(auth.userId).first<{ email: string }>();

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Get invitation
    const invitation = await c.env.DB.prepare(`
      SELECT id FROM workspace_invitations
      WHERE token = ? AND email = ? AND status = 'pending'
    `).bind(token, user.email).first<{ id: string }>();

    if (!invitation) {
      return c.json({ error: 'Invitation not found or already used' }, 404);
    }

    // Update invitation status
    await c.env.DB.prepare(`
      UPDATE workspace_invitations
      SET status = 'declined'
      WHERE id = ?
    `).bind(invitation.id).run();

    return c.json({
      success: true,
      message: 'Invitation declined'
    });

  } catch (error) {
    console.error('Decline invitation error:', error);
    return c.json({ error: 'Failed to decline invitation' }, 500);
  }
});

// ============================================
// DELETE /api/workspaces/:id/invitations/:invitationId - Cancel invitation
// ============================================
invitations.delete('/:workspaceId/invitations/:invitationId', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  const workspaceId = c.req.param('workspaceId');
  const invitationId = c.req.param('invitationId');

  try {
    // Check if user is owner or admin
    const membership = await c.env.DB.prepare(`
      SELECT role FROM workspace_members
      WHERE workspace_id = ? AND user_id = ?
    `).bind(workspaceId, auth.userId).first<{ role: string }>();

    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return c.json({ error: 'Permission denied' }, 403);
    }

    // Delete invitation
    await c.env.DB.prepare(`
      DELETE FROM workspace_invitations
      WHERE id = ? AND workspace_id = ?
    `).bind(invitationId, workspaceId).run();

    return c.json({
      success: true,
      message: 'Invitation cancelled'
    });

  } catch (error) {
    console.error('Cancel invitation error:', error);
    return c.json({ error: 'Failed to cancel invitation' }, 500);
  }
});

export default invitations;
