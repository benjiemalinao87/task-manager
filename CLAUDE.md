# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Quick Reference Commands

### Frontend Development
```bash
npm run dev          # Start dev server at http://localhost:5173
npm run build        # Build for production (outputs to dist/)
npm run preview      # Preview production build
npm run typecheck    # TypeScript type checking without emit
npm run lint         # Run ESLint
```

### Backend Development (Cloudflare Workers)
```bash
cd cloudflare-workers

npm run dev          # Start local Wrangler dev server at http://localhost:8787
npm run deploy       # Deploy to development environment (task-manager-api-dev)
npm run deploy:prod  # Deploy to production environment
npm run tail         # Stream live logs from deployed worker
npm run typecheck    # TypeScript type checking
```

### Database Management (D1)
```bash
cd cloudflare-workers

# Apply migrations
wrangler d1 execute task-manager-dev --file=migrations/001_add_team_features.sql
wrangler d1 execute task-manager-dev --file=migrations/006_add_recurring_tasks.sql

# Execute SQL directly
wrangler d1 execute task-manager-dev --command="SELECT * FROM users LIMIT 5"

# Local development database
wrangler d1 execute task-manager-dev --local --command="SELECT * FROM tasks"
```

### Managing Secrets
```bash
cd cloudflare-workers

wrangler secret put JWT_SECRET        # Generate with: openssl rand -base64 32
wrangler secret put OPENAI_API_KEY
wrangler secret put SENDGRID_API_KEY
wrangler secret put RESEND_API_KEY    # Optional
```

---

## Architecture Overview

**Workoto** is a full-stack task management application with real-time collaboration features.

### Stack
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + Radix UI
- **Backend:** Cloudflare Workers (Hono.js framework)
- **Database:** D1 (SQLite)
- **Real-time:** Durable Objects for WebSocket chat
- **Queue:** Message Queues for emails and AI processing
- **Hosting:** Cloudflare Pages (frontend) + Workers (backend)

### Architecture Pattern
```
React Frontend (localhost:5173 | workoto.app)
           ↓ HTTP/WebSocket + JWT Auth
Cloudflare Workers API (Hono.js)
           ↓
┌──────────┴────────────┐
│                       │
D1 Database      Durable Objects (Chat)
(SQLite)         Message Queues (Email/AI)
                 KV Storage (Token invalidation)
```

### Directory Structure
```
task-manager/
├── src/                          # Frontend React app
│   ├── components/               # 46+ React components
│   │   ├── auth/                 # Login, Signup, AuthPage
│   │   ├── TaskList.tsx          # Main task display
│   │   ├── TaskFormModal.tsx     # Task creation/editing modal
│   │   ├── ClockInOut.tsx        # Time tracking UI
│   │   ├── ChatBubble.tsx        # WebSocket chat interface
│   │   ├── CalendarView.tsx      # Recurring tasks calendar
│   │   └── TeamDashboard.tsx     # Team management
│   ├── context/                  # React Context providers
│   │   ├── AuthContext.tsx       # Authentication state
│   │   ├── WorkspaceContext.tsx  # Workspace selection
│   │   ├── TaskTimerContext.tsx  # Time tracking state
│   │   └── ToastContext.tsx      # Toast notifications
│   ├── hooks/                    # Custom React hooks
│   │   ├── useChatWebSocket.ts   # WebSocket connection logic
│   │   └── useActivityTracker.ts # Activity/idle tracking
│   ├── lib/                      # Utilities
│   │   ├── api-client.ts         # HTTP client (all API methods)
│   │   ├── database.types.ts     # TypeScript types
│   │   └── dateUtils.ts          # Date helpers
│   ├── App.tsx                   # Main app with routing
│   └── main.tsx                  # React entry point
│
├── cloudflare-workers/           # Backend API
│   ├── src/
│   │   ├── index.ts              # Hono app, route mounting
│   │   ├── durable-objects/
│   │   │   └── ChatRoom.ts       # WebSocket chat room
│   │   ├── middleware/
│   │   │   └── auth.ts           # JWT auth middleware
│   │   ├── workers/              # API route handlers (20+ files)
│   │   │   ├── auth.ts           # Signup/login/logout
│   │   │   ├── tasks.ts          # Task CRUD
│   │   │   ├── time-sessions.ts  # Time tracking
│   │   │   ├── workspaces.ts     # Workspace management
│   │   │   ├── invitations.ts    # Team invitations
│   │   │   ├── chat.ts           # Chat WebSocket upgrade
│   │   │   ├── recurring-tasks.ts # Recurring task patterns
│   │   │   └── activity.ts       # Activity tracking
│   │   └── types/                # TypeScript interfaces
│   ├── migrations/               # SQL migrations (v001-006+)
│   │   ├── 001_add_team_features.sql
│   │   ├── 004_add_pause_resume_to_time_sessions.sql
│   │   ├── 005_add_activity_tracking.sql
│   │   └── 006_add_recurring_tasks.sql
│   ├── wrangler.toml             # Cloudflare Workers config
│   └── package.json
│
├── docs/                         # 49+ documentation files
├── vite.config.ts                # Vite bundler config
├── tailwind.config.js            # Tailwind CSS config
└── package.json                  # Frontend dependencies
```

---

## Key Concepts

### 1. Authentication Flow

**JWT-based authentication** with bcrypt password hashing.

- **Signup:** Creates user → settings → default workspace → auto-joins pending invitations
- **Login:** Returns JWT token stored in `localStorage['auth_token']`
- **Authenticated Requests:** All API calls include `Authorization: Bearer <token>` header
- **Middleware:** `requireAuth()` in [cloudflare-workers/src/middleware/auth.ts](cloudflare-workers/src/middleware/auth.ts) verifies JWT and extracts `userId`

**Token storage:** Browser localStorage (not HttpOnly cookies)

### 2. Workspace System (Multi-tenancy)

Users can belong to multiple workspaces with different roles:
- **Owner:** Full control (delete workspace, manage all members)
- **Admin:** Manage members, see all tasks
- **Member:** Limited access (only assigned tasks + own tasks)

**Workspace Context** ([src/context/WorkspaceContext.tsx](src/context/WorkspaceContext.tsx)) manages current workspace selection and filters all API requests.

**Invitation Flow:**
1. Admin/Owner sends invite → generates unique token → email sent via queue
2. Invitee clicks link → accepts invitation → added to workspace
3. If user doesn't exist, token saved → auto-accepts on signup

### 3. Real-Time Chat (Durable Objects)

WebSocket chat is implemented using Cloudflare Durable Objects ([cloudflare-workers/src/durable-objects/ChatRoom.ts](cloudflare-workers/src/durable-objects/ChatRoom.ts)).

**Connection Flow:**
```
Frontend (useChatWebSocket hook)
    ↓ WebSocket upgrade at /api/chat/workspace/:id/connect?token=...
ChatRoom Durable Object
    ↓ Authenticates, sends history, broadcasts
All connected clients in workspace
```

**Message Types:**
- `message` - User sends chat message
- `new_message` - Server broadcasts to all clients
- `history` - Initial message history on connect
- `online_users` - List of connected users
- `user_joined` / `user_left` - User presence updates

**Duplicate Prevention:** Client-side deduplication using `seenMessageIdsRef` set to prevent showing duplicate messages on reconnect.

**Reconnection:** Exponential backoff (max 5 attempts) with automatic reconnection on connection drop.

### 4. Time Tracking with Pause/Resume

Time sessions track work duration on tasks:
- **Clock In:** Creates active session linked to task
- **Pause:** Pauses timer, records `paused_at`
- **Resume:** Resumes timer, tracks `total_paused_minutes`
- **Clock Out:** Completes session, calculates total time (excluding pauses)

**State:** Managed in `TaskTimerContext` ([src/context/TaskTimerContext.tsx](src/context/TaskTimerContext.tsx))

**Database:** `time_sessions` table with fields: `started_at`, `ended_at`, `paused_at`, `resumed_at`, `total_paused_minutes`, `status`

### 5. Recurring Tasks

Create task patterns that auto-generate instances on schedule.

**Pattern Types:**
- Daily (every X days)
- Weekly (specific days: "Every Tuesday and Thursday")
- Monthly (day of month: "15th of every month")
- Yearly
- Custom intervals

**Key Fields:**
- `frequency` - daily/weekly/monthly/yearly
- `interval` - repeat every X units
- `days_of_week` - JSON array for weekly: `["monday", "friday"]`
- `day_of_month` - 1-31 for monthly
- `start_date`, `end_date` - schedule boundaries
- `occurrences_limit` - max instances to generate
- `next_occurrence_date` - calculated next generation date

**API:** [cloudflare-workers/src/workers/recurring-tasks.ts](cloudflare-workers/src/workers/recurring-tasks.ts)

**Frontend:** Create via `TaskFormModal` with recurring options, view in `CalendarView`

### 6. Activity Tracking

Tracks user activity and idle time for productivity insights.

**Tracked Events:**
- Task created/completed
- Time tracked
- User invitations
- Idle time periods
- Activity bursts

**Database:** `activity_logs` table with `activity_type`, `data` (JSON), `user_id`, `workspace_id`

---

## API Client Pattern

All API calls go through centralized client: [src/lib/api-client.ts](src/lib/api-client.ts)

```typescript
// Example: Creating a task
const task = await apiClient.createTask({
  title: 'My Task',
  description: 'Task description',
  workspace_id: currentWorkspace.id,
  assigned_to: userId,
  priority: 'high'
});

// Example: Clock in
const session = await apiClient.clockIn(taskId);

// Example: Send workspace invitation
await apiClient.sendInvitation('user@example.com', workspaceId, 'member');
```

**Auto-authentication:** Client automatically adds JWT token from localStorage to all requests.

**Error handling:** 401 responses clear localStorage and redirect to login.

---

## Database Schema (Key Tables)

### users
- `id`, `email`, `password_hash`, `name`, `created_at`, `updated_at`

### workspaces
- `id`, `name`, `owner_id` (→ users.id), `created_at`, `updated_at`

### workspace_members
- `id`, `workspace_id` (→ workspaces.id), `user_id` (→ users.id), `role` (owner/admin/member), `invited_by`, `joined_at`
- Unique constraint: (workspace_id, user_id)

### workspace_invitations
- `id`, `workspace_id`, `email`, `role`, `invited_by`, `token` (unique), `status` (pending/accepted/declined/expired), `expires_at`

### tasks
- `id`, `user_id` (creator), `workspace_id`, `title`, `description`, `status` (in_progress/completed/pending)
- `estimated_time`, `task_link`, `priority` (low/medium/high/urgent)
- `assigned_to`, `assigned_by`, `assigned_at`
- `is_recurring` (0|1), `recurring_pattern_id`, `recurrence_instance_date`
- `completed_at`, `completed_by`, `time_spent_minutes`
- **Indexes:** user_id, workspace_id, status, assigned_to, is_recurring

### time_sessions
- `id`, `task_id`, `user_id`, `workspace_id`, `started_at`, `ended_at`
- `paused_at`, `resumed_at`, `total_paused_minutes`, `status` (active/paused/completed), `notes`
- **Indexes:** task_id, user_id, status

### recurring_patterns
- `id`, `user_id`, `workspace_id`, `task_name`, `description`, `estimated_time`, `priority`, `assigned_to`
- `frequency` (daily/weekly/monthly/yearly/custom), `interval`, `days_of_week` (JSON), `day_of_month`, `time_of_day`
- `start_date`, `end_date`, `occurrences_limit`, `occurrences_count`
- `is_active` (0|1), `last_generated_date`, `next_occurrence_date`
- **Indexes:** next_occurrence_date, is_active

### settings
- `id`, `user_id` (unique), `default_email`, `onboarding_completed` (0|1), `invoice_module_enabled` (0|1)

### integrations
- `id`, `user_id`, `type` (asana/resend/sendgrid), `api_key` (encrypted), `is_active` (0|1)

### activity_logs
- `id`, `user_id`, `workspace_id`, `activity_type`, `data` (JSON), `created_at`

### invoices (Optional Module)
- `id`, `workspace_id`, `created_by`, `invoice_number` (unique), `total_amount`, `status` (draft/sent/paid)

### invoice_items
- `id`, `invoice_id`, `description`, `quantity`, `unit_price`, `amount`

---

## Backend API Routes

All routes mounted in [cloudflare-workers/src/index.ts](cloudflare-workers/src/index.ts)

### Authentication (`/api/auth`)
- `POST /api/auth/signup` - Create account (email, password, name)
- `POST /api/auth/login` - Login (returns JWT token)
- `POST /api/auth/logout` - Logout (invalidates token)
- `GET /api/auth/me` - Get current user (requires auth)

### Tasks (`/api/tasks`)
- `GET /api/tasks` - List tasks (filters: status, workspaceId, assignedTo, dateFrom, dateTo)
- `POST /api/tasks` - Create task
- `GET /api/tasks/:id` - Get task details
- `PATCH /api/tasks/:id` - Update task
- `POST /api/tasks/:id/complete` - Mark complete
- `DELETE /api/tasks/:id` - Delete task

### Workspaces (`/api/workspaces`)
- `GET /api/workspaces` - List user's workspaces
- `POST /api/workspaces` - Create workspace
- `PATCH /api/workspaces/:id` - Update workspace
- `DELETE /api/workspaces/:id` - Delete workspace (owner only)
- `GET /api/workspaces/:id/reports` - Time reports

### Invitations (`/api/workspaces/:id/invite`, `/api/invitations`)
- `POST /api/workspaces/:id/invite` - Send invitation (email, role)
- `GET /api/invitations/pending` - List pending invitations for user
- `POST /api/invitations/:token/accept` - Accept invitation
- `POST /api/invitations/:token/decline` - Decline invitation

### Time Sessions (`/api/time-sessions`)
- `POST /api/time-sessions/start` - Clock in (task_id)
- `PATCH /api/time-sessions/:id` - Clock out (notes)
- `PATCH /api/time-sessions/:id/pause` - Pause session
- `PATCH /api/time-sessions/:id/resume` - Resume session
- `GET /api/time-sessions` - List sessions

### Chat (`/api/chat`)
- `GET /api/chat/workspace/:id/connect` - WebSocket upgrade (query param: token)

### Recurring Tasks (`/api/recurring-tasks`)
- `POST /api/recurring-tasks` - Create pattern
- `GET /api/recurring-tasks` - List patterns
- `GET /api/recurring-tasks/:id` - Get pattern details
- `PATCH /api/recurring-tasks/:id` - Update pattern
- `DELETE /api/recurring-tasks/:id` - Deactivate pattern
- `POST /api/recurring-tasks/:id/generate` - Manually generate next instance
- `GET /api/recurring-tasks/:id/instances` - Get all instances

### Activity (`/api/activity`)
- `POST /api/activity` - Track activity event
- `GET /api/activity` - Get activity log

### Settings (`/api/settings`)
- `GET /api/settings` - Get user settings
- `PATCH /api/settings` - Update settings

### Integrations (`/api/integrations`)
- `GET /api/integrations/:type` - Get integration config (asana/resend/sendgrid)
- `POST /api/integrations/:type` - Save integration config

### Health
- `GET /health` - Health check endpoint

---

## Frontend Routing

Routes defined in [src/App.tsx](src/App.tsx)

```
/                                  → Landing page
/auth                              → Login/Signup page
/onboarding                        → Onboarding (notifications + invites)
/task-manager (protected)          → Main app with tabs:
  - Tab: "Manager" (TaskList)
  - Tab: "Calendar" (CalendarView)
  - Tab: "History" (TaskHistory)
  - Tab: "Invoices" (Invoices) [if enabled]
/team-dashboard (protected)        → Team management view
/team-management (protected)       → Manage members
/accept-invitation/:token          → Accept workspace invitation (public)
```

**Protected Routes:** Redirect to `/auth` if `localStorage['auth_token']` is missing.

---

## Context Providers (Global State)

**AuthContext** ([src/context/AuthContext.tsx](src/context/AuthContext.tsx))
```typescript
{
  user: { id, email, name },
  token: string,
  isAuthenticated: boolean,
  isLoading: boolean,
  needsOnboarding: boolean,
  login(email, password),
  signup(email, password, name),
  logout(),
  completeOnboarding(),
  checkOnboardingStatus()
}
```

**WorkspaceContext** ([src/context/WorkspaceContext.tsx](src/context/WorkspaceContext.tsx))
```typescript
{
  workspaces: Workspace[],
  currentWorkspace: Workspace,
  isLoading: boolean,
  error: string,
  switchWorkspace(id),
  refreshWorkspaces(),
  createWorkspace(name),
  updateWorkspace(id, name),
  deleteWorkspace(id)
}
```

**TaskTimerContext** ([src/context/TaskTimerContext.tsx](src/context/TaskTimerContext.tsx))
```typescript
{
  activeSession: TimeSession | null,
  isTracking: boolean,
  isPaused: boolean,
  startTracking(taskId),
  pauseTracking(),
  resumeTracking(),
  stopTracking(notes)
}
```

**ToastContext** ([src/context/ToastContext.tsx](src/context/ToastContext.tsx))
```typescript
{
  showToast(message, type),  // type: 'success' | 'error' | 'info'
}
```

---

## Message Queues

### Email Queue (`email-queue-dev`)

**Producer:** Any worker can send email jobs
```typescript
await c.env.EMAIL_QUEUE.send({
  type: 'invitation',
  recipientEmail: 'user@example.com',
  data: { token, workspaceName, inviterName, expiresAt }
});
```

**Consumer:** [cloudflare-workers/src/workers/email-consumer.ts](cloudflare-workers/src/workers/email-consumer.ts)
- Processes batches (max 10 messages)
- Sends emails via SendGrid/Resend
- Handles invitation emails, update notifications

### AI Queue (`ai-queue-dev`)

**Producer:** Chat feature sends AI requests
**Consumer:** [cloudflare-workers/src/workers/ai-consumer.ts](cloudflare-workers/src/workers/ai-consumer.ts)
- Processes batches (max 1 message)
- Calls OpenAI API
- Returns results to requester

---

## Configuration Files

### [vite.config.ts](vite.config.ts)
```typescript
{
  plugins: [react()],
  resolve: {
    alias: { '@': './src' }  // Import with '@/components/...'
  },
  optimizeDeps: {
    exclude: ['lucide-react']
  }
}
```

### [cloudflare-workers/wrangler.toml](cloudflare-workers/wrangler.toml)
```toml
name = "task-manager-api-dev"
main = "src/index.ts"
compatibility_date = "2024-01-01"
account_id = "b386322deca777360835c0f78dae766f"

[vars]
FRONTEND_URL = "https://www.workoto.app"

# Bindings:
# - DB: D1 database (task-manager-dev)
# - CHAT_ROOM: Durable Object for WebSocket chat
# - KV: KV namespace for token invalidation
# - EMAIL_QUEUE: Message queue for emails
# - AI_QUEUE: Message queue for AI processing

# Secrets (set via: wrangler secret put <NAME>):
# - JWT_SECRET
# - OPENAI_API_KEY
# - SENDGRID_API_KEY
# - RESEND_API_KEY
```

---

## Development Workflow

### Local Setup
```bash
# Terminal 1: Frontend
npm install
npm run dev          # → http://localhost:5173

# Terminal 2: Backend
cd cloudflare-workers
npm install
npm run dev          # → http://localhost:8787
```

Frontend automatically connects to local backend during development.

### Adding a New Feature

**1. Database Migration** (if needed)
```bash
cd cloudflare-workers
# Create migration file
echo "ALTER TABLE tasks ADD COLUMN new_field TEXT;" > migrations/007_add_new_field.sql

# Apply locally
wrangler d1 execute task-manager-dev --local --file=migrations/007_add_new_field.sql

# Apply to remote
wrangler d1 execute task-manager-dev --file=migrations/007_add_new_field.sql
```

**2. Backend Worker**
```typescript
// cloudflare-workers/src/workers/my-feature.ts
import { Hono } from 'hono';

const myFeature = new Hono();

myFeature.get('/items', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  const items = await c.env.DB.prepare(
    'SELECT * FROM items WHERE user_id = ?'
  ).bind(auth.userId).all();

  return c.json({ items: items.results });
});

export default myFeature;
```

**3. Mount Route**
```typescript
// cloudflare-workers/src/index.ts
import myFeature from './workers/my-feature';

app.route('/api/my-feature', myFeature);
```

**4. API Client Method**
```typescript
// src/lib/api-client.ts
class ApiClient {
  async getItems() {
    const response = await fetch(`${this.baseUrl}/api/my-feature/items`, {
      headers: this.getAuthHeaders()
    });
    return response.json();
  }
}
```

**5. React Component**
```typescript
// src/components/MyComponent.tsx
import { apiClient } from '@/lib/api-client';

export function MyComponent() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    apiClient.getItems().then(data => setItems(data.items));
  }, []);

  return <div>{items.map(item => <p key={item.id}>{item.name}</p>)}</div>;
}
```

**6. Deploy**
```bash
# Backend
cd cloudflare-workers
npm run deploy

# Frontend (auto-deploys via Cloudflare Pages on git push)
git push origin main
```

---

## Common Patterns

### Role-Based Access Control
```typescript
// In backend worker
const auth = await requireAuth(c.req.raw, c.env);
if (auth instanceof Response) return auth;

// Check workspace membership
const member = await c.env.DB.prepare(
  'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
).bind(workspaceId, auth.userId).first();

if (!member) {
  return c.json({ error: 'Not a workspace member' }, 403);
}

if (member.role === 'member') {
  // Limited access: only assigned tasks
  query += ' AND (assigned_to = ? OR user_id = ?)';
  params.push(auth.userId, auth.userId);
} else {
  // Admin/Owner: all workspace tasks
}
```

### Task Filtering (Member vs Admin)
- **Member role:** Can only see tasks assigned to them + tasks they created
- **Admin/Owner role:** Can see all tasks in workspace

### WebSocket Chat Connection
```typescript
// Frontend: useChatWebSocket hook
const ws = new WebSocket(`wss://${apiUrl}/api/chat/workspace/${workspaceId}/connect?token=${token}`);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'new_message') {
    // Deduplicate
    if (!seenMessageIdsRef.current.has(data.message.id)) {
      seenMessageIdsRef.current.add(data.message.id);
      setMessages(prev => [...prev, data.message]);
    }
  }
};
```

### Recurring Task Pattern Creation
```typescript
const pattern = await apiClient.createRecurringPattern({
  task_name: 'Weekly Meeting',
  frequency: 'weekly',
  interval: 1,
  days_of_week: ['monday', 'wednesday'],
  time_of_day: '14:00',
  start_date: '2025-10-23',
  workspace_id: currentWorkspace.id,
  assigned_to: userId
});
```

---

## Important Implementation Notes

### 1. Message Deduplication in Chat
The chat system prevents duplicate messages using a client-side `Set` that tracks seen message IDs. This is necessary because:
- WebSocket reconnections trigger history replay
- Network issues may cause duplicate broadcasts
- Multiple tabs might receive the same message

**Location:** [src/hooks/useChatWebSocket.ts](src/hooks/useChatWebSocket.ts)

### 2. Pause/Resume Time Tracking
When calculating total time spent:
```typescript
const totalTime = (ended_at - started_at) - total_paused_minutes;
```

The `total_paused_minutes` accumulates all pause durations throughout the session.

### 3. Workspace Invitation Auto-Accept
When a new user signs up, the system:
1. Creates user account
2. Creates default workspace
3. **Checks for pending invitations by email**
4. Auto-accepts matching invitations
5. Adds user to invited workspaces

**Location:** [cloudflare-workers/src/workers/auth.ts](cloudflare-workers/src/workers/auth.ts) (signup handler)

### 4. JWT Token Invalidation
Tokens are invalidated on logout by storing them in KV with TTL:
```typescript
await env.KV.put(`invalid_token:${token}`, '1', { expirationTtl: 86400 });
```

Middleware checks KV before accepting token.

### 5. Recurring Task Generation
Currently **manual generation** via API endpoint:
```
POST /api/recurring-tasks/:id/generate
```

Future enhancement: Scheduled cron trigger to auto-generate instances based on `next_occurrence_date`.

### 6. Activity Tracking
Activity logs are created for significant events:
- Task creation/completion
- Time session start/end
- User invitations sent/accepted
- Idle time detected

**Data field:** JSON blob with event-specific details.

---

## Deployment & Production

### Environments
- **Development Backend:** `task-manager-api-dev.benjiemalinao879557.workers.dev`
- **Production Backend:** Custom domain via Cloudflare (configure in Dashboard)
- **Frontend:** `https://www.workoto.app` (Cloudflare Pages)
- **Database:** `task-manager-dev` (D1 database)

### Secrets Management
All secrets are stored using Wrangler secrets (not in code or environment files):
```bash
cd cloudflare-workers
wrangler secret put JWT_SECRET
# Paste value from: openssl rand -base64 32
```

### Database Backups
D1 databases should be backed up regularly. Use:
```bash
wrangler d1 backup list task-manager-dev
wrangler d1 backup create task-manager-dev
```

### Monitoring
```bash
# Live logs
cd cloudflare-workers
npm run tail

# Dashboard
# Visit: Cloudflare Dashboard → Workers & Pages → task-manager-api-dev → Logs
```

---

## Debugging Tips

### Frontend Issues
1. Check browser DevTools console (F12)
2. Network tab: Inspect failed API requests
3. Check `localStorage` for `auth_token` and `user`
4. React DevTools extension for component state

### Backend Issues
1. Stream live logs: `cd cloudflare-workers && npm run tail`
2. Local development: `npm run dev` (add `console.log` statements)
3. Check Cloudflare Dashboard for error rates
4. Verify bindings in `wrangler.toml`

### Database Issues
```bash
# Query database directly
wrangler d1 execute task-manager-dev --command="SELECT * FROM users WHERE email='user@example.com'"

# Check table schema
wrangler d1 execute task-manager-dev --command="PRAGMA table_info(tasks)"

# View indexes
wrangler d1 execute task-manager-dev --command="SELECT * FROM sqlite_master WHERE type='index'"
```

### WebSocket Chat Issues
1. Check WebSocket connection status in browser DevTools (Network tab → WS filter)
2. Verify token is passed in query param: `?token=...`
3. Check Durable Object logs in Cloudflare Dashboard
4. Test connection manually: `new WebSocket('wss://...?token=<token>')`

### Authentication Issues
1. Check JWT token validity: Paste token into jwt.io
2. Verify `JWT_SECRET` is set: `wrangler secret list`
3. Check password hash: Ensure bcrypt rounds = 10
4. Clear localStorage and re-login

---

## Testing

**Note:** This project does not currently have unit or integration tests. Testing is done manually via local development and production monitoring.

To add testing in the future:
- **Frontend:** Vitest + React Testing Library
- **Backend:** Miniflare for Workers testing

---

## Key Files Reference

| File | Purpose |
|------|---------|
| [src/App.tsx](src/App.tsx) | Main routing, context providers |
| [src/context/AuthContext.tsx](src/context/AuthContext.tsx) | Authentication state and methods |
| [src/context/WorkspaceContext.tsx](src/context/WorkspaceContext.tsx) | Workspace selection and management |
| [src/lib/api-client.ts](src/lib/api-client.ts) | Centralized HTTP client with all API methods |
| [src/hooks/useChatWebSocket.ts](src/hooks/useChatWebSocket.ts) | WebSocket chat connection logic |
| [cloudflare-workers/src/index.ts](cloudflare-workers/src/index.ts) | Hono app initialization and route mounting |
| [cloudflare-workers/src/middleware/auth.ts](cloudflare-workers/src/middleware/auth.ts) | JWT authentication middleware |
| [cloudflare-workers/src/workers/auth.ts](cloudflare-workers/src/workers/auth.ts) | Signup, login, logout endpoints |
| [cloudflare-workers/src/workers/tasks.ts](cloudflare-workers/src/workers/tasks.ts) | Task CRUD operations |
| [cloudflare-workers/src/workers/time-sessions.ts](cloudflare-workers/src/workers/time-sessions.ts) | Time tracking with pause/resume |
| [cloudflare-workers/src/workers/recurring-tasks.ts](cloudflare-workers/src/workers/recurring-tasks.ts) | Recurring task pattern management |
| [cloudflare-workers/src/durable-objects/ChatRoom.ts](cloudflare-workers/src/durable-objects/ChatRoom.ts) | WebSocket chat room implementation |
| [cloudflare-workers/wrangler.toml](cloudflare-workers/wrangler.toml) | Cloudflare Workers configuration |
| [docs/RECURRING_TASKS_FEATURE.md](docs/RECURRING_TASKS_FEATURE.md) | Recurring tasks feature documentation |

---

## Additional Documentation

The `docs/` directory contains 49+ detailed documentation files covering specific features and implementation details. Key documents:
- `RECURRING_TASKS_FEATURE.md` - Recurring tasks implementation
- `ACTIVITY_TRACKING_FEATURE.md` - Activity tracking system
- `AUTHENTICATION_SETUP.md` - Auth flow details
- `DATABASE_MIGRATION.md` - Database migration guide
- `DEPLOYMENT_GUIDE.md` - Deployment procedures

---

**Live Application:** https://www.workoto.app
**Backend API:** task-manager-api-dev.benjiemalinao879557.workers.dev
**Last Updated:** October 2025
