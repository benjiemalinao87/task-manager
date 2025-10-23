# Workoto Task Manager - Architecture Documentation

This directory contains comprehensive documentation about the Workoto task manager codebase to help Claude Code and future developers understand the system quickly.

## Documentation Files

### 1. ARCHITECTURE_SUMMARY.md (Quick Start - 2-5 minutes)
**Best for:** Quick onboarding, getting oriented
- One-minute overview
- Stack summary
- 5 key directories
- Authentication flow (simplified)
- 3 major features
- Running locally
- New developer checklist
- Common tasks quick reference

**Start here** if you're new to the codebase.

### 2. CLAUDE.md (Complete Reference - 30-45 minutes)
**Best for:** Deep dive understanding, technical reference
- Complete architecture explanation
- Detailed directory structure (every file explained)
- Frontend structure & components
- Backend structure & all API endpoints
- Complete database schema with all tables
- Full authentication flow
- Real-time features (WebSocket, Durable Objects, Queues)
- All 6+ key features explained
- Build & deployment guide
- Development workflow

**Use this** when you need to understand how something works in detail.

### 3. ARCHITECTURE_DIAGRAMS.md (Visual Reference - 10-15 minutes)
**Best for:** Understanding system flow, visual learner
- System architecture diagram
- Request/response flow
- WebSocket chat connection flow
- Complete component hierarchy
- State flow (Context API)
- Data flow example (create task)
- Database query path
- Authentication token lifecycle

**Use this** to visualize how components interact.

---

## Quick Navigation Guide

### "How do I...?"

**...understand the overall structure?**
→ Start with ARCHITECTURE_SUMMARY.md, then ARCHITECTURE_DIAGRAMS.md

**...add a new API endpoint?**
→ CLAUDE.md → Backend Structure → Your specific worker type
→ Example: "How to add a Task endpoint" → tasks.ts section

**...understand authentication?**
→ CLAUDE.md → Authentication Flow section
→ Also see ARCHITECTURE_DIAGRAMS.md → Authentication Token Lifecycle

**...understand how tasks are filtered by workspace?**
→ CLAUDE.md → Backend Structure → Task Management section
→ cloudflare-workers/src/workers/tasks.ts file itself

**...understand the chat system?**
→ CLAUDE.md → Real-Time Features → WebSocket Chat section
→ ARCHITECTURE_DIAGRAMS.md → WebSocket Chat Connection Flow

**...set up recurring tasks?**
→ docs/RECURRING_TASKS_FEATURE.md (in docs/ directory)
→ CLAUDE.md → Key Features → Recurring Tasks

**...deploy the application?**
→ docs/DEPLOYMENT_GUIDE.md (in docs/ directory)
→ CLAUDE.md → Build & Deployment

**...understand the database schema?**
→ CLAUDE.md → Database Design section
→ Or check cloudflare-workers/migrations/ files directly

**...debug a feature?**
→ Read the component code in src/components/
→ Cross-reference with API in cloudflare-workers/src/workers/
→ Check CLAUDE.md for the complete flow

---

## File Organization at a Glance

```
task-manager/
├── README_ARCHITECTURE.md      ← You are here
├── ARCHITECTURE_SUMMARY.md     ← Start here for quick overview
├── ARCHITECTURE_DIAGRAMS.md    ← Visual flows and diagrams
├── CLAUDE.md                   ← Complete technical reference
├── docs/                       ← 50+ detailed guides
│   ├── AUTHENTICATION_SETUP.md
│   ├── DATABASE_MIGRATION.md
│   ├── DEPLOYMENT_GUIDE.md
│   ├── RECURRING_TASKS_FEATURE.md
│   ├── ACTIVITY_TRACKING_FEATURE.md
│   ├── CHAT_SYSTEM.md
│   └── ... (45+ more guides)
│
├── src/                        ← Frontend (React)
│   ├── components/             ← 46 React components
│   ├── context/                ← Global state (Auth, Workspace, etc)
│   ├── hooks/                  ← Custom hooks (Chat, Activity)
│   ├── lib/                    ← API client, utilities
│   ├── App.tsx                 ← Main router
│   └── main.tsx                ← Entry point
│
└── cloudflare-workers/         ← Backend (Hono.js)
    ├── src/
    │   ├── index.ts            ← Route mounting
    │   ├── workers/            ← 20+ API route files
    │   ├── durable-objects/    ← ChatRoom WebSocket
    │   ├── middleware/         ← Auth & other middleware
    │   └── utils/              ← Helpers
    ├── migrations/             ← SQL migrations (6+)
    └── wrangler.toml           ← Worker config
```

---

## Key Concepts at a Glance

| Concept | Where to Read | Files |
|---------|---------------|-------|
| **Authentication** | CLAUDE.md § Authentication Flow | auth.ts, AuthContext.tsx |
| **REST API** | CLAUDE.md § Backend Structure | cloudflare-workers/src/workers/ |
| **WebSocket Chat** | CLAUDE.md § Real-Time Features | useChatWebSocket.ts, ChatRoom.ts |
| **Database Schema** | CLAUDE.md § Database Design | cloudflare-workers/migrations/ |
| **Component Hierarchy** | ARCHITECTURE_DIAGRAMS.md | src/components/ |
| **State Management** | ARCHITECTURE_DIAGRAMS.md § State Flow | src/context/ |
| **Message Queues** | CLAUDE.md § Message Queue System | email-consumer.ts, ai-consumer.ts |
| **Durable Objects** | CLAUDE.md § Real-Time Features | src/durable-objects/ChatRoom.ts |
| **Workspaces** | CLAUDE.md § Backend Structure | workspaces.ts |
| **Time Tracking** | CLAUDE.md § Backend Structure | time-sessions.ts |
| **Recurring Tasks** | docs/RECURRING_TASKS_FEATURE.md | recurring-tasks.ts |

---

## Technology Stack Summary

| Layer | Technology | Files |
|-------|-----------|-------|
| **Frontend UI** | React 18 + TypeScript | src/components/ |
| **Frontend Routing** | React Router 7 | src/App.tsx |
| **Frontend Build** | Vite 5.4 | vite.config.ts |
| **Frontend Styling** | Tailwind CSS + Radix UI | index.css, components/ |
| **Frontend State** | Context API | src/context/ |
| **API Calls** | Fetch API + custom client | src/lib/api-client.ts |
| **Backend Framework** | Hono.js | cloudflare-workers/src/index.ts |
| **Backend Runtime** | Cloudflare Workers | wrangler.toml |
| **Database** | SQLite (D1) | cloudflare-workers/migrations/ |
| **Real-Time** | WebSockets + Durable Objects | useChatWebSocket.ts, ChatRoom.ts |
| **Authentication** | JWT + bcryptjs | auth.ts |
| **Async Jobs** | Message Queues | email-consumer.ts, ai-consumer.ts |
| **Caching** | KV Namespace | (used in workers) |

---

## Recommended Reading Order

### For Complete Beginners
1. ARCHITECTURE_SUMMARY.md (5 min) - Get the big picture
2. ARCHITECTURE_DIAGRAMS.md (10 min) - See how it flows
3. CLAUDE.md § Overall Architecture (5 min) - Understand layers
4. Then dive into specific sections as needed

### For Frontend Developers
1. ARCHITECTURE_SUMMARY.md (5 min)
2. CLAUDE.md § Frontend Structure (15 min)
3. ARCHITECTURE_DIAGRAMS.md § Component Hierarchy (10 min)
4. Check out src/App.tsx and src/lib/api-client.ts

### For Backend Developers
1. ARCHITECTURE_SUMMARY.md (5 min)
2. CLAUDE.md § Backend Structure (20 min)
3. CLAUDE.md § Database Design (15 min)
4. Check out cloudflare-workers/src/index.ts and a few workers

### For DevOps/Deployment
1. CLAUDE.md § Build & Deployment (10 min)
2. docs/DEPLOYMENT_GUIDE.md (30 min)
3. docs/AUTHENTICATION_SETUP.md (20 min)
4. Check out wrangler.toml and vite.config.ts

### For Full Stack Understanding
1. Read all three architecture docs (60 min total)
2. Then check docs/ for specific features (5-10 min each)
3. Then review actual code in the folders

---

## Common Questions Answered

**Q: Where is the database defined?**
A: cloudflare-workers/migrations/ - Each SQL file is a migration

**Q: How does authentication work?**
A: JWT tokens stored in localStorage. See CLAUDE.md § Authentication Flow

**Q: How does real-time chat work?**
A: WebSockets via Durable Objects. See CLAUDE.md § Real-Time Features

**Q: How are tasks filtered by workspace?**
A: Role-based SQL queries in tasks.ts. See CLAUDE.md § Task Management

**Q: How do I add a new feature?**
A: Database → Backend API → Frontend UI. See CLAUDE.md § Development Workflow

**Q: How do I deploy?**
A: Frontend: `npm run build` (auto via Pages). Backend: `npm run deploy`. See docs/DEPLOYMENT_GUIDE.md

**Q: Where are API endpoints defined?**
A: cloudflare-workers/src/workers/ (20+ files, one per feature)

**Q: How do I run locally?**
A: Frontend: `npm run dev` (port 5173). Backend: `cd cloudflare-workers && npm run dev` (port 8787). See ARCHITECTURE_SUMMARY.md

**Q: What's the API base URL?**
A: Dev: http://localhost:8787 (local) or task-manager-api-dev.workers.dev (cloud). See wrangler.toml

**Q: How do I access the database?**
A: D1 commands: `wrangler d1 shell` or migrations in cloudflare-workers/migrations/

---

## Documentation Maintenance

These files were generated on **October 23, 2025** from the actual codebase.

If you update the codebase significantly, consider updating:
1. CLAUDE.md - For major architectural changes
2. ARCHITECTURE_SUMMARY.md - For new key directories/features
3. ARCHITECTURE_DIAGRAMS.md - For new data flows
4. docs/ - For feature-specific documentation

---

## Related Documentation

See also:
- **docs/AUTHENTICATION_SETUP.md** - How to set up secrets
- **docs/DATABASE_MIGRATION.md** - Database schema overview
- **docs/DEPLOYMENT_GUIDE.md** - How to deploy
- **docs/RECURRING_TASKS_FEATURE.md** - New recurring tasks feature
- **docs/ACTIVITY_TRACKING_FEATURE.md** - Activity tracking feature
- **docs/CHAT_SYSTEM.md** - WebSocket chat details

---

## Getting Help

1. **Check the docs/** folder - 50+ guides on specific topics
2. **Read CLAUDE.md** - Comprehensive technical reference
3. **Look at code examples** - See the actual implementation
4. **Check git history** - See what changed and why
5. **Ask the team** - Original developers can explain design decisions

---

**Created for:** Claude Code and future developers
**Last Updated:** October 23, 2025
**Status:** Active development
**Live at:** https://www.workoto.app
