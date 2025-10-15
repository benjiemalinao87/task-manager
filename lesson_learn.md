# Lessons Learned

## Email Invitation Links - Wrong Domain (October 15, 2025)

### Issue: Invitation Email Links Point to Non-Existent Domain
**Problem**: Invitation emails were sent successfully and looked great, but clicking "Accept Invitation" button led to `app.workoto.com` which gives `DNS_PROBE_FINISHED_NXDOMAIN` error because the domain doesn't exist yet.

**Root Cause**: 
- Invitation email template uses `c.env.FRONTEND_URL || 'https://app.workoto.com'` for the invitation link
- `FRONTEND_URL` environment variable was **not configured** in `wrangler.toml`
- Fell back to hardcoded `app.workoto.com` domain
- For development, needs to point to `http://localhost:5173`

**How To Detect**:
```typescript
// invitations.ts line 110
invitation_link: `${c.env.FRONTEND_URL || 'https://app.workoto.com'}/accept-invitation?token=${token}`

// When clicking email link:
https://app.workoto.com/accept-invitation?token=fcdd7f2...
→ DNS_PROBE_FINISHED_NXDOMAIN (domain doesn't exist)
```

**Solution**:
Added `FRONTEND_URL` to `wrangler.toml` for both environments:

```toml
# Development environment
[env.development.vars]
FRONTEND_URL = "http://localhost:5173"

# Production environment
[env.production.vars]
FRONTEND_URL = "https://app.workoto.com"
```

**Result**:
- ✅ Development invitation emails now link to `http://localhost:5173/accept-invitation?token=...`
- ✅ New users can click email button and land on local dev server
- ✅ Production will use actual domain when deployed
- ✅ Environment-specific URLs work correctly

**Key Learning**: 
- **Always configure environment-specific URLs** - Don't hardcode production URLs as fallbacks
- **Email links need to match your deployment** - Development emails should go to localhost
- **Test the full flow** - Send invitation, check email, click link, verify it works
- **Environment variables in wrangler.toml** - Use `[env.X.vars]` for non-secret config

**Testing Checklist**:
1. ✅ Send invitation to new user (no existing account)
2. ✅ Check email arrives with correct branding
3. ✅ Click "Accept Invitation" button
4. ✅ Verify it lands on correct domain (localhost for dev, production domain for prod)
5. ✅ User can create account and accept invitation

**Don't Do This**:
❌ Hardcode production URLs as fallback defaults
❌ Use same URL for all environments
❌ Forget to redeploy after changing wrangler.toml
❌ Only test the "email sent" part without clicking links

**Do This Instead**:
✅ Configure FRONTEND_URL for each environment
✅ Use `c.env.FRONTEND_URL` without fallback (or fallback to localhost)
✅ Test the complete flow from email click to acceptance
✅ Redeploy worker after changing environment variables
✅ Document required environment variables

## Task Assignment - HTTP Method Mismatch (October 15, 2025)

### Issue: 404 Error When Assigning Tasks from Team Dashboard
**Problem**: When trying to assign a task from the Team Dashboard, got `404 (Not Found)` error: `PATCH /api/tasks/:id/assign 404`

**Root Cause**: 
- Frontend `api-client.ts` was using `this.patch()` → `PATCH` request
- Backend `tasks.ts` endpoint defined as `tasks.put()` → expects `PUT` request
- HTTP methods didn't match, causing 404

**How To Detect**:
```
Console Error:
PATCH https://...workers.dev/api/tasks/a4b06764.../assign 404 (Not Found)

Backend Code:
tasks.put('/:id/assign', async (c) => { ... })  ← Expects PUT

Frontend Code:
return this.patch(`/api/tasks/${taskId}/assign`, data);  ← Sends PATCH
```

**Solution**:
Changed frontend to match backend HTTP method:
```typescript
// Before (WRONG - sends PATCH)
async assignTask(taskId: string, data: { assignedTo: string | null }) {
  return this.patch(`/api/tasks/${taskId}/assign`, data);
}

// After (CORRECT - sends PUT)
async assignTask(taskId: string, data: { assignedTo: string | null }) {
  return this.put(`/api/tasks/${taskId}/assign`, data);
}
```

**Key Learning**: 
- **Frontend and backend HTTP methods must match exactly**
- **404 doesn't always mean endpoint is missing** - could be wrong HTTP method
- **Check both sides** when getting 404s on known endpoints
- **Use consistent HTTP verb conventions**: 
  - `PUT` for full replacement or idempotent updates
  - `PATCH` for partial updates
  - `POST` for creation or non-idempotent actions

**How To Debug Similar Issues**:
1. Check console for exact HTTP method and URL
2. Search backend for the endpoint path
3. Verify the HTTP verb matches (`.get()`, `.post()`, `.put()`, `.patch()`, `.delete()`)
4. Update frontend to use matching method

**Don't Do This**:
❌ Assume 404 always means endpoint doesn't exist
❌ Mix up PUT and PATCH without checking backend
❌ Only check the endpoint path, ignore the HTTP method
❌ Deploy backend without verifying frontend matches

**Do This Instead**:
✅ Check BOTH path AND HTTP method when debugging 404s
✅ Search for the endpoint definition in backend to confirm method
✅ Keep frontend/backend HTTP methods in sync
✅ Use TypeScript/docs to document expected HTTP methods
✅ Test after replacing worker files to catch mismatches

## Time Reports - Missing Team Members with Zero Hours (October 15, 2025)

### Issue: Team Members Not Showing in Time Reports
**Problem**: Team members with no logged time were not appearing in the Time Reports "Team Breakdown" section, making it seem like they weren't part of the team.

**Root Cause**: 
- SQL query used `INNER JOIN` on `time_sessions`, which only returned members who had logged time
- Members without time sessions were completely excluded from the results
- This made it impossible to see all team members at a glance

**How To Detect**:
```sql
-- Old query (only shows members with time logged)
FROM time_sessions ts
INNER JOIN users u ON ts.user_id = u.id
WHERE ts.workspace_id = ?

-- Result: Only Benjie shows (has 38h logged)
-- Missing: allison (0h logged)
```

**Solution**:
Changed query to start from `workspace_members` with `LEFT JOIN` on `time_sessions`:

```sql
-- New query (shows ALL workspace members)
FROM workspace_members wm
INNER JOIN users u ON wm.user_id = u.id
LEFT JOIN time_sessions ts ON ts.user_id = wm.user_id 
                           AND ts.workspace_id = wm.workspace_id
WHERE wm.workspace_id = ?
```

**Key Changes**:
1. **Start from workspace_members** instead of time_sessions
2. **LEFT JOIN instead of INNER JOIN** for time_sessions
3. **Updated date filters** to handle NULL time sessions: `(ts.id IS NULL OR date(ts.clock_in) >= date(?))`
4. **Updated user filters** to use `wm.user_id` instead of `ts.user_id`

**Result**:
- ✅ All team members now show in Team Breakdown
- ✅ Members with 0 hours show "0h 0m"
- ✅ Accurate team member count
- ✅ Can see who hasn't logged time yet

**Key Learning**: 
- **Use LEFT JOIN for optional relationships** - When you want to show all rows from left table even if no match in right table
- **Start queries from the "must show all" table** - If showing all workspace members is required, start from workspace_members
- **NULL handling in filters** - When using LEFT JOIN, remember to handle NULL cases: `(ts.id IS NULL OR ...)`
- **Think about empty states** - What should users see when data is 0? They should still see the member!

**Before vs After**:
```
BEFORE:
Team Breakdown
- Benjie Malinao: 38h 3m (100%)
[allison is missing!]

AFTER:
Team Breakdown
- Benjie Malinao: 38h 3m (100%)
- allison: 0h 0m (0 sessions)  ← Now shows!
```

**Don't Do This**:
❌ Use INNER JOIN when you need to show all items from one table
❌ Hide team members just because they have no activity
❌ Assume "no data" means "don't show"
❌ Forget to handle NULL in filters after LEFT JOIN

**Do This Instead**:
✅ Use LEFT JOIN to preserve all rows from main table
✅ Show all team members with 0 values for inactive ones
✅ Start query from the table that must show all items
✅ Handle NULL cases in WHERE clauses: `(field IS NULL OR ...)`
✅ Test with users who have no activity data

## Team Dashboard - Added Inline Task Assignment (October 15, 2025)

### Feature: Assign Tasks Directly from Team Dashboard
**Request**: Allow assigning tasks to team members directly from the Team Dashboard's Recent Tasks table, not just during task creation.

**Implementation**:
1. **Added assignment dropdown to Recent Tasks table**:
   - Shows dropdown in Assignee column for active tasks
   - Only shows if workspace has multiple members
   - Only shows for non-completed tasks (completed tasks show name only)
   - Lists all workspace members with their roles
   - Option to unassign tasks

2. **Added state management**:
   ```typescript
   const [assigningTaskId, setAssigningTaskId] = useState<string | null>(null);
   const [workspaceMembers, setWorkspaceMembers] = useState<any[]>([]);
   ```

3. **Fetched workspace members in parallel**:
   ```typescript
   const [performanceData, tasksData, hoursData, tasksListData, membersData] = await Promise.all([
     apiClient.getPerformanceReport(currentWorkspace.id, { dateFrom, dateTo }),
     apiClient.getTasksReport(currentWorkspace.id, { dateFrom, dateTo }),
     apiClient.getHoursReport(currentWorkspace.id, { dateFrom, dateTo }),
     apiClient.getTasksWithFilters({ workspaceId: currentWorkspace.id, dateFrom, dateTo }),
     apiClient.getWorkspaceMembers(currentWorkspace.id)  // ← Added
   ]);
   ```

4. **Created assignment handler**:
   ```typescript
   const handleAssignTask = async (taskId: string, assignedTo: string | null) => {
     setAssigningTaskId(taskId);
     await apiClient.assignTask(taskId, { assignedTo });
     // Refresh tasks list to show updated assignee
   };
   ```

5. **UI Features**:
   - Select dropdown styled to match dark theme
   - Shows member names with roles (Owner/Admin badges)
   - Green dot indicates active members
   - Loading state prevents double-clicks
   - Auto-refreshes table after assignment
   - Gracefully falls back to text display for single-member workspaces

**Conditional Display Logic**:
```typescript
{workspaceMembers.length > 1 && task.status !== 'completed' ? (
  <Select>...</Select>  // ← Show dropdown
) : (
  <span>{task.assignee_name || 'Unassigned'}</span>  // ← Show text only
)}
```

**User Experience**:
- **Team dashboard view** → See unassigned task → Click dropdown → Select member → Task immediately assigned
- No need to go to task form or separate assignment page
- Inline editing for quick task management
- Visual feedback with disabled state during assignment

**API Endpoint Used**:
- `PUT /api/tasks/:id/assign` - Assign/reassign task to team member

**When It Shows**:
- ✅ Workspace has 2+ members
- ✅ Task is not completed
- ❌ Single-member workspace (shows text only)
- ❌ Completed task (shows assigned name only)

**Key Learning**:
- **Inline editing improves UX** - No need to navigate away from dashboard
- **Fetch members once** - Load members in parallel with other dashboard data
- **Conditional UI** - Only show interactive elements when they make sense
- **Show loading states** - Prevent confusion during async operations
- **Auto-refresh after changes** - Keep UI in sync with database

## Task Assignment Not Working - Wrong Worker File Deployed (October 15, 2025)

### Issue: Task Assignment Not Being Saved to Database
**Problem**: Even though the task form had assignment selection and the backend code existed, tasks were not being assigned - `assigned_to` was NULL in the database for all new tasks.

**Root Cause**: 
- Updated task assignment code was in `tasks-updated.ts` file
- But `index.ts` was importing from `tasks.ts` (the old file without assignment support)
- Last deployment was Oct 13, before team features were added (Oct 15)
- **The wrong version of the worker was deployed!**

**How To Detect**:
```bash
# Check database - all recent tasks show NULL
SELECT assigned_to, assigned_by FROM tasks ORDER BY created_at DESC LIMIT 5;
# Result: assigned_to = null, assigned_by = null

# Check deployment date
wrangler deployments list --env development | head -5
# Result: Oct 13 (before features were added)

# Check which file is imported
cat src/index.ts | grep tasks
# Result: import tasks from './workers/tasks';  (importing old file!)
```

**The Files**:
- `tasks.ts` - Old version (11,950 bytes) ❌ Being used
- `tasks-updated.ts` - New version with assignment (13,632 bytes) ✅ Not deployed
- `tasks-backup.ts` - Backup copy

**Solution**:
1. **Replaced old file with new version**:
   ```bash
   cp tasks.ts tasks-old-backup.ts        # Backup old
   cp tasks-updated.ts tasks.ts           # Replace with new
   ```

2. **Deployed updated worker**:
   ```bash
   wrangler deploy --env development
   # Result: Deployed successfully ✅
   ```

3. **Verified fix**:
   - Create new task with assignment
   - Check database to confirm `assigned_to` is saved
   - Check Team Dashboard shows assignee name

**Key Learning**: 
- **Deploy after making changes** - Code in files doesn't matter if not deployed!
- **Check deployment date** - Make sure worker is deployed after feature was added
- **Use correct file names** - If you have `file-updated.ts`, either:
  - Replace the original `file.ts` with it, OR
  - Update imports in `index.ts` to use the new file
- **Don't create multiple versions of files** - Causes confusion about which one is active
- **Test in production/dev** - Not just locally
- **Check last deployment date vs last code change date**

**Deployment Checklist**:
```bash
# 1. Check what's currently deployed
wrangler deployments list --env development | head -3

# 2. Check if you have multiple versions of files
ls -la src/workers/tasks*.ts

# 3. Make sure correct file is imported
grep "import tasks" src/index.ts

# 4. Deploy the changes
wrangler deploy --env development

# 5. Verify deployment worked
# Check new deployment timestamp appears in list
```

**Don't Do This**:
❌ Create `file-updated.ts` without replacing original
❌ Assume code works because it's in a file
❌ Skip deployment after making changes
❌ Forget which file is being imported
❌ Have multiple versions of the same worker file

**Do This Instead**:
✅ Replace original file when updating: `mv file-updated.ts file.ts`
✅ Deploy immediately after code changes
✅ Check deployment timestamp matches your changes
✅ Keep one version of each worker file
✅ Test in dev environment after deployment
✅ Delete backup files once deployment is verified

## Task Assignment Field Name Mismatch (October 15, 2025)

### Issue: Assigned Tasks Showing as "Unassigned"
**Problem**: Tasks assigned to team members in the task form were showing as "Unassigned" in the Team Dashboard, even though the assignment was saved correctly in the database.

**Root Cause**: 
- Backend API returns `assignee_name` field (from JOIN with users table)
- TeamDashboard component was looking for `assigned_to_name` field
- Field name mismatch caused the assignee name to not display

**How To Detect**:
```typescript
// Backend (tasks-updated.ts) returns:
SELECT
  t.*,
  assignee.name as assignee_name,  // ← Returns 'assignee_name'
  assignee.email as assignee_email
FROM tasks t
LEFT JOIN users assignee ON t.assigned_to = assignee.id

// Frontend (TeamDashboard.tsx) was looking for:
{task.assigned_to_name || 'Unassigned'}  // ← Looking for 'assigned_to_name' ❌
```

**Solution**:
1. **Updated TypeScript interface** to match backend response:
   ```typescript
   interface Task {
     id: string;
     task_name: string;
     assigned_to?: string;        // ← User ID
     assignee_name?: string;       // ← User's name (from JOIN)
     duration_minutes?: number;
   }
   ```

2. **Updated JSX to use correct field**:
   ```typescript
   // Before:
   {task.assigned_to_name || 'Unassigned'}
   
   // After:
   {task.assignee_name || 'Unassigned'}
   ```

**Verification**:
- TaskList.tsx uses `assignee_name` ✅
- TaskDetailView likely uses `assignee_name` ✅
- TeamDashboard now uses `assignee_name` ✅

**Key Learning**: 
- **Check field names from backend** - Don't assume field names, verify what the API actually returns
- **Use consistent naming** - Backend should document what fields it returns
- **Test with real data** - Mock data can hide field name mismatches
- **TypeScript interfaces should match API response exactly**
- **Check all components** - If one component works, others using same data should use same fields

**How Field Naming Works**:
```
Database Column → SQL Alias → API Response → Frontend Interface
-------------   -----------   ------------   -------------------
assigned_to     (user ID)     assigned_to    assigned_to
users.name  →   assignee_name → assignee_name → assignee_name
users.email →   assignee_email→ assignee_email→ assignee_email
```

**Don't Do This**:
❌ Assume field names without checking API response
❌ Use different field names across components
❌ Rely on fallback text to hide missing data
❌ Skip testing assignment display after implementing assignment feature

**Do This Instead**:
✅ Check API response to see exact field names returned
✅ Use consistent field names across all components
✅ Match TypeScript interfaces to API response
✅ Test the full flow: create → save → display
✅ Use same field names in TaskList, TeamDashboard, and other views

## Pending Invitations UI - Missing Feature (October 15, 2025)

### Issue: No Way for Invited Users to Accept Invitations
**Problem**: Users invited to workspaces had no UI to see or respond to their invitations, even though the backend API and database tables existed.

**Root Cause**: 
- Backend APIs were fully implemented (`/api/invitations/pending`, `/api/invitations/:token/accept`, etc.)
- API client methods existed (`getPendingInvitations`, `acceptInvitation`, `declineInvitation`)
- But no frontend component was created to display and handle invitations
- Only the admin/sender side was implemented (TeamManagement page)

**What Was Missing**:
- ❌ No component to fetch and display pending invitations
- ❌ No UI for invited users to accept/decline
- ❌ No way to see invitation details (workspace name, inviter, role, expiration)

**Solution**:
1. **Created `PendingInvitations.tsx` component**:
   - Fetches pending invitations on mount
   - Displays beautiful gradient banner for each invitation
   - Shows workspace name, inviter name, role, and expiration date
   - Accept and Decline buttons with loading states
   - Dismisses expired invitations
   - Auto-refreshes workspace list after acceptance

2. **Key Features Implemented**:
   ```typescript
   // Fetch pending invitations
   const response = await apiClient.getPendingInvitations();
   
   // Accept invitation
   await apiClient.acceptInvitation(invitation.token);
   await refreshWorkspaces(); // Refresh to show new workspace
   
   // Decline invitation
   await apiClient.declineInvitation(invitation.token);
   ```

3. **UI Design**:
   - Blue gradient banner (matches theme)
   - Prominent placement after clock-in widget
   - Shows all invitation details clearly
   - Handles expired invitations gracefully
   - Loading states during API calls
   - Success/error messages

4. **Integrated into App.tsx**:
   - Added component import
   - Placed strategically between ClockInOut and TabNavigation
   - Only shows when user has pending invitations

**Key Learning**: 
- **Complete the user journey** - Don't just build the backend or admin side
- **Check both sides of features** - sender AND receiver experiences
- **Backend-first can hide gaps** - Having APIs doesn't mean users can use the feature
- **Test from user perspective** - "Can I actually do what I'm supposed to do?"
- **Don't assume components exist** - Verify UI exists for all user actions

**User Flow Now Complete**:
1. ✅ Admin sends invitation (TeamManagement page)
2. ✅ Invitation stored in database with token
3. ✅ Invited user logs in
4. ✅ **NEW: Banner shows pending invitation**
5. ✅ **NEW: User can accept/decline**
6. ✅ Workspace list updates automatically
7. ✅ User can access new workspace immediately

**Component Structure**:
```
PendingInvitations.tsx
├── Fetches invitations on mount
├── Maps each invitation to banner
├── Shows invitation details
│   ├── Workspace name
│   ├── Inviter name  
│   ├── Role (admin/member)
│   └── Expiration date
├── Action buttons
│   ├── Accept (white button)
│   ├── Decline (transparent button)
│   └── Dismiss (for expired)
└── Auto-hides when no invitations
```

**Don't Do This**:
❌ Build backend without corresponding frontend
❌ Only implement admin/sender side of two-way features
❌ Assume users will find a way to use features
❌ Skip testing the complete user journey

**Do This Instead**:
✅ Build complete user flows from start to finish
✅ Test both sides of interactions (sender + receiver)
✅ Create UI for every user action your API supports
✅ Place UI prominently so users notice it
✅ Test by pretending to be each type of user

## Team Dashboard - Real Data Integration (October 15, 2025)

### Issue: Mock Data vs Real Data Field Mismatch
**Problem**: `Uncaught ReferenceError: teamPerformance is not defined` - Team Dashboard was using hardcoded mock data instead of fetching real data from D1 database.

**Root Cause**: 
- Dashboard component had static mock data arrays (`teamPerformance`, `recentTasks`, etc.)
- Field names in mock data didn't match actual database schema
- No API calls were being made to fetch real data

**Solution**:
1. **Added proper imports and hooks**:
   - Imported `useState`, `useEffect` for state management
   - Added `useWorkspace` hook to get current workspace context
   - Added `apiClient` for API calls

2. **Created TypeScript interfaces for type safety**:
   ```typescript
   interface TeamMember {
     user_id: string;
     user_name: string;
     total_tasks: number;
     completed_tasks: number;
     completion_rate: string;
     total_hours: string;
   }
   ```

3. **Implemented data fetching with parallel API calls**:
   ```typescript
   const [performanceData, tasksData, hoursData, tasksListData] = await Promise.all([
     apiClient.getPerformanceReport(currentWorkspace.id, { dateFrom, dateTo }),
     apiClient.getTasksReport(currentWorkspace.id, { dateFrom, dateTo }),
     apiClient.getHoursReport(currentWorkspace.id, { dateFrom, dateTo }),
     apiClient.getTasksWithFilters({ workspaceId: currentWorkspace.id, dateFrom, dateTo })
   ]);
   ```

4. **Updated JSX to use real data fields**:
   - Changed `teamPerformance.map()` → `teamMembers.map()`
   - Changed `member.name` → `member.user_name`
   - Changed `member.tasks` → `member.total_tasks`
   - Changed `member.hours` → `member.total_hours`
   - Changed `task.title` → `task.task_name`
   - Changed `task.assignee` → `task.assigned_to_name`
   - Changed `task.duration` → `formatDuration(task.duration_minutes)`

5. **Added helper functions**:
   - `getInitials(name)` - Extract initials from full name
   - `getAvatarColor(index)` - Cycle through color palette
   - `formatDate(dateString)` - Format ISO dates to readable format
   - `formatDuration(minutes)` - Convert minutes to HH:MM format
   - `getDateRange(range)` - Calculate date range from selection

6. **Added loading and error states**:
   - Loading spinner while fetching data
   - Error message display
   - Empty state handling for no data

7. **Made date range selector functional**:
   - Added `value={dateRange}` and `onChange` handler
   - Re-fetch data when date range changes via `useEffect` dependency

**Key Learning**: 
- **Always match field names** between backend API response and frontend component
- **Use TypeScript interfaces** to catch field name mismatches at compile time
- **Fetch data in parallel** when multiple independent API calls are needed
- **Add loading/error states** for better UX
- **Test with real data** - mock data hides integration issues
- **Use helper functions** for formatting to keep JSX clean

**Database Verification**:
Confirmed remote D1 database has all required tables:
- ✅ `workspaces` (11 records)
- ✅ `workspace_members` (11 records)
- ✅ `tasks` (52 workspace-scoped)
- ✅ `time_sessions` (16 workspace-scoped)

**API Endpoints Used**:
- `GET /api/workspaces/{id}/reports/performance` - Team member stats
- `GET /api/workspaces/{id}/reports/tasks` - Task statistics
- `GET /api/workspaces/{id}/reports/hours` - Hours logged
- `GET /api/tasks?workspaceId={id}&dateFrom={date}&dateTo={date}` - Recent tasks list

**Don't Do This**:
❌ Use mock data in production components
❌ Assume field names without checking API response
❌ Forget to add loading states for async operations
❌ Hard-code workspace names instead of using current workspace

**Do This Instead**:
✅ Fetch real data from API on component mount
✅ Use TypeScript interfaces matching backend schema
✅ Add loading, error, and empty states
✅ Use workspace context for dynamic data
✅ Format data with helper functions
✅ Make controls functional (date range selector)

## Asana Integration Features (October 15, 2025)

### Issue: Per-Task Project Selection
**Problem**: Users couldn't select specific Asana projects when creating tasks - all tasks went to the default project.

**Root Cause**: 
- The `createAsanaTask` function didn't accept a project ID parameter
- Frontend wasn't passing the selected project ID to the backend

**Solution**:
1. Added `asanaProjectId` to `CreateTaskRequest` interface
2. Updated `createAsanaTask(env, userId, taskName, description, specificProjectId?)` to accept optional project ID
3. Modified logic to use `specificProjectId || config?.project_gid` for flexibility
4. Updated TaskForm to include workspace and project selection dropdowns
5. Used `__default__` as placeholder value since Radix UI Select doesn't allow empty strings

**Key Learning**: Always use a non-empty placeholder value for Radix UI Select components. Empty strings cause errors.

### Issue: Asana Import Button Visibility
**Problem**: Import button showed for all users, even without Asana integration.

**Solution**:
1. Added `hasAsanaIntegration` state in App.tsx
2. Created `checkAsanaIntegration()` function to verify integration is active and has API key
3. Conditionally render import button with `{hasAsanaIntegration && <button>...}`

**Key Learning**: Always check feature prerequisites before showing UI elements.

### Issue: Project Search Performance
**Problem**: Users with many projects needed way to quickly find specific projects.

**Solution**:
1. Added `projectSearchQuery` state
2. Implemented `filteredProjects` computed value with case-insensitive search
3. Added skeleton loader (5 animated placeholder cards) while projects load
4. Disabled search input during loading state

**Key Learning**: 
- Skeleton loaders improve perceived performance
- Simple array `.filter()` with `.toLowerCase()` works well for small datasets
- Always disable inputs during loading states

### Issue: Project-Specific Import Failures
**Problem**: Some Asana projects returned 400 errors when fetching tasks, while others worked fine.

**Root Cause**: Project-specific permissions, privacy settings, or archived status.

**Solution**:
1. Added detailed error logging with emoji markers (📥, ❌, ✅)
2. Improved error messages to mention possible causes (private, archived, inaccessible)
3. Gracefully handle errors per project instead of blocking entire feature

**Key Learning**: 
- Not all API failures are code bugs - permissions and data state matter
- Provide helpful error messages that guide users to solutions
- Test with multiple data scenarios (empty projects, private projects, etc.)

### Best Practices Applied
1. **Environment-Specific Deployments**: Always deploy to dev environment with `--env development` flag
2. **Controlled Components**: Use defined values (`__default__`) instead of undefined/empty for Select components
3. **Loading States**: Show skeletons during async operations
4. **Conditional Rendering**: Check prerequisites before showing features
5. **Error Handling**: Provide specific, actionable error messages
6. **Console Logging**: Use emoji markers for easy log filtering in production

### Commands Used
```bash
# Deploy to development environment (with all bindings)
npx wrangler deploy --env development

# Deploy to production (wrong - no bindings)
npx wrangler deploy
```

### Code Patterns
```typescript
// Correct: Radix UI Select with placeholder value
<Select value={formData.asanaProjectId || '__default__'}>
  <SelectItem value="__default__">Use default</SelectItem>
  <SelectItem value="real-id">Real Project</SelectItem>
</Select>

// Correct: Conditional feature rendering
{hasAsanaIntegration && <ImportButton />}

// Correct: Skeleton loader pattern
{isLoading ? (
  <>{[1,2,3,4,5].map(i => <SkeletonCard key={i} />)}</>
) : (
  <ActualContent />
)}
```
