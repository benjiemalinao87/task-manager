# Team Collaboration Feature - Implementation Plan

## User Feedback Requirements
From Sheena Grace (Client):
1. ✅ Check total hours worked by team members
2. ✅ Filter hours by date
3. ✅ Create tasks for the team
4. ✅ Assign tasks to team members

## Feature Overview
Transform Workoto from a single-user task manager into a team collaboration platform where managers can:
- Manage team members
- Assign tasks to team members
- View team performance and hours
- Filter and report on team activity

---

## Phase 1: Database Schema Changes (Week 1)

### 1.1 New Tables to Create

#### `workspaces` table
```sql
CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### `workspace_members` table (junction table)
```sql
CREATE TABLE workspace_members (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT DEFAULT 'member' CHECK(role IN ('owner', 'admin', 'member')),
  invited_by TEXT,
  joined_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(workspace_id, user_id)
);
```

#### `workspace_invitations` table
```sql
CREATE TABLE workspace_invitations (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  invited_by TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'declined', 'expired')),
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE
);
```

### 1.2 Modify Existing Tables

#### Update `tasks` table
```sql
-- Add new columns to tasks table
ALTER TABLE tasks ADD COLUMN workspace_id TEXT REFERENCES workspaces(id);
ALTER TABLE tasks ADD COLUMN assigned_to TEXT REFERENCES users(id);
ALTER TABLE tasks ADD COLUMN assigned_by TEXT REFERENCES users(id);
ALTER TABLE tasks ADD COLUMN assigned_at TEXT;

-- Add indexes
CREATE INDEX idx_tasks_workspace_id ON tasks(workspace_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_workspace_assigned ON tasks(workspace_id, assigned_to);
```

#### Update `time_sessions` table
```sql
-- Add workspace context
ALTER TABLE time_sessions ADD COLUMN workspace_id TEXT REFERENCES workspaces(id);
CREATE INDEX idx_time_sessions_workspace_id ON time_sessions(workspace_id);
```

---

## Phase 2: Backend API Implementation (Week 1-2)

### 2.1 Workspace Management APIs

#### Create Workspace
```
POST /api/workspaces
Body: { name: string }
Response: { workspace: Workspace }
```

#### Get User Workspaces
```
GET /api/workspaces
Response: { workspaces: Workspace[] }
```

#### Update Workspace
```
PUT /api/workspaces/:id
Body: { name: string }
Response: { workspace: Workspace }
```

### 2.2 Team Member Management APIs

#### Invite Team Member
```
POST /api/workspaces/:workspaceId/invitations
Body: { email: string, role: 'admin' | 'member' }
Response: { invitation: Invitation }
```

#### Get Workspace Members
```
GET /api/workspaces/:workspaceId/members
Response: { members: WorkspaceMember[] }
```

#### Remove Team Member
```
DELETE /api/workspaces/:workspaceId/members/:userId
Response: { success: boolean }
```

#### Accept Invitation
```
POST /api/invitations/:token/accept
Response: { workspace: Workspace }
```

#### Get Pending Invitations (for user)
```
GET /api/invitations/pending
Response: { invitations: Invitation[] }
```

### 2.3 Task Assignment APIs

#### Create Task with Assignment
```
POST /api/workspaces/:workspaceId/tasks
Body: {
  taskName: string,
  description: string,
  estimatedTime: string,
  assignedTo?: string (user_id),
  priority: string
}
Response: { task: Task }
```

#### Assign Task to Member
```
PUT /api/tasks/:taskId/assign
Body: { assignedTo: string (user_id) }
Response: { task: Task }
```

#### Get Tasks by Workspace
```
GET /api/workspaces/:workspaceId/tasks?assignedTo=&status=&dateFrom=&dateTo=
Response: { tasks: Task[] }
```

### 2.4 Time Reports APIs

#### Get Team Hours Report
```
GET /api/workspaces/:workspaceId/reports/hours
Query params:
  - userId?: string (filter by team member)
  - dateFrom: string (ISO date)
  - dateTo: string (ISO date)
  - groupBy: 'day' | 'week' | 'month' | 'user'
Response: {
  totalHours: number,
  breakdown: {
    userId: string,
    userName: string,
    hours: number,
    sessions: number
  }[]
}
```

#### Get Team Task Report
```
GET /api/workspaces/:workspaceId/reports/tasks
Query params:
  - userId?: string
  - dateFrom: string
  - dateTo: string
  - status?: string
Response: {
  totalTasks: number,
  completed: number,
  inProgress: number,
  byMember: {
    userId: string,
    userName: string,
    tasks: number,
    completed: number
  }[]
}
```

---

## Phase 3: Frontend UI Implementation (Week 2-3)

### 3.1 Workspace Context & Switching

#### Create WorkspaceContext
```typescript
// src/context/WorkspaceContext.tsx
interface WorkspaceContextType {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  switchWorkspace: (workspaceId: string) => void;
  createWorkspace: (name: string) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
}
```

#### Update App Header
- Add workspace selector dropdown
- Show current workspace name
- Allow switching between workspaces

### 3.2 Team Management Screen (New)

Location: `/team-dashboard` → "Team" tab

#### Features:
1. **Team Members List**
   - Avatar, name, email, role
   - Hours worked (this period)
   - Tasks assigned/completed
   - Remove button (owner/admin only)

2. **Invite Member Section**
   - Email input
   - Role selector (Admin/Member)
   - Send invitation button
   - Pending invitations list

3. **Role Permissions**
   - Owner: Full access, can delete workspace
   - Admin: Can invite/remove members, assign tasks
   - Member: Can view team, work on assigned tasks

### 3.3 Enhanced Task Form (Modify existing)

Add to existing TaskForm:
```typescript
// New fields
- Workspace selector (if user has multiple workspaces)
- "Assign to" dropdown (shows workspace members)
- Shows your avatar if creating for yourself
```

### 3.4 Enhanced Task List (Modify existing)

Add filters:
```typescript
- Filter by: All Tasks | My Tasks | Unassigned
- Filter by team member (dropdown)
- Filter by date range
- Show assignee avatar/name on each task card
```

### 3.5 Time Reports Screen (New)

Location: `/team-dashboard` → "Reports" tab

#### Layout:
```
┌─────────────────────────────────────────────┐
│ Filters: [Date Range] [Team Member] [Export]│
├─────────────────────────────────────────────┤
│                                             │
│ Total Hours: 142.5h                         │
│ Team Members: 5                             │
│                                             │
│ ┌─────────────────────────────────────────┐│
│ │ Sarah Johnson    42.5h  [████████] 100% ││
│ │ Mike Chen        38.0h  [███████ ]  83% ││
│ │ Alex Rivera      32.5h  [██████  ]  80% ││
│ └─────────────────────────────────────────┘│
│                                             │
│ ┌─────────────────────────────────────────┐│
│ │     Detailed Time Log                   ││
│ │ Date    | Member      | Hours | Tasks   ││
│ │ Oct 14  | Sarah J.    | 8.5h  | 3       ││
│ │ Oct 14  | Mike C.     | 7.0h  | 2       ││
│ └─────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

Features:
- Date range picker (last 7/14/30 days, custom)
- Filter by team member
- Export to CSV/PDF
- Visual charts (bar chart, timeline)
- Detailed time log table

### 3.6 Update Team Dashboard (Modify existing)

Current mock dashboard becomes real with:
- Real data from API
- Filter by workspace
- Filter by date range
- Team member performance
- Task distribution

---

## Phase 4: User Experience Flow (Week 3)

### 4.1 New User Onboarding
1. User signs up → creates default workspace (e.g., "My Workspace")
2. Prompted: "Invite your team" (can skip)
3. If skip → single-user mode (current experience)
4. If invite → team mode activated

### 4.2 Workspace Owner Flow
```
1. Create workspace
2. Invite team members by email
3. They receive email invitation
4. They sign up/login and accept
5. They join workspace
6. Owner can now:
   - Create tasks
   - Assign tasks to team members
   - View team performance
   - See time reports
```

### 4.3 Team Member Flow
```
1. Receive invitation email
2. Click link → Sign up (or login if existing user)
3. Accept invitation → Join workspace
4. See workspace in workspace selector
5. Can now:
   - View tasks assigned to them
   - Work on tasks
   - Clock in/out (tracked per workspace)
   - View team dashboard (read-only)
```

### 4.4 Task Assignment Flow
```
Manager creates task →
  Choose workspace →
  Choose assignee (or leave unassigned) →
  Task created →
  Assignee receives notification (email/in-app) →
  Task appears in "My Tasks" for assignee
```

---

## Phase 5: Permissions & Access Control (Week 3)

### 5.1 Role-Based Permissions

| Feature | Owner | Admin | Member |
|---------|-------|-------|--------|
| Create workspace | ✅ | ❌ | ❌ |
| Delete workspace | ✅ | ❌ | ❌ |
| Invite members | ✅ | ✅ | ❌ |
| Remove members | ✅ | ✅ | ❌ |
| Create tasks | ✅ | ✅ | ✅ |
| Assign tasks | ✅ | ✅ | ❌ |
| Edit any task | ✅ | ✅ | ❌ |
| Edit own tasks | ✅ | ✅ | ✅ |
| View team reports | ✅ | ✅ | 👁️ (limited) |
| Export reports | ✅ | ✅ | ❌ |

### 5.2 Data Access Rules
- Users can only see workspaces they're members of
- Users can only see tasks in their workspaces
- Members can only see their own time sessions (Admins/Owners see all)
- Task notifications only sent to assigned user

---

## Phase 6: Email Notifications (Week 4)

### 6.1 New Email Templates

1. **Workspace Invitation**
   ```
   Subject: You've been invited to join [Workspace Name] on Workoto

   Hi [Name],
   [Inviter Name] has invited you to join their team on Workoto.

   [Accept Invitation Button]
   ```

2. **Task Assignment**
   ```
   Subject: New task assigned to you: [Task Name]

   Hi [Name],
   [Manager Name] assigned you a new task:

   Task: [Task Name]
   Description: [Description]
   Estimated Time: [Time]
   Due: [Date]

   [View Task Button]
   ```

3. **Task Completed (to Manager)**
   ```
   Subject: [Member Name] completed: [Task Name]

   Hi [Manager],
   [Member Name] has completed the task "[Task Name]"

   Time taken: [Actual Time]

   [View Details Button]
   ```

---

## Phase 7: Migration Strategy (Week 4)

### 7.1 Existing Users Migration
```sql
-- For each existing user:
-- 1. Create a default workspace
INSERT INTO workspaces (id, name, owner_id)
VALUES (uuid(), 'My Workspace', user_id);

-- 2. Add user as owner member
INSERT INTO workspace_members (workspace_id, user_id, role)
VALUES (workspace_id, user_id, 'owner');

-- 3. Migrate existing tasks to workspace
UPDATE tasks
SET workspace_id = (SELECT id FROM workspaces WHERE owner_id = tasks.user_id)
WHERE workspace_id IS NULL;

-- 4. Migrate existing time sessions
UPDATE time_sessions
SET workspace_id = (SELECT id FROM workspaces WHERE owner_id = time_sessions.user_id)
WHERE workspace_id IS NULL;
```

### 7.2 Backwards Compatibility
- Single-user mode still works (user has one workspace, no team members)
- All existing features remain functional
- UI adapts: if workspace has 1 member, don't show team features prominently

---

## Phase 8: Testing Checklist

### 8.1 Unit Tests
- [ ] Workspace CRUD operations
- [ ] Team member invitation flow
- [ ] Task assignment logic
- [ ] Time report calculations
- [ ] Permission checks

### 8.2 Integration Tests
- [ ] Multi-user workspace operations
- [ ] Task assignment notifications
- [ ] Time tracking across team members
- [ ] Report generation with filters

### 8.3 User Acceptance Tests
- [ ] Manager can create workspace
- [ ] Manager can invite team members
- [ ] Team members receive and accept invitations
- [ ] Manager can create and assign tasks
- [ ] Team members see assigned tasks
- [ ] Manager can view team hours report
- [ ] Manager can filter reports by date
- [ ] Manager can export reports

---

## Implementation Timeline

### Week 1: Foundation
- [ ] Database schema changes
- [ ] Migration scripts
- [ ] Workspace APIs
- [ ] Team member APIs

### Week 2: Core Features
- [ ] Task assignment APIs
- [ ] Time reports APIs
- [ ] Workspace context
- [ ] Team management screen

### Week 3: UI Polish
- [ ] Enhanced task form
- [ ] Enhanced task list
- [ ] Time reports screen
- [ ] Team dashboard integration
- [ ] Permissions implementation

### Week 4: Polish & Deploy
- [ ] Email notifications
- [ ] Data migration
- [ ] Testing
- [ ] Documentation
- [ ] Deploy to production

---

## Success Metrics

After implementation, we should track:
1. **Adoption Rate**: % of users who create workspaces with team members
2. **Team Size**: Average number of members per workspace
3. **Task Assignment**: % of tasks that are assigned vs unassigned
4. **Time Tracking**: % increase in time sessions logged
5. **Report Usage**: How often time reports are viewed/exported
6. **User Feedback**: Satisfaction with team features

---

## Future Enhancements (Post-Launch)

### Phase 9+ (Optional)
- [ ] Real-time collaboration (WebSockets)
- [ ] Task comments/discussions
- [ ] File attachments on tasks
- [ ] Gantt chart / timeline view
- [ ] Team calendar sync
- [ ] Mobile app
- [ ] Slack/Teams integration
- [ ] Time tracking reminders
- [ ] Automated weekly reports
- [ ] Custom roles & permissions
- [ ] Workspace templates
- [ ] Task dependencies
- [ ] Recurring tasks

---

## Tech Stack Summary

**Backend:**
- Cloudflare Workers (existing)
- D1 Database (SQLite) (existing)
- Cloudflare Queues for async tasks (existing)

**Frontend:**
- React + TypeScript (existing)
- React Router (existing)
- TailwindCSS (existing)
- New: Chart library (recharts or chart.js)
- New: Date picker (react-datepicker)

**Email:**
- Resend/SendGrid (existing)
- New templates for invitations & assignments

---

## Questions to Resolve

1. **Billing**: Will team features be paid? Different pricing tiers?
2. **Limits**: Max team members per workspace? (5, 10, unlimited?)
3. **Storage**: File attachments needed immediately or later?
4. **Mobile**: Priority for mobile app or web-responsive sufficient?
5. **Integrations**: Priority on Asana sync for team tasks?

---

## Notes

- Keep single-user experience smooth (don't force team features)
- Ensure backward compatibility for existing users
- Focus on simplicity - start with MVP, iterate based on feedback
- Performance: optimize queries for team reports (can be slow with large datasets)
- Consider caching strategy for team dashboards
