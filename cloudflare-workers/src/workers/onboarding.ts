import { Hono } from 'hono';
import type { Env } from '../types';
import { requireAuth } from '../middleware/auth';
import { generateId, getCurrentTimestamp, generateToken } from '../utils/crypto';

const onboarding = new Hono<{ Bindings: Env }>();

// ============================================
// POST /api/onboarding/invite-colleagues
// Send invitations during onboarding (viral loop)
// ============================================
onboarding.post('/invite-colleagues', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    const body = await c.req.json<{ emails: string[] }>();

    if (!body.emails || !Array.isArray(body.emails)) {
      return c.json({ error: 'Emails array is required' }, 400);
    }

    if (body.emails.length === 0) {
      return c.json({ error: 'At least one email is required' }, 400);
    }

    if (body.emails.length > 5) {
      return c.json({ error: 'Maximum 5 emails allowed' }, 400);
    }

    // Validate all emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const email of body.emails) {
      if (!emailRegex.test(email)) {
        return c.json({ error: `Invalid email format: ${email}` }, 400);
      }
    }

    // Get inviter's details
    const inviter = await c.env.DB.prepare(`
      SELECT name, email FROM users WHERE id = ?
    `).bind(auth.userId).first<{ name: string | null; email: string }>();

    if (!inviter) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Get or create user's workspace
    let workspace = await c.env.DB.prepare(`
      SELECT w.id, w.name FROM workspaces w
      INNER JOIN workspace_members wm ON w.id = wm.workspace_id
      WHERE wm.user_id = ? AND wm.role = 'owner'
      LIMIT 1
    `).bind(auth.userId).first<{ id: string; name: string }>();

    // If no workspace exists, create one
    if (!workspace) {
      const workspaceId = generateId();
      const workspaceName = `${inviter.name || 'My'}'s Workspace`;
      const timestamp = getCurrentTimestamp();

      await c.env.DB.prepare(`
        INSERT INTO workspaces (id, name, owner_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).bind(workspaceId, workspaceName, auth.userId, timestamp, timestamp).run();

      // Add user as owner
      const memberId = generateId();
      await c.env.DB.prepare(`
        INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at, created_at)
        VALUES (?, ?, ?, 'owner', ?, ?)
      `).bind(memberId, workspaceId, auth.userId, timestamp, timestamp).run();

      workspace = { id: workspaceId, name: workspaceName };
    }

    const inviterName = inviter.name || inviter.email;
    const results = [];

    // Send invitation to each email
    for (const email of body.emails) {
      const normalizedEmail = email.toLowerCase().trim();

      try {
        // Check if user already exists
        const existingUser = await c.env.DB.prepare(`
          SELECT id FROM users WHERE email = ?
        `).bind(normalizedEmail).first<{ id: string }>();

        // If user exists, check if already a member
        if (existingUser) {
          const existingMember = await c.env.DB.prepare(`
            SELECT id FROM workspace_members
            WHERE workspace_id = ? AND user_id = ?
          `).bind(workspace.id, existingUser.id).first();

          if (existingMember) {
            results.push({
              email: normalizedEmail,
              status: 'already_member',
              message: 'User is already a member'
            });
            continue;
          }
        }

        // Check for existing pending invitation
        const existingInvitation = await c.env.DB.prepare(`
          SELECT id FROM workspace_invitations
          WHERE workspace_id = ? AND email = ? AND status = 'pending'
        `).bind(workspace.id, normalizedEmail).first();

        if (existingInvitation) {
          results.push({
            email: normalizedEmail,
            status: 'already_invited',
            message: 'Invitation already sent'
          });
          continue;
        }

        // Create workspace invitation
        const invitationId = generateId();
        const token = generateToken();
        const timestamp = getCurrentTimestamp();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        await c.env.DB.prepare(`
          INSERT INTO workspace_invitations
          (id, workspace_id, email, role, invited_by, token, status, expires_at, created_at)
          VALUES (?, ?, ?, 'member', ?, ?, 'pending', ?, ?)
        `).bind(invitationId, workspace.id, normalizedEmail, auth.userId, token, expiresAt, timestamp).run();

        // Queue onboarding invitation email
        const frontendUrl = c.env.FRONTEND_URL || 'https://www.workoto.app';
        const signupLink = existingUser
          ? `${frontendUrl}/?accept_invitation=${token}`
          : `${frontendUrl}/?invitation_email=${encodeURIComponent(normalizedEmail)}&referrer=${encodeURIComponent(inviterName)}`;

        await c.env.EMAIL_QUEUE.send({
          type: 'onboarding_invitation',
          to: normalizedEmail,
          data: {
            inviter_name: inviterName,
            inviter_email: inviter.email,
            workspace_name: workspace.name,
            signup_link: signupLink,
            invitation_token: token
          }
        });

        results.push({
          email: normalizedEmail,
          status: 'sent',
          message: 'Invitation sent successfully'
        });

      } catch (error) {
        console.error(`Failed to send invitation to ${normalizedEmail}:`, error);
        results.push({
          email: normalizedEmail,
          status: 'failed',
          message: 'Failed to send invitation'
        });
      }
    }

    // Mark onboarding invites as sent
    await c.env.DB.prepare(`
      UPDATE settings
      SET onboarding_invites_sent = 1, updated_at = ?
      WHERE user_id = ?
    `).bind(getCurrentTimestamp(), auth.userId).run();

    return c.json({
      success: true,
      workspace: workspace,
      results: results,
      message: `Invitations processed for ${body.emails.length} email(s)`
    }, 200);

  } catch (error) {
    console.error('Send onboarding invitations error:', error);
    return c.json({ error: 'Failed to send invitations' }, 500);
  }
});

// ============================================
// POST /api/onboarding/complete
// Mark onboarding as complete without sending invites
// ============================================
onboarding.post('/complete', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    const timestamp = getCurrentTimestamp();

    // Update settings to mark onboarding as complete
    await c.env.DB.prepare(`
      UPDATE settings
      SET onboarding_completed = 1, updated_at = ?
      WHERE user_id = ?
    `).bind(timestamp, auth.userId).run();

    return c.json({
      success: true,
      message: 'Onboarding completed'
    }, 200);

  } catch (error) {
    console.error('Complete onboarding error:', error);
    return c.json({ error: 'Failed to complete onboarding' }, 500);
  }
});

export default onboarding;
