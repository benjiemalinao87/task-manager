import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import emailConsumer from './workers/email-consumer';
import aiConsumer from './workers/ai-consumer';

// Import workers
import auth from './workers/auth';
import tasks from './workers/tasks';
import ai from './workers/ai';
import settings from './workers/settings';
import timeSessions from './workers/time-sessions';
import integrations from './workers/integrations';
import workspaces from './workers/workspaces';
import invitations from './workers/invitations';
import reports from './workers/reports';
import chat from './workers/chat';

// Export Durable Object
export { ChatRoom } from './durable-objects/ChatRoom';

const app = new Hono<{ Bindings: Env }>();

// CORS middleware
app.use('/*', cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://workoto.app',
    'https://www.workoto.app'
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Mount routes
app.route('/api/auth', auth);
app.route('/api/tasks', tasks);
app.route('/api/ai', ai);
app.route('/api/settings', settings);
app.route('/api/time-sessions', timeSessions);
app.route('/api/integrations', integrations);

// Mount workspace-related routes
app.route('/api/workspaces', workspaces);
app.route('/api/workspaces', invitations);
app.route('/api/workspaces', reports);

// Mount standalone invitation routes (for accepting/declining by token)
app.route('/api/invitations', invitations);

// Mount chat routes
app.route('/api/chat', chat);

// 404 handler
app.notFound((c) => c.json({ error: 'Not found' }, 404));

// Error handler
app.onError((err, c) => {
  console.error('Global error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

// Export HTTP handler and Queue consumers
export default {
  fetch: app.fetch,
  // Route queue messages to the appropriate consumer based on queue name
  async queue(batch: MessageBatch, env: Env): Promise<void> {
    // Check which queue this batch is for
    if (batch.queue === 'email-queue-dev' || batch.queue === 'email-queue-prod') {
      return emailConsumer.queue(batch as MessageBatch<any>, env);
    } else if (batch.queue === 'ai-queue-dev' || batch.queue === 'ai-queue-prod') {
      return aiConsumer.queue(batch as MessageBatch<any>, env);
    } else {
      console.error(`Unknown queue: ${batch.queue}`);
    }
  },
};
