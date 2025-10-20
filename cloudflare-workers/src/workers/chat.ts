import { Hono } from 'hono';
import { verify } from '@tsndr/cloudflare-worker-jwt';
import type { Env, SessionData } from '../types';

const app = new Hono<{ Bindings: Env }>();

// Helper function to verify token
async function verifyAuthToken(token: string, env: Env): Promise<SessionData | null> {
  try {
    // Verify JWT signature
    const isValid = await verify(token, env.JWT_SECRET);

    if (!isValid) {
      return null;
    }

    // Check session in KV
    const sessionData = await env.KV.get(`session:${token}`, 'json') as SessionData | null;

    return sessionData;
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

// Middleware to verify authentication for HTTP endpoints
app.use('/workspace/:workspaceId/messages', async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.substring(7);
  const sessionData = await verifyAuthToken(token, c.env);

  if (!sessionData) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }

  c.set('userId', sessionData.userId);
  c.set('email', sessionData.email);
  await next();
});

app.use('/workspace/:workspaceId/online', async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.substring(7);
  const sessionData = await verifyAuthToken(token, c.env);

  if (!sessionData) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }

  c.set('userId', sessionData.userId);
  c.set('email', sessionData.email);
  await next();
});

// Get or create WebSocket connection for a workspace chat room
app.get('/workspace/:workspaceId/connect', async (c) => {
  const workspaceId = c.req.param('workspaceId');

  // Get token from query parameter (WebSocket can't use Authorization header in browsers)
  const token = c.req.query('token');

  if (!token) {
    return c.json({ error: 'Unauthorized - No token provided' }, 401);
  }

  // Verify token
  const sessionData = await verifyAuthToken(token, c.env);

  if (!sessionData) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }

  const userId = sessionData.userId;

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
