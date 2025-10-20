import { Hono } from 'hono';
import { verify } from '@tsndr/cloudflare-worker-jwt';
import type { Env, SessionData } from '../types';

const app = new Hono<{ Bindings: Env }>();

// Middleware to verify authentication
app.use('/*', async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.substring(7);

  try {
    // Verify JWT signature
    const isValid = await verify(token, c.env.JWT_SECRET);

    if (!isValid) {
      return c.json({ error: 'Invalid token' }, 401);
    }

    // Check session in KV
    const sessionData = await c.env.KV.get(`session:${token}`, 'json') as SessionData | null;

    if (!sessionData) {
      return c.json({ error: 'Session expired' }, 401);
    }

    c.set('userId', sessionData.userId);
    c.set('email', sessionData.email);
    await next();
  } catch (error) {
    console.error('Auth error:', error);
    return c.json({ error: 'Invalid token' }, 401);
  }
});

// Get or create WebSocket connection for a workspace chat room
app.get('/workspace/:workspaceId/connect', async (c) => {
  const userId = c.get('userId') as string;
  const workspaceId = c.req.param('workspaceId');

  // Verify user is member of workspace
  const member = await c.env.DB.prepare(
    'SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
  ).bind(workspaceId, userId).first();

  if (!member) {
    return c.json({ error: 'Not a member of this workspace' }, 403);
  }

  // Get user info
  const user = await c.env.DB.prepare(
    'SELECT id, email, name FROM users WHERE id = ?'
  ).bind(userId).first();

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  // Get Durable Object ID for this workspace's chat room
  const id = c.env.CHAT_ROOM.idFromName(workspaceId);
  const stub = c.env.CHAT_ROOM.get(id);

  // Create WebSocket URL with user info
  const url = new URL(c.req.url);
  url.searchParams.set('userId', userId);
  url.searchParams.set('userName', user.name as string || user.email as string);
  url.searchParams.set('workspaceId', workspaceId);

  // Forward the request to the Durable Object
  return stub.fetch(url.toString(), c.req.raw);
});

// Get message history for a workspace
app.get('/workspace/:workspaceId/messages', async (c) => {
  const userId = c.get('userId') as string;
  const workspaceId = c.req.param('workspaceId');

  // Verify user is member of workspace
  const member = await c.env.DB.prepare(
    'SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
  ).bind(workspaceId, userId).first();

  if (!member) {
    return c.json({ error: 'Not a member of this workspace' }, 403);
  }

  // Get Durable Object ID for this workspace's chat room
  const id = c.env.CHAT_ROOM.idFromName(workspaceId);
  const stub = c.env.CHAT_ROOM.get(id);

  // Fetch messages from Durable Object
  const response = await stub.fetch(`${new URL(c.req.url).origin}/messages`);
  const data = await response.json();

  return c.json(data);
});

// Get online users for a workspace
app.get('/workspace/:workspaceId/online', async (c) => {
  const userId = c.get('userId') as string;
  const workspaceId = c.req.param('workspaceId');

  // Verify user is member of workspace
  const member = await c.env.DB.prepare(
    'SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
  ).bind(workspaceId, userId).first();

  if (!member) {
    return c.json({ error: 'Not a member of this workspace' }, 403);
  }

  // Get Durable Object ID for this workspace's chat room
  const id = c.env.CHAT_ROOM.idFromName(workspaceId);
  const stub = c.env.CHAT_ROOM.get(id);

  // Fetch online users from Durable Object
  const response = await stub.fetch(`${new URL(c.req.url).origin}/online`);
  const data = await response.json();

  return c.json(data);
});

export default app;
