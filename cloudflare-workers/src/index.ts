import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import emailConsumer from './workers/email-consumer';

// Import workers
import auth from './workers/auth';
import tasks from './workers/tasks';
import ai from './workers/ai';
import settings from './workers/settings';
import timeSessions from './workers/time-sessions';
import integrations from './workers/integrations';

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

// 404 handler
app.notFound((c) => c.json({ error: 'Not found' }, 404));

// Error handler
app.onError((err, c) => {
  console.error('Global error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

// Export both HTTP handler and Queue consumer
export default {
  fetch: app.fetch,
  queue: emailConsumer.queue,
};
