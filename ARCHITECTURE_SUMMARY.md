# Quick Reference: Task Manager Architecture

## One-Minute Overview

**Workoto** is a full-stack task management SaaS with:
- **Frontend**: React 18 + TypeScript on Vite (http://localhost:5173)
- **Backend**: Cloudflare Workers + Hono.js (task-manager-api-dev.workers.dev)
- **Database**: SQLite D1 with 8+ migrations
- **Real-Time**: WebSocket chat via Durable Objects
- **Auth**: JWT tokens, stored in localStorage

## Stack

```
Frontend              Backend              Database
────────              ──────              ────────
React 18             Hono.js             D1 SQLite
TypeScript           Cloudflare          8 Tables
Tailwind CSS         Workers             20+ Migrations
React Router         bcryptjs            25+ Indexes
Fetch API            JWT                 6 Foreign Keys
```

## 5 Key Directories to Know

1. **`src/components/`** (46 components)
   - TaskList, TaskForm, ChatBubble, ClockInOut, TeamDashboard
   
2. **`src/context/`** (4 providers)
   - AuthContext, WorkspaceContext, TaskTimerContext, ToastContext
   
3. **`cloudflare-workers/src/workers/`** (20 route files)
   - auth.ts, tasks.ts, workspaces.ts, chat.ts, time-sessions.ts, etc.
   
4. **`cloudflare-workers/migrations/`** (6 SQL files)
   - Core tables → Team features → Activity tracking → Recurring tasks
   
5. **`src/lib/api-client.ts`** (Single HTTP client)
   - 50+ methods for all API endpoints

## Authentication Flow

```
Login →
  POST /api/auth/login
    ↓ Backend verifies password, generates JWT
  ← { token, user }
  
Store token in localStorage
Add to API headers: Authorization: Bearer <token>

Logout →
  Clear localStorage
  Redirect to /
```

## 3 Major Features

### 1. Task Management
- Create/update/delete tasks
- Assign to team members
- Status: in_progress → completed
- Filter by workspace, priority, assignee

### 2. Time Tracking
- Clock in/out on tasks
- Pause/resume sessions
- Track total time spent
- View time reports by user/workspace

### 3. Team Collaboration
- Create workspaces (separate teams)
- Invite members via email tokens
- Role-based permissions (owner/admin/member)
- Real-time chat per workspace

## Database Schema (Simplified)

```
users
  ↓ (owns)
workspaces
  ↓ (contains)
workspace_members (role: owner/admin/member)
  ↓ (assigned to)
tasks (with recurring_pattern_id reference)
  ↓ (tracked by)
time_sessions (pause/resume tracked)

+ settings, integrations, activity_logs, recurring_patterns, invoices
```

## API Endpoints (Major)

```
Auth:          POST /api/auth/signup|login|logout
Tasks:         GET|POST|PATCH|DELETE /api/tasks/:id
Time:          POST /api/time-sessions/start|pause|resume
Workspaces:    GET|POST|PATCH|DELETE /api/workspaces/:id
Invitations:   POST /api/invitations/:token/accept|decline
Chat:          WebSocket /api/chat/workspace/:id/connect
Recurring:     POST|GET|PATCH /api/recurring-tasks/:id
```

## Running Locally

```bash
# Terminal 1: Frontend
cd task-manager
npm install
npm run dev                    # http://localhost:5173

# Terminal 2: Backend
cd cloudflare-workers
npm install
npm run dev                    # http://localhost:8787

# Database: Auto-synced from migrations
# Secrets: Ask maintainer for JWT_SECRET, etc.
```

## New Developer Checklist

- [ ] Read this file (2 min)
- [ ] Read CLAUDE.md (30 min) - Full architecture guide
- [ ] Read `docs/AUTHENTICATION_SETUP.md` - Secrets setup
- [ ] Read `docs/DATABASE_MIGRATION.md` - Schema overview
- [ ] Read `docs/DEPLOYMENT_GUIDE.md` - How to deploy
- [ ] Check out `src/App.tsx` - Main routing
- [ ] Check out `src/context/AuthContext.tsx` - Auth state
- [ ] Check out `src/lib/api-client.ts` - HTTP client
- [ ] Check out `cloudflare-workers/src/index.ts` - Backend routes
- [ ] Check out `cloudflare-workers/src/workers/tasks.ts` - Example worker

## Common Tasks

### Add a New API Endpoint
1. Create worker: `cloudflare-workers/src/workers/feature.ts`
2. Mount in `cloudflare-workers/src/index.ts`
3. Add method to `src/lib/api-client.ts`
4. Call from component: `await apiClient.method()`

### Add a New Table
1. Create migration: `cloudflare-workers/migrations/NNN_description.sql`
2. Run locally: `wrangler d1 execute <DB> < migration.sql`
3. Deploy: `wrangler db migrations list` (check it applied)

### Debug Backend
```bash
cd cloudflare-workers
npm run dev                    # Watch local changes
wrangler tail                  # Stream live logs
```

### Deploy
```bash
# Frontend
npm run build
# Auto-deployed via Cloudflare Pages

# Backend
cd cloudflare-workers
npm run deploy                 # Dev environment
npm run deploy:prod            # Production
```

## Key Patterns

- **Context API** for global state (no Redux)
- **Custom Hooks** for reusable logic (useChatWebSocket, useActivityTracker)
- **API Client** pattern (single class, all HTTP methods)
- **Role-Based Access Control** (middleware checks user.role)
- **Message Queues** for async work (emails, AI)
- **Durable Objects** for stateful WebSockets (chat rooms)
- **JWT Tokens** for auth (stateless, secure)

## Architecture Decisions

| Decision | Why |
|----------|-----|
| Cloudflare Workers | Serverless, low cost, global edge network |
| SQLite D1 | Simple, fast, no DB scaling headaches |
| Durable Objects | Stateful WebSockets without polling |
| Context API | Small app, no external state library needed |
| localStorage tokens | Simple, works offline (trade-off: XSS vulnerable) |
| Hono.js | Lightweight, fast routing, good typing |

## Recent Changes (Oct 2025)

- [x] Activity tracking (May 2025)
- [x] Session pause/resume (Oct 21)
- [x] Recurring task patterns (Oct 23)
- [x] ChatBubble duplicate detection fix
- [ ] Recurring task UI (TaskFormModal)
- [ ] Auto-generation system (cron trigger)
- [ ] Calendar view recurring indicators

## Deployment Status

**Frontend**: Live at https://www.workoto.app  
**Backend**: Deployed to Cloudflare Workers  
**Database**: D1 live, migrations applied  
**Monitoring**: Wrangler tail active  

## Contact / Questions

See `docs/` for detailed guides on:
- AUTHENTICATION_SETUP.md
- DATABASE_MIGRATION.md
- DEPLOYMENT_GUIDE.md
- CHAT_SYSTEM.md
- RECURRING_TASKS_FEATURE.md
- ACTIVITY_TRACKING_FEATURE.md

---

**Last Updated:** October 23, 2025
**Created for:** Claude Code / Future Developers
