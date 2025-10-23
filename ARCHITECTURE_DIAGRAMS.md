# Architecture Diagrams

## System Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                        INTERNET / BROWSER                          │
└────────────────────┬───────────────────────────────────┬───────────┘
                     │ HTTPS Requests                    │ WebSocket
                     │ + JWT Authorization               │ Chat
                     │                                   │
      ┌──────────────▼──────────────────────────────────▼──────────────┐
      │              CLOUDFLARE EDGE NETWORK                           │
      └──────────────┬──────────────────────────────────┬──────────────┘
                     │                                  │
    ┌────────────────▼────────────────┐   ┌────────────▼─────────────┐
    │  Cloudflare Pages (Static)      │   │  Cloudflare Workers      │
    │                                 │   │  (task-manager-api-dev)  │
    │  ├── index.html (SPA)           │   │                          │
    │  ├── assets/ (JS, CSS)          │   │  Hono.js Framework       │
    │  ├── Vite bundled               │   │  ├── 20+ Route Handlers  │
    │  └── React app                  │   │  ├── Auth Middleware     │
    │                                 │   │  ├── CORS                │
    │  Frontend                       │   │  └── Error Handling      │
    │  ├── React 18 Components        │   │                          │
    │  ├── Context API (Auth, etc)    │   │  Durable Objects         │
    │  ├── Custom Hooks               │   │  ├── ChatRoom            │
    │  ├── Tailwind CSS               │   │  └── Message Queue       │
    │  └── React Router               │   │                          │
    │                                 │   │  Message Queues          │
    └─────────────────────────────────┘   │  ├── email-queue         │
                                          │  └── ai-queue            │
                                          │                          │
                                          │  KV Namespace            │
                                          │  ├── Token Blacklist     │
                                          │  └── Session Cache       │
                                          │                          │
                                          └────────────┬─────────────┘
                                                       │
                                          ┌────────────▼──────────────┐
                                          │   D1 Database (SQLite)    │
                                          │                           │
                                          │  ├── users               │
                                          │  ├── workspaces          │
                                          │  ├── workspace_members   │
                                          │  ├── tasks               │
                                          │  ├── time_sessions       │
                                          │  ├── activity_logs       │
                                          │  ├── recurring_patterns  │
                                          │  ├── settings            │
                                          │  ├── integrations        │
                                          │  └── invoices            │
                                          │                           │
                                          └───────────────────────────┘
```

## Request/Response Flow

### Typical API Request (with Auth)

```
User Action
    │
    ▼
React Component
    │ (apiClient.getTasks())
    ▼
Fetch with Headers:
  ├── Content-Type: application/json
  ├── Authorization: Bearer <JWT_TOKEN>
    │
    ▼
Cloudflare Workers (Router)
    │
    ├─→ CORS Check
    │
    ├─→ Auth Middleware
    │   ├── Extract token from header
    │   ├── Verify signature (JWT_SECRET)
    │   └── Extract userId, email
    │
    ├─→ Route Handler (tasks.ts)
    │   ├── Check workspace access
    │   ├── Build SQL query
    │   └── Query D1 Database
    │
    ▼
D1 Database Query
    │ (SELECT tasks WHERE workspace_id = ? AND ...)
    ▼
Results (JSON)
    │
    ▼
Return Response:
  ├── Status 200 OK
  ├── Content-Type: application/json
  └── Body: { tasks: [...] }
    │
    ▼
Frontend receives data
    │
    ▼
React re-renders with new state
```

### WebSocket Chat Connection

```
User opens Chat
    │
    ▼
useChatWebSocket Hook connects
    │
    ├── Get JWT token from localStorage
    ├── Convert HTTP URL to WebSocket URL
    └── Connect: wss://api.../api/chat/workspace/:id/connect?token=...
    │
    ▼
Cloudflare Workers (chat.ts)
    │
    ├── Extract & verify token
    └── Request WebSocket upgrade
    │
    ▼
Durable Object (ChatRoom instance)
    │
    ├── Accept WebSocket connection
    ├── Create Session object
    ├── Load message history from storage
    ├── Send history to client
    └── Broadcast "user_joined" to others
    │
    ▼
Client receives messages
    │
    ├── History: Past messages
    ├── Online users: Current members
    └── Ready to send/receive
    │
    ▼
User types & sends message
    │
    ├── Client: { type: 'message', content: '...' }
    ▼
Durable Object receives
    │
    ├── Generate message ID
    ├── Add timestamp
    ├── Save to persistent storage
    └── Broadcast to all sessions
    │
    ▼
All connected clients receive
    │
    └── type: 'new_message', message: {...}
    │
    ▼
React components update
    │
    ▼
Users see message in chat
```

## Component Hierarchy

```
App (routes, providers)
│
├── <AuthProvider>
│   ├── <WorkspaceProvider>
│   │   ├── <ToastProvider>
│   │   │   ├── <TaskTimerProvider>
│   │   │   │   ├── <InactivityBannerProvider>
│   │   │   │   │   │
│   │   │   │   │   ├─→ Route: /
│   │   │   │   │   │     └─→ LandingPage
│   │   │   │   │   │
│   │   │   │   │   ├─→ Route: /auth
│   │   │   │   │   │     └─→ AuthPage
│   │   │   │   │   │         ├─→ Login
│   │   │   │   │   │         └─→ Signup
│   │   │   │   │   │
│   │   │   │   │   ├─→ Route: /onboarding
│   │   │   │   │   │     ├─→ NotificationPreferences
│   │   │   │   │   │     └─→ InviteColleagues
│   │   │   │   │   │
│   │   │   │   │   ├─→ Route: /task-manager (main)
│   │   │   │   │   │     ├─→ ConsolidatedHeader
│   │   │   │   │   │     │   ├─→ WorkspaceSwitcher
│   │   │   │   │   │     │   ├─→ User Menu
│   │   │   │   │   │     │   └─→ Settings Button
│   │   │   │   │   │     │
│   │   │   │   │   │     ├─→ PendingInvitations
│   │   │   │   │   │     │
│   │   │   │   │   │     ├─→ CompactNavigation
│   │   │   │   │   │     │   ├─→ Manager Tab
│   │   │   │   │   │     │   ├─→ Calendar Tab
│   │   │   │   │   │     │   ├─→ History Tab
│   │   │   │   │   │     │   └─→ Invoices Tab
│   │   │   │   │   │     │
│   │   │   │   │   │     ├─→ TaskList (if Manager tab)
│   │   │   │   │   │     │   ├─→ Task Items
│   │   │   │   │   │     │   │   ├─→ StatusBadge
│   │   │   │   │   │     │   │   └─→ ClockInOut
│   │   │   │   │   │     │   └─→ Pagination
│   │   │   │   │   │     │
│   │   │   │   │   │     ├─→ CalendarView (if Calendar tab)
│   │   │   │   │   │     │   └─→ Task indicators on dates
│   │   │   │   │   │     │
│   │   │   │   │   │     ├─→ TaskHistory (if History tab)
│   │   │   │   │   │     │   └─→ Completed task list
│   │   │   │   │   │     │
│   │   │   │   │   │     ├─→ Invoices (if Invoices tab)
│   │   │   │   │   │     │   ├─→ InvoiceForm
│   │   │   │   │   │     │   ├─→ InvoiceList
│   │   │   │   │   │     │   └─→ InvoicePreview
│   │   │   │   │   │     │
│   │   │   │   │   │     └─→ ChatBubble (floating)
│   │   │   │   │   │         └─→ Chat interface
│   │   │   │   │   │
│   │   │   │   │   ├─→ Modals (if open)
│   │   │   │   │   │   ├─→ SimpleSettings
│   │   │   │   │   │   │   └─→ Toggle settings
│   │   │   │   │   │   │
│   │   │   │   │   │   ├─→ Integrations
│   │   │   │   │   │   │   ├─→ AsanaIntegration
│   │   │   │   │   │   │   ├─→ ResendIntegration
│   │   │   │   │   │   │   └─→ SendGridIntegration
│   │   │   │   │   │   │
│   │   │   │   │   │   ├─→ AsanaImport
│   │   │   │   │   │   │
│   │   │   │   │   │   └─→ TaskFormModal
│   │   │   │   │   │       ├─→ Title input
│   │   │   │   │   │       ├─→ Description input
│   │   │   │   │   │       ├─→ Time estimate
│   │   │   │   │   │       ├─→ Assign to
│   │   │   │   │   │       ├─→ Priority
│   │   │   │   │   │       ├─→ Workspace selector
│   │   │   │   │   │       └─→ Recurring options (TODO)
│   │   │   │   │   │
│   │   │   │   │   ├─→ Route: /team-dashboard
│   │   │   │   │   │     └─→ TeamDashboard
│   │   │   │   │   │         ├─→ Team member list
│   │   │   │   │   │         ├─→ Tasks per member
│   │   │   │   │   │         └─→ Time spent reports
│   │   │   │   │   │
│   │   │   │   │   └─→ Route: /team-management
│   │   │   │   │         └─→ TeamManagement
│   │   │   │   │             ├─→ Member list
│   │   │   │   │             ├─→ Invite button
│   │   │   │   │             └─→ Remove member
```

## State Flow

```
Global State (Context API)
│
├── AuthContext
│   ├── user: { id, email, name }
│   ├── token: JWT string
│   ├── isAuthenticated: boolean
│   ├── isLoading: boolean
│   ├── needsOnboarding: boolean
│   └── methods: login(), logout(), signup()
│       └─→ Triggers API calls
│           └─→ Updates localStorage
│
├── WorkspaceContext
│   ├── workspaces: Workspace[]
│   ├── currentWorkspace: Workspace
│   └── methods: switchWorkspace(), refreshWorkspaces()
│       └─→ Filters all task queries by workspace
│
├── TaskTimerContext
│   ├── activeSessionId: string
│   ├── isRunning: boolean
│   ├── elapsedSeconds: number
│   └── methods: startTimer(), stopTimer(), pauseTimer()
│
├── ToastContext
│   ├── toasts: Toast[]
│   └── methods: showToast(), dismissToast()
│
└── InactivityBannerContext
    ├── inactiveSeconds: number
    ├── showBanner: boolean
    └── methods: resetActivityTimer()
```

## Data Flow Example: Create Task

```
User clicks "Create Task"
    │
    ▼
TaskFormModal opens
    │
    ├── Form state (title, description, workspace, assignee)
    └── User fills form
    │
    ▼
User clicks "Create"
    │
    ├── Component validates form
    └── Calls: apiClient.createTask({ title, ... })
    │
    ▼
API Client (api-client.ts)
    │
    ├── POST /api/tasks
    └── Body: { title, description, workspace_id, ... }
    │
    ▼
Cloudflare Worker (tasks.ts)
    │
    ├── Auth middleware validates JWT
    ├── Workspace access check
    ├── Generate task ID
    ├── INSERT into tasks table
    └── Return new task
    │
    ▼
Frontend receives task
    │
    ├── Show success toast
    ├── Call: setRefreshTrigger(prev => prev + 1)
    └── Close modal
    │
    ▼
TaskList component
    │
    ├── useEffect watches refreshTrigger
    └── Calls: apiClient.getTasks()
    │
    ▼
List re-fetches & re-renders
    │
    ▼
New task appears in list
```

## Database Query Path

```
Component
  │ (GET /api/tasks?workspaceId=123&status=in_progress)
  ▼
API Client (fetch)
  │
  ▼
Cloudflare Worker (router)
  │
  ├─→ Match route: GET /api/tasks
  └─→ Load: tasks.ts
  │
  ▼
tasks.ts Handler
  │
  ├── Extract query params
  ├── Verify auth (requireAuth middleware)
  ├── Check workspace access
  └── Build SQL query
  │
  ▼
Query Builder (in tasks.ts)
  │
  ├── Base: SELECT t.*, creator.name, assignee.name FROM tasks t
  ├── JOIN users as creator ON t.user_id = creator.id
  ├── JOIN users as assignee ON t.assigned_to = assignee.id
  ├── WHERE workspace_id = ?
  ├── WHERE status = ?
  └── ORDER BY created_at DESC
  │
  ▼
D1 Database.prepare()
  │
  ├── Parse SQL
  ├── Bind parameters (workspace_id, status)
  └── Execute
  │
  ▼
SQLite Engine
  │
  ├── Use index: idx_tasks_workspace_id
  ├── Use index: idx_tasks_status
  ├── Fetch matching rows
  ├── JOIN with users table
  └── Return results
  │
  ▼
Result Set (JSON)
  │
  ├─→ Convert to typed response
  └─→ Return with 200 OK
  │
  ▼
Frontend
  │
  ├── Parse JSON
  ├── Update state: setTasks(data.tasks)
  └── Re-render component
```

## Authentication Token Lifecycle

```
���────────────────────────────────────────────────────────┐
│              Token Lifecycle                           │
└────────────────────────────────────────────────────────┘

Generation (Login)
├── User submits email + password
├── POST /api/auth/login
├── Backend:
│   ├── Find user by email
│   ├── Compare bcrypt hashes
│   ├── If match: generate JWT
│   │   ├── Payload: { userId, email, issued_at }
│   │   └── Secret: env.JWT_SECRET
│   └── Return token
├── Frontend:
│   ├── Store in localStorage['auth_token']
│   └── Store in AuthContext.token
│
Usage
├── On every API call:
│   ├── Read token from localStorage
│   ├── Add header: Authorization: Bearer <token>
│   └── Send request
├── Backend (requireAuth middleware):
│   ├── Extract token from header
│   ├── Verify signature with JWT_SECRET
│   │   ├── Valid → Extract userId, continue
│   │   └── Invalid → Return 401
│   └── Add auth to context
│
Invalidation (Logout)
├── User clicks logout
├── POST /api/auth/logout
├── Frontend:
│   ├── Delete localStorage['auth_token']
│   ├── Delete localStorage['user']
│   ├── Reset AuthContext
│   └── Redirect to /
├── Backend:
│   └── (Optional) Mark token as blacklisted in KV
│
404 Handling
├── If API returns 401 Unauthorized:
│   ├── Clear localStorage
│   ├── window.location.reload()
│   └── Redirect to login
```

---

**Generated:** October 23, 2025
**For:** Understanding system architecture at a glance
