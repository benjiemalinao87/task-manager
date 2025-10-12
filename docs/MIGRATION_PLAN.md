# Cloudflare Migration Plan - Task Manager

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current Architecture](#current-architecture)
3. [Target Architecture](#target-architecture)
4. [Migration Timeline](#migration-timeline)
5. [Detailed Migration Steps](#detailed-migration-steps)
6. [Data Flow Diagrams](#data-flow-diagrams)
7. [Testing Strategy](#testing-strategy)
8. [Rollback Plan](#rollback-plan)

---

## Executive Summary

**Project:** Migrate Task Manager from Supabase to Cloudflare
**Duration:** 2-3 weeks
**Risk Level:** Medium
**Primary Goal:** Multi-tenant SaaS with proper authentication and data isolation

### Key Migration Points

- **Database:** PostgreSQL (Supabase) → SQLite (Cloudflare D1)
- **Serverless:** Supabase Edge Functions (Deno) → Cloudflare Workers
- **Authentication:** None (Critical Gap) → Cloudflare Workers + KV
- **Frontend Hosting:** Current → Cloudflare Pages
- **Sessions:** N/A → Cloudflare KV
- **Email Queue:** Sync → Cloudflare Queues (Async)

### Expected Benefits

- ✅ 50-60% cost reduction at scale
- ✅ Zero cold starts (0ms vs 50-100ms)
- ✅ Global edge performance (300+ locations)
- ✅ Built-in security with Cloudflare WAF
- ✅ Proper multi-tenancy with auth
- ✅ Better developer experience with Wrangler CLI

---

## Current Architecture

### Technology Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    CURRENT ARCHITECTURE                      │
│                        (Supabase)                            │
└─────────────────────────────────────────────────────────────┘

                        ┌──────────────┐
                        │   Browser    │
                        │  (Vite+React)│
                        └──────┬───────┘
                               │
                               │ HTTP/HTTPS
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
      ┌──────────────┐  ┌─────────────┐  ┌─────────────┐
      │  Supabase    │  │  Supabase   │  │  External   │
      │  Realtime    │  │    Edge     │  │    APIs     │
      │   Client     │  │  Functions  │  │             │
      │   (unused)   │  │   (Deno)    │  │ • OpenAI    │
      └──────┬───────┘  └──────┬──────┘  │ • SendGrid  │
             │                 │         │ • Resend    │
             │                 │         │ • Asana     │
             └────────┬────────┘         └─────────────┘
                      │
                      ▼
           ┌─────────────────┐
           │   PostgreSQL    │
           │   (Supabase)    │
           │                 │
           │ • tasks         │
           │ • settings      │
           │ • time_sessions │
           │ • integrations  │
           └─────────────────┘
```

### Current Tables

```sql
-- tasks (4 tables, 0 user isolation)
CREATE TABLE tasks (
  id uuid PRIMARY KEY,
  task_name text NOT NULL,
  description text NOT NULL,
  estimated_time text NOT NULL,
  actual_time text,
  task_link text,
  ai_summary text,
  status text DEFAULT 'in_progress',
  asana_task_id text,
  notes text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
  -- ❌ NO user_id column
);

-- RLS Policies (INSECURE - allows anyone to access everything)
CREATE POLICY "Anyone can view tasks" ON tasks FOR SELECT USING (true);
CREATE POLICY "Anyone can create tasks" ON tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update tasks" ON tasks FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete tasks" ON tasks FOR DELETE USING (true);
```

### Current Edge Functions (9 total)

1. **generate-summary** - OpenAI GPT-3.5 task summaries
2. **send-email** - Task completion notifications
3. **send-task-created-email** - New task notifications
4. **send-daily-report** - End-of-day summary emails
5. **send-clockin-email** - Clock-in notifications
6. **create-asana-task** - Create tasks in Asana
7. **complete-asana-task** - Mark Asana tasks complete
8. **get-asana-projects** - Fetch Asana project list
9. **send-test-email** - Test email configuration

### Security Issues

| Issue | Severity | Impact |
|-------|----------|--------|
| No authentication system | 🔴 CRITICAL | Anyone can access the app |
| RLS policies allow all access | 🔴 CRITICAL | All users see all data |
| No user_id in tables | 🔴 CRITICAL | Cannot filter by user |
| API keys stored plaintext | 🔴 CRITICAL | Keys exposed to all users |
| Shared global settings | 🟡 HIGH | Users overwrite each other |
| No rate limiting | 🟡 MEDIUM | DoS vulnerability |

---

## Target Architecture

### Cloudflare Stack

```
┌─────────────────────────────────────────────────────────────┐
│                     TARGET ARCHITECTURE                      │
│              (Cloudflare Edge Network - 300+ PoPs)          │
└─────────────────────────────────────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
  ┌──────────────┐     ┌──────────────┐    ┌──────────────┐
  │   Cloudflare │     │  Cloudflare  │    │  Cloudflare  │
  │    Pages     │     │   Workers    │    │   Workers    │
  │    (CDN)     │     │    (API)     │    │    (Auth)    │
  │              │     │              │    │              │
  │ React + Vite │◄───►│ Hono Router  │◄──►│ JWT + Hash   │
  └──────────────┘     └──────┬───────┘    └──────┬───────┘
                              │                    │
               ┌──────────────┼────────┬───────────┤
               │              │        │           │
               ▼              ▼        ▼           ▼
        ┌──────────┐   ┌──────────┐ ┌──────┐ ┌──────────┐
        │ D1 (SQL) │   │    KV    │ │Queue │ │ Secrets  │
        │          │   │          │ │      │ │          │
        │ • users  │   │ • session│ │Email │ │ • OpenAI │
        │ • tasks  │   │ • cache  │ │Jobs  │ │ • SendGrd│
        │ • config │   │ • rate   │ │      │ │ • Resend │
        └──────────┘   └──────────┘ └──────┘ │ • Asana  │
               │                              └──────────┘
               └───────────────────────┐
                                       ▼
                              ┌─────────────────┐
                              │  External APIs  │
                              │                 │
                              │ • OpenAI API    │
                              │ • SendGrid API  │
                              │ • Resend API    │
                              │ • Asana API     │
                              └─────────────────┘
```

### New Tables (with user isolation)

```sql
-- Users table (NEW)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Tasks table (UPDATED with user_id)
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,  -- ✅ NEW: Foreign key to users
  task_name TEXT NOT NULL,
  description TEXT NOT NULL,
  estimated_time TEXT NOT NULL,
  actual_time TEXT,
  task_link TEXT,
  ai_summary TEXT,
  status TEXT DEFAULT 'in_progress',
  asana_task_id TEXT,
  notes TEXT,
  started_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Settings table (UPDATED - per user)
CREATE TABLE settings (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,  -- ✅ NEW: One settings row per user
  default_email TEXT NOT NULL DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Time sessions table (UPDATED with user_id)
CREATE TABLE time_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,  -- ✅ NEW
  clock_in TEXT NOT NULL DEFAULT (datetime('now')),
  clock_out TEXT,
  duration_minutes INTEGER,
  report_sent INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Integrations table (UPDATED - per user)
CREATE TABLE integrations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,  -- ✅ NEW
  integration_type TEXT NOT NULL,
  api_key TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 0,
  config TEXT DEFAULT '{}',  -- JSON stored as TEXT
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, integration_type),  -- ✅ One integration per type per user
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_time_sessions_user_id ON time_sessions(user_id);
CREATE INDEX idx_integrations_user_id ON integrations(user_id);
CREATE INDEX idx_integrations_type ON integrations(integration_type);
```

### New Workers (11 total)

**Authentication Workers:**
1. **auth-signup** - User registration
2. **auth-login** - User login with JWT
3. **auth-logout** - Session invalidation
4. **auth-verify** - Token verification middleware

**API Workers (migrated from Supabase):**
5. **api-generate-summary** - AI task summaries
6. **api-send-email** - Task completion emails
7. **api-send-task-created** - Task creation notifications
8. **api-send-daily-report** - End-of-day reports
9. **api-send-clockin** - Clock-in notifications
10. **api-asana-sync** - Asana task operations
11. **api-asana-projects** - Fetch Asana projects

**Queue Consumers:**
12. **queue-email-consumer** - Process email queue

---

## Migration Timeline

### Week 1: Foundation & Database

**Days 1-2: Project Setup**
- [ ] Create Cloudflare account
- [ ] Install Wrangler CLI
- [ ] Initialize D1 database
- [ ] Set up KV namespaces
- [ ] Configure Queues
- [ ] Set up Secrets

**Days 3-5: Database Migration**
- [ ] Convert PostgreSQL schemas to SQLite
- [ ] Add user_id to all tables
- [ ] Create migration scripts
- [ ] Export Supabase data
- [ ] Transform and import to D1
- [ ] Verify data integrity

### Week 2: Authentication & Workers

**Days 6-8: Authentication**
- [ ] Create users table
- [ ] Build signup Worker
- [ ] Build login Worker
- [ ] Implement JWT signing/verification
- [ ] Set up session management in KV
- [ ] Build auth middleware

**Days 9-10: Workers Migration**
- [ ] Convert 9 Supabase functions to Workers
- [ ] Add user_id filtering to all queries
- [ ] Implement proper CORS
- [ ] Add error handling
- [ ] Set up email queue consumer

### Week 3: Frontend & Testing

**Days 11-13: Frontend Updates**
- [ ] Remove Supabase client
- [ ] Add auth state management
- [ ] Build login/signup UI
- [ ] Update all API calls
- [ ] Add auth error handling
- [ ] Test all user flows

**Days 14-15: Testing & Deployment**
- [ ] Integration testing
- [ ] Load testing
- [ ] Security audit
- [ ] Deploy to Cloudflare Pages
- [ ] Deploy all Workers
- [ ] Monitor for issues

---

## Detailed Migration Steps

See the following detailed guides:
- [DATABASE_MIGRATION.md](./docs/DATABASE_MIGRATION.md) - Database schema conversion
- [AUTHENTICATION_SETUP.md](./docs/AUTHENTICATION_SETUP.md) - Auth implementation
- [WORKERS_MIGRATION.md](./docs/WORKERS_MIGRATION.md) - Serverless function conversion
- [FRONTEND_MIGRATION.md](./docs/FRONTEND_MIGRATION.md) - React app updates
- [DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md) - Production deployment

---

## Data Flow Diagrams

### Current Data Flow (Insecure)

```
TASK CREATION FLOW (Current - No Auth)
═════════════════════════════════════

┌──────────┐
│ Browser  │
│ (React)  │
└────┬─────┘
     │
     │ 1. POST /tasks
     │    { taskName, description, ... }
     │    No auth header ❌
     │
     ▼
┌─────────────────┐
│ Supabase Client │
│  (Direct DB)    │
└────┬────────────┘
     │
     │ 2. INSERT INTO tasks
     │    No user_id ❌
     │
     ▼
┌─────────────┐
│ PostgreSQL  │
│  (Public)   │ ◄─── Anyone can read! ❌
└─────────────┘
     │
     │ 3. Trigger Edge Function
     │
     ▼
┌──────────────────┐
│ generate-summary │
│  (Deno Function) │
└────┬─────────────┘
     │
     │ 4. Call OpenAI API
     │
     ▼
┌──────────┐
│ OpenAI   │
│   API    │
└────┬─────┘
     │
     │ 5. Return summary
     │
     ▼
┌─────────────┐
│ PostgreSQL  │
│ UPDATE task │
└─────────────┘
```

### Target Data Flow (Secure)

```
TASK CREATION FLOW (Target - With Auth)
═══════════════════════════════════════

┌──────────┐
│ Browser  │
│ (React)  │
└────┬─────┘
     │
     │ 1. POST /api/tasks
     │    Authorization: Bearer <JWT> ✅
     │    { taskName, description, ... }
     │
     ▼
┌────────────────┐
│ API Worker     │
│ (Auth Check)   │
└────┬───────────┘
     │
     │ 2. Verify JWT
     │    Extract user_id ✅
     │
     ▼
┌────────────────┐
│   KV Store     │
│ (Session)      │
└────┬───────────┘
     │
     │ 3. Valid? → Continue
     │    Invalid? → 401 Unauthorized
     │
     ▼
┌────────────────┐
│  D1 Database   │
│  INSERT task   │
│  user_id = X ✅ │
└────┬───────────┘
     │
     │ 4. Queue AI Summary Job
     │
     ▼
┌────────────────┐
│ Cloudflare     │
│    Queue       │
└────┬───────────┘
     │
     │ 5. Process async
     │
     ▼
┌────────────────┐
│ AI Worker      │
│ (Consumer)     │
└────┬───────────┘
     │
     │ 6. Call OpenAI
     │
     ▼
┌──────────┐
│ OpenAI   │
│   API    │
└────┬─────┘
     │
     │ 7. Return summary
     │
     ▼
┌────────────────┐
│  D1 Database   │
│ UPDATE task    │
│ WHERE user_id=X ✅
└────────────────┘
```

### Authentication Flow

```
USER SIGNUP & LOGIN FLOW
═════════════════════════

SIGNUP:
───────

┌──────────┐
│ Browser  │
└────┬─────┘
     │
     │ POST /api/auth/signup
     │ { email, password, name }
     │
     ▼
┌────────────────┐
│ Auth Worker    │
└────┬───────────┘
     │
     │ 1. Validate email format
     │ 2. Check if email exists
     │
     ▼
┌────────────────┐
│  D1 Database   │
│ SELECT user    │
└────┬───────────┘
     │
     │ Email exists? → 409 Conflict
     │ New? → Continue
     │
     ▼
┌────────────────┐
│ Auth Worker    │
│ Hash password  │
│ (bcrypt)       │
└────┬───────────┘
     │
     │ 3. Store user
     │
     ▼
┌────────────────┐
│  D1 Database   │
│ INSERT user    │
└────┬───────────┘
     │
     │ 4. Success → 201
     │
     ▼
┌──────────┐
│ Browser  │
│ Redirect │
│ to Login │
└──────────┘


LOGIN:
──────

┌──────────┐
│ Browser  │
└────┬─────┘
     │
     │ POST /api/auth/login
     │ { email, password }
     │
     ▼
┌────────────────┐
│ Auth Worker    │
└────┬───────────┘
     │
     │ 1. Fetch user by email
     │
     ▼
┌────────────────┐
│  D1 Database   │
│ SELECT user    │
└────┬───────────┘
     │
     │ User not found? → 401
     │ Found? → Verify password
     │
     ▼
┌────────────────┐
│ Auth Worker    │
│ Verify hash    │
└────┬───────────┘
     │
     │ Invalid? → 401 Unauthorized
     │ Valid? → Generate JWT
     │
     ▼
┌────────────────┐
│ Auth Worker    │
│ Sign JWT       │
│ { userId, exp }│
└────┬───────────┘
     │
     │ 2. Store session in KV
     │
     ▼
┌────────────────┐
│   KV Store     │
│ PUT session    │
│ TTL: 7 days    │
└────┬───────────┘
     │
     │ 3. Return token
     │
     ▼
┌──────────┐
│ Browser  │
│ Store in │
│ localStorage
└──────────┘
```

### Complete Request Flow with Auth

```
AUTHENTICATED API REQUEST FLOW
══════════════════════════════

┌──────────────┐
│   Browser    │
│  localStorage│
│  token: ABC  │
└──────┬───────┘
       │
       │ GET /api/tasks
       │ Authorization: Bearer ABC
       │
       ▼
┌──────────────────┐
│  Cloudflare CDN  │
│   (Edge Cache)   │
└──────┬───────────┘
       │
       │ Cache miss → Forward to Worker
       │
       ▼
┌──────────────────┐
│   API Worker     │
│  (Entry Point)   │
└──────┬───────────┘
       │
       │ 1. Extract JWT from header
       │
       ▼
┌──────────────────┐
│ Auth Middleware  │
└──────┬───────────┘
       │
       │ 2. Verify JWT signature
       │
       ▼
┌──────────────────┐
│   KV Store       │
│ GET session:ABC  │
└──────┬───────────┘
       │
       │ Session valid?
       │  ├─ No  → 401 Unauthorized
       │  └─ Yes → Extract user_id
       │
       ▼
┌──────────────────┐
│   API Worker     │
│ req.userId = X   │
└──────┬───────────┘
       │
       │ 3. Query database
       │    WHERE user_id = X
       │
       ▼
┌──────────────────┐
│  D1 Database     │
│ SELECT * FROM    │
│ tasks            │
│ WHERE user_id=X  │
└──────┬───────────┘
       │
       │ 4. Return user's data only
       │
       ▼
┌──────────────────┐
│   Browser        │
│ Render tasks     │
└──────────────────┘
```

### Email Queue Flow

```
EMAIL SENDING FLOW (Async with Queue)
══════════════════════════════════════

┌──────────────┐
│ Task Complete│
│   Worker     │
└──────┬───────┘
       │
       │ 1. Task marked complete
       │
       ▼
┌──────────────────┐
│ Queue Message    │
│ {                │
│   type: 'email'  │
│   userId: X      │
│   taskId: Y      │
│   template:      │
│   'completed'    │
│ }                │
└──────┬───────────┘
       │
       │ 2. Send to Queue
       │    (Non-blocking)
       │
       ▼
┌──────────────────┐
│ Cloudflare Queue │
│ (Async)          │
└──────┬───────────┘
       │
       │ 3. Return 200 OK immediately
       │    (User doesn't wait)
       │
       ▼
┌──────────────────┐
│   Browser        │
│ "Task completed!"│
└──────────────────┘


Meanwhile, in background:
─────────────────────────

┌──────────────────┐
│ Cloudflare Queue │
└──────┬───────────┘
       │
       │ 4. Trigger consumer
       │
       ▼
┌──────────────────┐
│ Email Consumer   │
│    Worker        │
└──────┬───────────┘
       │
       │ 5. Fetch task details
       │
       ▼
┌──────────────────┐
│  D1 Database     │
│ SELECT task      │
│ WHERE id = Y     │
└──────┬───────────┘
       │
       │ 6. Build email HTML
       │
       ▼
┌──────────────────┐
│ Email Consumer   │
│ Render template  │
└──────┬───────────┘
       │
       │ 7. Send via SendGrid/Resend
       │
       ▼
┌──────────────────┐
│   SendGrid API   │
│   or Resend API  │
└──────┬───────────┘
       │
       │ 8. Success/Failure
       │
       ▼
┌──────────────────┐
│ Email Consumer   │
│ message.ack()    │
└──────────────────┘
       │
       │ Retry on failure (auto)
       │ Max 3 retries
       │
       └─ Dead Letter Queue
```

### Frontend ↔ Backend Communication

```
COMPLETE FRONTEND-BACKEND ARCHITECTURE
═══════════════════════════════════════

┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                      │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Login.tsx  │  │TaskForm.tsx  │  │TaskList.tsx  │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                 │                 │          │
│         └─────────────────┼─────────────────┘          │
│                           │                            │
│                ┌──────────▼──────────┐                 │
│                │   api/client.ts     │                 │
│                │                     │                 │
│                │ • fetch wrapper     │                 │
│                │ • add auth headers  │                 │
│                │ • handle errors     │                 │
│                └──────────┬──────────┘                 │
└───────────────────────────┼────────────────────────────┘
                            │
                            │ HTTPS
                            │
┌───────────────────────────▼────────────────────────────┐
│            CLOUDFLARE EDGE (Workers)                    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │           Router Worker (Hono)                   │  │
│  │                                                  │  │
│  │  POST   /api/auth/signup    → signup-worker    │  │
│  │  POST   /api/auth/login     → login-worker     │  │
│  │  POST   /api/auth/logout    → logout-worker    │  │
│  │                                                  │  │
│  │  GET    /api/tasks          → get-tasks        │  │
│  │  POST   /api/tasks          → create-task      │  │
│  │  PATCH  /api/tasks/:id      → update-task      │  │
│  │  DELETE /api/tasks/:id      → delete-task      │  │
│  │                                                  │  │
│  │  GET    /api/sessions       → get-sessions     │  │
│  │  POST   /api/sessions       → clock-in         │  │
│  │  PATCH  /api/sessions/:id   → clock-out        │  │
│  │                                                  │  │
│  │  GET    /api/integrations   → list-integrations│  │
│  │  POST   /api/integrations   → create-integration│ │
│  └───────────────┬─────────────────────────────────┘  │
│                  │                                     │
│   ┌──────────────▼──────────────┐                     │
│   │    Auth Middleware          │                     │
│   │                              │                     │
│   │  1. Extract JWT              │                     │
│   │  2. Verify signature         │                     │
│   │  3. Check KV session         │                     │
│   │  4. Attach userId to req     │                     │
│   └──────────────┬───────────────┘                     │
│                  │                                     │
└──────────────────┼─────────────────────────────────────┘
                   │
    ┌──────────────┼──────────────┐
    │              │              │
    ▼              ▼              ▼
┌────────┐    ┌────────┐    ┌─────────┐
│   D1   │    │   KV   │    │  Queue  │
│        │    │        │    │         │
│ users  │    │session │    │ email   │
│ tasks  │    │cache   │    │ jobs    │
│ config │    │rate    │    │         │
└────────┘    └────────┘    └─────────┘
```

### API Endpoints Comparison

```
BEFORE (Supabase) vs AFTER (Cloudflare)
════════════════════════════════════════

BEFORE:
───────
Supabase Client → Direct Database Access
❌ No API routes
❌ No authentication
❌ No rate limiting
❌ No request validation

Frontend:
  const { data } = await supabase
    .from('tasks')
    .select('*');
  // Returns ALL users' tasks! ❌


AFTER:
──────
REST API with proper routing

┌──────────────────────────────────────────────────────┐
│                  API ENDPOINTS                        │
├──────────────────────────────────────────────────────┤
│ AUTHENTICATION                                        │
├──────────────────────────────────────────────────────┤
│ POST   /api/auth/signup                              │
│        Body: { email, password, name }               │
│        Returns: { userId, message }                  │
│                                                      │
│ POST   /api/auth/login                               │
│        Body: { email, password }                     │
│        Returns: { token, user }                      │
│                                                      │
│ POST   /api/auth/logout                              │
│        Headers: Authorization: Bearer <token>        │
│        Returns: { message }                          │
│                                                      │
│ GET    /api/auth/me                                  │
│        Headers: Authorization: Bearer <token>        │
│        Returns: { user }                             │
├──────────────────────────────────────────────────────┤
│ TASKS (Protected - requires auth)                    │
├──────────────────────────────────────────────────────┤
│ GET    /api/tasks                                    │
│        Query: ?status=in_progress                    │
│        Returns: [ { id, taskName, ... } ]           │
│                                                      │
│ POST   /api/tasks                                    │
│        Body: { taskName, description, ... }          │
│        Returns: { task }                             │
│                                                      │
│ PATCH  /api/tasks/:id                                │
│        Body: { status: 'completed', notes }          │
│        Returns: { task }                             │
│                                                      │
│ DELETE /api/tasks/:id                                │
│        Returns: { message }                          │
├──────────────────────────────────────────────────────┤
│ TIME SESSIONS (Protected)                            │
├──────────────────────────────────────────────────────┤
│ GET    /api/sessions                                 │
│        Returns: [ { id, clockIn, clockOut, ... } ]  │
│                                                      │
│ POST   /api/sessions/clock-in                        │
│        Returns: { sessionId }                        │
│                                                      │
│ POST   /api/sessions/clock-out/:id                   │
│        Returns: { session, report }                  │
├──────────────────────────────────────────────────────┤
│ INTEGRATIONS (Protected)                             │
├──────────────────────────────────────────────────────┤
│ GET    /api/integrations                             │
│        Returns: [ { type, isActive, ... } ]         │
│                                                      │
│ POST   /api/integrations/:type                       │
│        Body: { apiKey, config }                      │
│        Returns: { integration }                      │
│                                                      │
│ DELETE /api/integrations/:type                       │
│        Returns: { message }                          │
└──────────────────────────────────────────────────────┘

Frontend (After):
  const response = await fetch('/api/tasks', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  const tasks = await response.json();
  // Returns only current user's tasks! ✅
```

---

## Testing Strategy

See [TESTING_STRATEGY.md](./docs/TESTING_STRATEGY.md) for detailed test plans.

### Testing Phases

1. **Unit Tests** - Test individual Workers
2. **Integration Tests** - Test Worker → D1 → KV flow
3. **E2E Tests** - Test complete user flows
4. **Load Tests** - Verify performance under load
5. **Security Tests** - Penetration testing, auth bypass attempts

---

## Rollback Plan

### Rollback Triggers

- Authentication failures affecting >5% of requests
- Data loss or corruption
- Performance degradation >50%
- Security breach detected

### Rollback Steps

1. **Immediate:** Route traffic back to Supabase via DNS
2. **Database:** Restore from Supabase backup
3. **Frontend:** Revert to previous deployment
4. **Monitoring:** Identify root cause
5. **Fix & Retry:** Address issues and redeploy

---

## Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Cold Start Time | 50-100ms | <5ms | Cloudflare Analytics |
| API Response Time | 200-500ms | <100ms | Worker metrics |
| Auth Success Rate | N/A | >99.9% | Auth logs |
| Data Isolation | 0% | 100% | Security audit |
| Uptime | ? | 99.9% | Cloudflare uptime |
| Cost per 1M requests | ~$25 | ~$5 | Billing dashboard |

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Set up Cloudflare account** and billing
3. **Create development environment**
4. **Begin Phase 1:** Database migration
5. **Schedule regular check-ins** (daily standups)

---

## Additional Documentation

- [DATABASE_MIGRATION.md](./docs/DATABASE_MIGRATION.md)
- [AUTHENTICATION_SETUP.md](./docs/AUTHENTICATION_SETUP.md)
- [WORKERS_MIGRATION.md](./docs/WORKERS_MIGRATION.md)
- [FRONTEND_MIGRATION.md](./docs/FRONTEND_MIGRATION.md)
- [DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md)
- [TESTING_STRATEGY.md](./docs/TESTING_STRATEGY.md)
- [API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md)
- [SECURITY_CHECKLIST.md](./docs/SECURITY_CHECKLIST.md)

---

**Last Updated:** 2025-10-12
**Author:** Migration Team
**Status:** Ready for Review
