# Workers Migration Guide

## Overview

Convert 9 Supabase Edge Functions (Deno) to Cloudflare Workers with proper authentication and data isolation.

---

## Worker Architecture

```
CLOUDFLARE WORKERS ARCHITECTURE
════════════════════════════════

┌──────────────────────────────────────────────────────────────┐
│                      MAIN ROUTER WORKER                       │
│                         (Hono/itty)                           │
│                                                              │
│  Route Mapping:                                              │
│  ─────────────────────────────────────────────────────────  │
│  POST   /api/auth/signup          → Auth Worker              │
│  POST   /api/auth/login           → Auth Worker              │
│  POST   /api/auth/logout          → Auth Worker              │
│  GET    /api/auth/me              → Auth Worker              │
│                                                              │
│  GET    /api/tasks                → Tasks Worker             │
│  POST   /api/tasks                → Tasks Worker             │
│  PATCH  /api/tasks/:id            → Tasks Worker             │
│  DELETE /api/tasks/:id            → Tasks Worker             │
│                                                              │
│  POST   /api/ai/generate-summary  → AI Worker                │
│                                                              │
│  POST   /api/email/send           → Email Worker             │
│  POST   /api/email/test           → Email Worker             │
│                                                              │
│  GET    /api/sessions             → Sessions Worker          │
│  POST   /api/sessions/clock-in    → Sessions Worker          │
│  POST   /api/sessions/clock-out   → Sessions Worker          │
│                                                              │
│  GET    /api/integrations         → Integrations Worker     │
│  POST   /api/integrations/:type   → Integrations Worker     │
│  DELETE /api/integrations/:type   → Integrations Worker     │
│                                                              │
│  POST   /api/asana/projects       → Asana Worker            │
│  POST   /api/asana/sync-task      → Asana Worker            │
└──────────────────────────────────────────────────────────────┘
                          │
                          │ All Workers Share:
                          │
         ┌────────────────┼────────────────┐
         │                │                │
         ▼                ▼                ▼
    ┌────────┐       ┌────────┐      ┌─────────┐
    │   D1   │       │   KV   │      │ Secrets │
    │  (DB)  │       │(Session)│     │(API Keys)│
    └────────┘       └────────┘      └─────────┘
```

---

## Migration Mapping

### Supabase → Cloudflare Worker Mapping

| Supabase Function | Cloudflare Worker | Changes Required |
|-------------------|-------------------|------------------|
| `generate-summary` | `api-ai-summary` | Add auth, user_id filter |
| `send-email` | `api-email-send` | Add auth, queue integration |
| `send-task-created-email` | `api-email-task-created` | Add auth, queue |
| `send-daily-report` | `api-email-daily-report` | Add auth, filter by user_id |
| `send-clockin-email` | `api-email-clockin` | Add auth, queue |
| `create-asana-task` | `api-asana-create` | Add auth, user's integration |
| `complete-asana-task` | `api-asana-complete` | Add auth, user's integration |
| `get-asana-projects` | `api-asana-projects` | Add auth, user's API key |
| `send-test-email` | `api-email-test` | Add auth, user's settings |

---

## Example Migrations

### 1. AI Summary Worker

**Before (Supabase Edge Function):**

```typescript
// supabase/functions/generate-summary/index.ts
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

Deno.serve(async (req: Request) => {
  const { taskId, taskName, description } = await req.json();

  const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

  const openaiResponse = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "Summarize this task..." },
          { role: "user", content: `Task: ${taskName}\\n\\nDescription: ${description}` }
        ],
        max_tokens: 150,
      }),
    }
  );

  const openaiData = await openaiResponse.json();
  const summary = openaiData.choices[0]?.message?.content || "";

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  await supabase
    .from("tasks")
    .update({ ai_summary: summary })
    .eq("id", taskId);

  return new Response(JSON.stringify({ success: true, summary }));
});
```

**After (Cloudflare Worker):**

```typescript
// src/workers/api-ai-summary.ts
import { requireAuth } from '../middleware/auth';
import { randomUUID } from 'crypto';

interface Env {
  DB: D1Database;
  KV: KVNamespace;
  JWT_SECRET: string;
  OPENAI_API_KEY: string;
  EMAIL_QUEUE: Queue;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // ✅ Add authentication
    const auth = await requireAuth(request, env);
    if (auth instanceof Response) return auth;

    const { userId } = auth;

    try {
      const { taskId, taskName, description } = await request.json();

      // ✅ Verify task belongs to user
      const task = await env.DB.prepare(
        'SELECT id FROM tasks WHERE id = ? AND user_id = ?'
      ).bind(taskId, userId).first();

      if (!task) {
        return new Response(
          JSON.stringify({ error: 'Task not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Call OpenAI (same as before)
      const openaiResponse = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content: "You are a helpful assistant that creates concise task summaries. Summarize in 2-3 sentences."
              },
              {
                role: "user",
                content: `Task: ${taskName}\\n\\nDescription: ${description}`
              }
            ],
            temperature: 0.7,
            max_tokens: 150,
          }),
        }
      );

      if (!openaiResponse.ok) {
        throw new Error('OpenAI API failed');
      }

      const openaiData = await openaiResponse.json();
      const summary = openaiData.choices[0]?.message?.content || "";

      // ✅ Update with user_id filter
      await env.DB.prepare(
        'UPDATE tasks SET ai_summary = ?, updated_at = ? WHERE id = ? AND user_id = ?'
      ).bind(summary, new Date().toISOString(), taskId, userId).run();

      return new Response(
        JSON.stringify({ success: true, summary }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error('AI summary error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to generate summary' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
};
```

### 2. Email Worker with Queue

**After (Cloudflare Worker with Queue):**

```typescript
// src/workers/api-email-send.ts
import { requireAuth } from '../middleware/auth';

interface Env {
  DB: D1Database;
  KV: KVNamespace;
  JWT_SECRET: string;
  EMAIL_QUEUE: Queue;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const auth = await requireAuth(request, env);
    if (auth instanceof Response) return auth;

    const { userId } = auth;

    try {
      const { taskId, type } = await request.json();

      // Verify task belongs to user
      const task = await env.DB.prepare(`
        SELECT * FROM tasks WHERE id = ? AND user_id = ?
      `).bind(taskId, userId).first();

      if (!task) {
        return new Response(
          JSON.stringify({ error: 'Task not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Get user's email settings
      const settings = await env.DB.prepare(
        'SELECT default_email FROM settings WHERE user_id = ?'
      ).bind(userId).first();

      if (!settings || !settings.default_email) {
        return new Response(
          JSON.stringify({ error: 'No email configured' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // ✅ Queue email instead of sending immediately
      await env.EMAIL_QUEUE.send({
        type,
        userId,
        taskId,
        email: settings.default_email,
        task: {
          name: task.task_name,
          description: task.description,
          estimatedTime: task.estimated_time,
          actualTime: task.actual_time,
          aiSummary: task.ai_summary,
          notes: task.notes
        }
      });

      // Return immediately (don't wait for email)
      return new Response(
        JSON.stringify({ success: true, message: 'Email queued' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error('Email queue error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to queue email' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
};
```

**Email Queue Consumer:**

```typescript
// src/workers/queue-email-consumer.ts

interface Env {
  DB: D1Database;
  SENDGRID_API_KEY: string;
  RESEND_API_KEY: string;
}

interface EmailMessage {
  type: 'task_created' | 'task_completed' | 'daily_report' | 'clock_in';
  userId: string;
  email: string;
  taskId?: string;
  task?: any;
}

export default {
  async queue(batch: MessageBatch<EmailMessage>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      try {
        const { type, email, task } = message.body;

        let emailHtml = '';
        let subject = '';

        // Build email based on type
        switch (type) {
          case 'task_created':
            subject = `New Task: ${task.name}`;
            emailHtml = buildTaskCreatedEmail(task);
            break;

          case 'task_completed':
            subject = `Task Completed: ${task.name}`;
            emailHtml = buildTaskCompletedEmail(task);
            break;

          case 'daily_report':
            subject = `Daily Report - ${new Date().toLocaleDateString()}`;
            emailHtml = await buildDailyReportEmail(message.body.userId, env);
            break;

          case 'clock_in':
            subject = 'Clocked In';
            emailHtml = buildClockInEmail();
            break;
        }

        // Send via SendGrid
        const sendgridResponse = await fetch(
          "https://api.sendgrid.com/v3/mail/send",
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${env.SENDGRID_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              personalizations: [{ to: [{ email }], subject }],
              from: { email: "noreply@yourdomain.com", name: "Task Manager" },
              content: [{ type: "text/html", value: emailHtml }],
            }),
          }
        );

        if (!sendgridResponse.ok) {
          throw new Error(`SendGrid failed: ${sendgridResponse.statusText}`);
        }

        // Mark as processed
        message.ack();

      } catch (error) {
        console.error('Email sending failed:', error);
        // Message will be retried automatically (up to 3 times)
        message.retry();
      }
    }
  }
};

function buildTaskCreatedEmail(task: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <body>
      <h1>New Task Created</h1>
      <h2>${task.name}</h2>
      <p><strong>Description:</strong> ${task.description}</p>
      <p><strong>Estimated Time:</strong> ${task.estimatedTime}</p>
      ${task.aiSummary ? `<p><strong>AI Summary:</strong> ${task.aiSummary}</p>` : ''}
    </body>
    </html>
  `;
}

function buildTaskCompletedEmail(task: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <body>
      <h1>Task Completed ✅</h1>
      <h2>${task.name}</h2>
      <p><strong>Estimated:</strong> ${task.estimatedTime}</p>
      <p><strong>Actual:</strong> ${task.actualTime}</p>
      ${task.notes ? `<p><strong>Notes:</strong> ${task.notes}</p>` : ''}
    </body>
    </html>
  `;
}
```

### 3. Asana Integration Worker

**After (Cloudflare Worker):**

```typescript
// src/workers/api-asana.ts
import { requireAuth } from '../middleware/auth';

interface Env {
  DB: D1Database;
  KV: KVNamespace;
  JWT_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const auth = await requireAuth(request, env);
    if (auth instanceof Response) return auth;

    const { userId } = auth;
    const url = new URL(request.url);

    // GET /api/asana/projects - Fetch projects
    if (url.pathname === '/api/asana/projects' && request.method === 'POST') {
      try {
        // ✅ Get user's Asana integration
        const integration = await env.DB.prepare(`
          SELECT api_key, config FROM integrations
          WHERE user_id = ? AND integration_type = 'asana' AND is_active = 1
        `).bind(userId).first();

        if (!integration) {
          return new Response(
            JSON.stringify({ error: 'Asana not configured' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        const config = JSON.parse(integration.config);
        const workspaceGid = config.workspace_gid;

        if (!workspaceGid) {
          return new Response(
            JSON.stringify({ error: 'Workspace not configured' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        // Fetch projects from Asana
        const asanaResponse = await fetch(
          `https://app.asana.com/api/1.0/workspaces/${workspaceGid}/projects`,
          {
            headers: {
              "Authorization": `Bearer ${integration.api_key}`,
              "Accept": "application/json",
            },
          }
        );

        if (!asanaResponse.ok) {
          throw new Error('Failed to fetch Asana projects');
        }

        const data = await asanaResponse.json();

        return new Response(
          JSON.stringify({ projects: data.data }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

      } catch (error) {
        console.error('Asana projects error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch projects' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // POST /api/asana/sync-task - Create task in Asana
    if (url.pathname === '/api/asana/sync-task' && request.method === 'POST') {
      try {
        const { taskId } = await request.json();

        // ✅ Verify task belongs to user
        const task = await env.DB.prepare(`
          SELECT * FROM tasks WHERE id = ? AND user_id = ?
        `).bind(taskId, userId).first();

        if (!task) {
          return new Response(
            JSON.stringify({ error: 'Task not found' }),
            { status: 404, headers: { 'Content-Type': 'application/json' } }
          );
        }

        // Get user's Asana integration
        const integration = await env.DB.prepare(`
          SELECT api_key, config FROM integrations
          WHERE user_id = ? AND integration_type = 'asana' AND is_active = 1
        `).bind(userId).first();

        if (!integration) {
          return new Response(
            JSON.stringify({ error: 'Asana not configured' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        const config = JSON.parse(integration.config);
        const projectGid = config.project_gid;

        // Create task in Asana
        const asanaResponse = await fetch("https://app.asana.com/api/1.0/tasks", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${integration.api_key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            data: {
              name: task.task_name,
              notes: `${task.description}\\n\\nEstimated Time: ${task.estimated_time}`,
              projects: [projectGid],
              due_on: new Date().toISOString().split('T')[0],
            },
          }),
        });

        if (!asanaResponse.ok) {
          throw new Error('Failed to create Asana task');
        }

        const asanaTask = await asanaResponse.json();

        // Update task with Asana ID
        await env.DB.prepare(
          'UPDATE tasks SET asana_task_id = ? WHERE id = ? AND user_id = ?'
        ).bind(asanaTask.data.gid, taskId, userId).run();

        return new Response(
          JSON.stringify({
            success: true,
            asanaTaskGid: asanaTask.data.gid,
            asanaTaskUrl: `https://app.asana.com/0/${projectGid}/${asanaTask.data.gid}`
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

      } catch (error) {
        console.error('Asana sync error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to sync task' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
      }
    }

    return new Response('Not found', { status: 404 });
  }
};
```

---

## Router Setup (Hono)

**Main Router Worker:**

```typescript
// src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

// CORS middleware
app.use('/*', cors({
  origin: ['https://yourdomain.com', 'https://www.yourdomain.com'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

// Auth routes
import authWorker from './workers/auth';
app.route('/api/auth', authWorker);

// Tasks routes
import tasksWorker from './workers/api-tasks';
app.route('/api/tasks', tasksWorker);

// AI routes
import aiWorker from './workers/api-ai-summary';
app.route('/api/ai', aiWorker);

// Email routes
import emailWorker from './workers/api-email';
app.route('/api/email', emailWorker);

// Sessions routes
import sessionsWorker from './workers/api-sessions';
app.route('/api/sessions', sessionsWorker);

// Integrations routes
import integrationsWorker from './workers/api-integrations';
app.route('/api/integrations', integrationsWorker);

// Asana routes
import asanaWorker from './workers/api-asana';
app.route('/api/asana', asanaWorker);

// 404 handler
app.notFound((c) => c.json({ error: 'Not found' }, 404));

// Error handler
app.onError((err, c) => {
  console.error('Global error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

export default app;
```

---

## Deployment

### 1. Update wrangler.toml

```toml
name = "task-manager-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"
node_compat = true

# D1 Database
[[d1_databases]]
binding = "DB"
database_name = "task-manager-db"
database_id = "YOUR-DATABASE-ID"

# KV Namespace
[[kv_namespaces]]
binding = "KV"
id = "YOUR-KV-ID"

# Queue for emails
[[queues.producers]]
binding = "EMAIL_QUEUE"
queue = "email-queue"

[[queues.consumers]]
queue = "email-queue"
max_batch_size = 10
max_batch_timeout = 30

# Routes
[[routes]]
pattern = "api.yourdomain.com/*"
zone_name = "yourdomain.com"
```

### 2. Deploy

```bash
# Build
npm run build

# Deploy main worker
wrangler deploy

# Deploy queue consumer separately
wrangler deploy --name task-manager-email-consumer src/workers/queue-email-consumer.ts
```

---

## Testing Workers

```bash
# Test locally with Wrangler
wrangler dev

# Test auth
curl -X POST http://localhost:8787/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"test@example.com","password":"password123"}'

# Test protected endpoint
TOKEN="your-jwt-token"

curl -X GET http://localhost:8787/api/tasks \\
  -H "Authorization: Bearer $TOKEN"
```

---

## Next Steps

After Workers migration:

1. ✅ Proceed to [FRONTEND_MIGRATION.md](./FRONTEND_MIGRATION.md)
2. ✅ Update frontend API calls
3. ✅ Test all user flows end-to-end

---

**Last Updated:** 2025-10-12
