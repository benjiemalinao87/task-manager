import { Hono } from 'hono';
import type { Env } from '../types';
import { requireAuth } from '../middleware/auth';
import { generateId, getCurrentTimestamp } from '../utils/crypto';

const feedback = new Hono<{ Bindings: Env }>();

const FROM_ADDRESS = 'Workoto <task@customerconnects.app>';
const MAX_REQUESTS_PER_HOUR = 5;
const TITLE_MIN = 3;
const TITLE_MAX = 120;
const DETAILS_MAX = 4000;

const IMPORTANCE_LABELS: Record<string, string> = {
  nice_to_have: 'Nice to have',
  important: 'Important',
  critical: 'Critical',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Subjects must be a single line
function toSingleLine(value: string): string {
  return value.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

// POST /api/feedback/feature-request - Email a feature request to the Workoto team
feedback.post('/feature-request', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    const recipient = c.env.FEATURE_REQUEST_EMAIL;
    if (!recipient || !c.env.RESEND_API_KEY) {
      console.error('Feature request not sent: FEATURE_REQUEST_EMAIL or RESEND_API_KEY is not set');
      return c.json({ error: 'Feature requests are not set up yet. Please try again later.' }, 503);
    }

    const body = await c.req.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') {
      return c.json({ error: 'Invalid request body' }, 400);
    }

    const title = typeof body.title === 'string' ? toSingleLine(body.title) : '';
    const details = typeof body.details === 'string' ? body.details.trim() : '';
    const importance = typeof body.importance === 'string' && IMPORTANCE_LABELS[body.importance]
      ? body.importance
      : 'nice_to_have';
    const workspaceId = typeof body.workspaceId === 'string' ? body.workspaceId : '';
    const pageUrl = typeof body.pageUrl === 'string' ? body.pageUrl.slice(0, 300) : '';

    if (title.length < TITLE_MIN) {
      return c.json({ error: 'Describe the feature in a few words.' }, 400);
    }
    if (title.length > TITLE_MAX) {
      return c.json({ error: `Keep the summary under ${TITLE_MAX} characters.` }, 400);
    }
    if (details.length > DETAILS_MAX) {
      return c.json({ error: `Keep the details under ${DETAILS_MAX} characters.` }, 400);
    }

    // Per-user limit so the form cannot be used to flood the inbox
    const rateKey = `feature_request_count:${auth.userId}`;
    const sentThisHour = parseInt((await c.env.KV.get(rateKey)) || '0', 10) || 0;
    if (sentThisHour >= MAX_REQUESTS_PER_HOUR) {
      return c.json({ error: 'You have sent several requests in the last hour. Try again a little later.' }, 429);
    }

    const user = await c.env.DB.prepare(
      'SELECT name, email FROM users WHERE id = ?'
    ).bind(auth.userId).first<{ name: string | null; email: string }>();

    const userEmail = user?.email || auth.userEmail;
    const userName = toSingleLine(user?.name || '') || userEmail;

    // Only report a workspace the sender actually belongs to
    let workspace: { name: string; role: string } | null = null;
    if (workspaceId) {
      workspace = await c.env.DB.prepare(
        `SELECT w.name AS name, wm.role AS role
         FROM workspaces w
         JOIN workspace_members wm ON wm.workspace_id = w.id
         WHERE w.id = ? AND wm.user_id = ?`
      ).bind(workspaceId, auth.userId).first<{ name: string; role: string }>();
    }

    const requestId = generateId();
    const submittedAt = getCurrentTimestamp();
    const importanceLabel = IMPORTANCE_LABELS[importance];

    const metaRows: Array<[string, string]> = [
      ['From', `${userName} <${userEmail}>`],
      ['Workspace', workspace ? `${workspace.name} (${workspace.role})` : 'Not provided'],
      ['Importance', importanceLabel],
      ['Sent from', pageUrl || 'Not provided'],
      ['Submitted', submittedAt],
      ['Reference', requestId],
    ];

    const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0f172a;">
  <p style="margin:0 0 4px;font-size:13px;color:#64748b;">Workoto feature request</p>
  <h1 style="margin:0 0 16px;font-size:20px;line-height:1.35;">${escapeHtml(title)}</h1>
  <div style="margin:0 0 24px;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:15px;line-height:1.6;white-space:pre-wrap;">${
    details ? escapeHtml(details) : '<span style="color:#64748b;">No extra details were added.</span>'
  }</div>
  <table style="width:100%;border-collapse:collapse;font-size:14px;">
    ${metaRows.map(([label, value]) => `
    <tr>
      <td style="padding:6px 12px 6px 0;color:#64748b;white-space:nowrap;vertical-align:top;">${label}</td>
      <td style="padding:6px 0;word-break:break-word;">${escapeHtml(value)}</td>
    </tr>`).join('')}
  </table>
  <p style="margin:24px 0 0;font-size:13px;color:#64748b;">Reply to this email to answer ${escapeHtml(userName)} directly.</p>
</div>`;

    const text = [
      `Workoto feature request: ${title}`,
      '',
      details || 'No extra details were added.',
      '',
      ...metaRows.map(([label, value]) => `${label}: ${value}`),
      '',
      `Reply to this email to answer ${userName} directly.`,
    ].join('\n');

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${c.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [recipient],
        reply_to: userEmail,
        subject: `Feature request: ${title}`,
        html,
        text,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Feature request email failed (${response.status}):`, errorBody);
      return c.json({ error: 'Your request could not be sent. Please try again.' }, 502);
    }

    await c.env.KV.put(rateKey, String(sentThisHour + 1), { expirationTtl: 3600 });

    return c.json({ success: true, id: requestId });
  } catch (error) {
    console.error('Feature request error:', error);
    return c.json({ error: 'Your request could not be sent. Please try again.' }, 500);
  }
});

export default feedback;
