# Lessons Learned

## New User Signup - No Default Workspace Created (October 15, 2025)

### Issue: "No workspace found" Error When New User Creates Task
**Problem**: New user TEST11 signed up successfully, but when trying to create a task, got error: "No workspace found. Please create or join a workspace first."

**Root Cause**: 
- Signup endpoint only created user and settings
- Did NOT create a default workspace for new users
- Workspaces only existed when users were invited by others
- New solo users couldn't use the app without being invited first

**How To Detect**:
```typescript
// Signup was doing:
1. Create user
2. Create settings
// ❌ Missing: Create workspace!

// Task creation fails:
Error: No workspace found. Please create or join a workspace first.
```

**Solution**:
Added automatic workspace creation in signup endpoint:

```typescript
// After creating user and settings
// Create default workspace for new user
const workspaceId = generateId();
const workspaceName = name ? `${name}'s Workspace` : 'My Workspace';

await c.env.DB.prepare(`
  INSERT INTO workspaces (id, name, owner_id, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?)
`).bind(workspaceId, workspaceName, userId, now, now).run();

// Add user as owner of the workspace
await c.env.DB.prepare(`
  INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at)
  VALUES (?, ?, ?, ?, ?)
`).bind(generateId(), workspaceId, userId, 'owner', now).run();
```

**Key Features**:
- ✅ **Personal workspace name**: "{Name}'s Workspace" or "My Workspace"
- ✅ **User is owner**: Full control over their workspace
- ✅ **Automatic**: No manual setup required
- ✅ **Immediate productivity**: Can create tasks right after signup

**Result**:
- ✅ New users get their own workspace automatically
- ✅ Can create tasks immediately after signup
- ✅ No need to wait for invitation
- ✅ User is owner with full permissions

**Key Learning**: 
- **Every user needs a workspace** - Core requirement for multi-tenant SaaS
- **Minimize onboarding friction** - Auto-create essential resources
- **Test the complete signup flow** - Don't stop at "user created", test actual usage
- **Handle existing users** - Need migration/fix for users who signed up before this fix

**Database Column Gotcha**:
- Initial code used `created_by` but schema has `owner_id`
- Always check actual schema before writing INSERT queries
- Use `PRAGMA table_info(table_name)` to verify columns

**Don't Do This**:
❌ Require manual workspace creation after signup
❌ Leave new users stranded without workspaces
❌ Assume column names without checking schema
❌ Only test "user created", not "user can use app"

**Do This Instead**:
✅ Auto-create all required resources at signup
✅ Test the complete user journey from signup → first action
✅ Verify database schema before writing queries
✅ Handle existing users who signed up before the fix
✅ Make onboarding smooth and automatic

**Fixing Existing Users**:
```sql
-- Create workspace for existing user
INSERT INTO workspaces (id, name, owner_id, created_at, updated_at)
VALUES ('ws_id', "User's Workspace", 'user_id', datetime('now'), datetime('now'));

-- Add as owner
INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at)
VALUES ('wm_id', 'ws_id', 'user_id', 'owner', datetime('now'));
```

## Update/Complete Task Endpoint - PATCH Missing (October 15, 2025)

### Issue: 404 Error When Completing/Updating Tasks
**Problem**: Frontend shows "Failed to complete task" with console error: `PATCH https://task-manager-api-dev.../api/tasks/:id 404 (Not Found)`

**Root Cause**: 
- Frontend calls `PATCH /api/tasks/:id` for general updates (including completing tasks)
- Backend only had `POST /api/tasks/:id/complete` endpoint
- Missing `tasks.patch('/:id', ...)` handler for general task updates

**How To Detect**:
```
Console Error:
PATCH https://task-manager-api-dev.../api/tasks/2fa4817d... 404 (Not Found)
Error completing task: Error: Not found

// Frontend calling:
async updateTask(id: string, updates: { status?: string; notes?: string; actualTime?: string }) {
  return this.patch(`/api/tasks/${id}`, updates);  ← PATCH request
}

// Backend only has:
tasks.post('/:id/complete', ...)  ← POST /complete, not PATCH /:id
```

**Solution**:
Added PATCH endpoint for general task updates:

```typescript
tasks.patch('/:id', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  const taskId = c.req.param('id');
  const body = await c.req.json();

  // Build dynamic update query
  const updates: string[] = [];
  const bindings: any[] = [];

  if (body.taskName !== undefined) {
    updates.push('task_name = ?');
    bindings.push(body.taskName);
  }
  if (body.status !== undefined) {
    updates.push('status = ?');
    bindings.push(body.status);
    
    // If marking as completed, set completed_at
    if (body.status === 'completed') {
      updates.push('completed_at = ?');
      bindings.push(now);
    }
  }
  // ... other fields

  const query = `UPDATE tasks SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`;
  await c.env.DB.prepare(query).bind(...bindings, taskId, auth.userId).run();

  return c.json({ success: true });
});
```

**Key Features**:
- ✅ **Dynamic updates**: Only updates fields that are provided
- ✅ **Auto-complete timestamp**: Sets `completed_at` when status becomes 'completed'
- ✅ **Flexible**: Can update any combination of fields
- ✅ **Secure**: Only owner can update their tasks

**Result**:
- ✅ Users can complete tasks (status → completed)
- ✅ Users can update task properties
- ✅ Frontend and backend now aligned on PATCH method

**Key Learning**: 
- **Match frontend and backend HTTP methods** - If frontend uses PATCH, backend must have PATCH handler
- **PATCH for partial updates** - Perfect for updating specific fields without replacing the whole resource
- **POST vs PATCH** - POST for actions (/complete), PATCH for property updates
- **Dynamic query building** - Build SQL based on what fields are actually provided

**Don't Do This**:
❌ Have frontend use PATCH but backend only support POST
❌ Require all fields in PATCH requests
❌ Use POST for updates (use PATCH instead)
❌ Forget to set completion timestamps

**Do This Instead**:
✅ Implement PATCH for partial updates
✅ Build dynamic queries based on provided fields
✅ Auto-set related fields (like completed_at when status = completed)
✅ Keep frontend/backend HTTP methods consistent
✅ Use semantic HTTP verbs: GET (read), POST (create/action), PUT (replace), PATCH (update), DELETE (remove)

## Delete Task Endpoint - Missing from Worker (October 15, 2025)

### Issue: 404 Error When Deleting Tasks
**Problem**: Frontend shows "Failed to delete task" with console error: `DELETE https://api.workoto.app/api/tasks/:id 404 (Not Found)`

**Root Cause**: 
- DELETE endpoint was **missing** from `tasks.ts` worker
- File got truncated when replacing content from `tasks-updated.ts`
- Only had GET, POST (create/complete), and PUT (assign) endpoints
- Missing `tasks.delete('/:id', ...)` handler

**How To Detect**:
```
Console Error:
DELETE https://api.workoto.app/api/tasks/a4b06764.../  404 (Not Found)
Error deleting task: Error: Not found

// Check backend - no DELETE handler!
grep "tasks.delete" cloudflare-workers/src/workers/tasks.ts
// → No results
```

**Solution**:
Added DELETE endpoint to tasks.ts:

```typescript
tasks.delete('/:id', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  const taskId = c.req.param('id');

  // Get task to verify ownership or workspace access
  const task = await c.env.DB.prepare(`
    SELECT t.*, wm.role
    FROM tasks t
    LEFT JOIN workspace_members wm ON t.workspace_id = wm.workspace_id AND wm.user_id = ?
    WHERE t.id = ?
  `).bind(auth.userId, taskId).first();

  if (!task) {
    return c.json({ error: 'Task not found' }, 404);
  }

  // Check permissions: task owner OR workspace owner/admin
  const canDelete = task.user_id === auth.userId || 
                    (task.workspace_id && (task.role === 'owner' || task.role === 'admin'));

  if (!canDelete) {
    return c.json({ error: 'Permission denied' }, 403);
  }

  // Delete the task
  await c.env.DB.prepare(`DELETE FROM tasks WHERE id = ?`).bind(taskId).run();

  return c.json({ success: true, message: 'Task deleted successfully' });
});
```

**Key Features**:
- ✅ **Permission checking**: Task owner OR workspace admin/owner can delete
- ✅ **Proper error handling**: 404 if not found, 403 if no permission
- ✅ **Workspace support**: Checks workspace membership for team tasks

**Result**:
- ✅ Users can delete their own tasks
- ✅ Workspace admins/owners can delete team tasks
- ✅ Proper authorization prevents unauthorized deletions

**Key Learning**: 
- **Always implement CRUD endpoints** - Create, Read, Update, AND Delete
- **Check file completeness after copying** - Verify endpoints weren't truncated
- **Test all operations** - Don't assume endpoints exist without testing
- **Permission checks are critical** - Who can delete what?

**Don't Do This**:
❌ Copy/paste code without verifying completeness
❌ Assume all CRUD operations exist without testing
❌ Skip permission checks for destructive operations
❌ Allow anyone to delete any task

**Do This Instead**:
✅ Verify all required endpoints are present after copying
✅ Test each CRUD operation (Create, Read, Update, Delete)
✅ Implement proper permission checks for sensitive operations
✅ Use role-based access for workspace features
✅ Return appropriate HTTP status codes (404, 403, 200)

## Email Invitation - Wrong Email Logged In (October 15, 2025)

### Issue: "Invitation not found or already used" When Accepting Valid Invitation
**Problem**: When clicking invitation link, getting 404 error "Invitation not found or already used" even though the invitation is valid and pending in the database.

**Root Cause**: 
- Backend accept endpoint checks if **logged-in user's email matches invitation email**
- Invitation was sent to: `itnetworking.learning@gmail.com`
- User was logged in as: `benjiemalinao87@gmail.com` (different email!)
- Backend query: `WHERE token = ? AND email = ? AND status = 'pending'` ← email must match!

**How To Detect**:
```sql
-- Check invitation
SELECT email, status FROM workspace_invitations WHERE token = '403c2796...';
-- Result: email = 'itnetworking.learning@gmail.com', status = 'pending'

-- But user logged in as different email!
-- Backend rejects because emails don't match
```

**Solution**:
User must either:
1. **Logout** and sign up with the invited email (`itnetworking.learning@gmail.com`)
2. OR have the admin **resend invitation to the correct email**

**Improved error message**:
```typescript
if (err.message?.includes('not found or already used')) {
  errorMessage = 'This invitation is either invalid, expired, or was sent to a different email address. Please check that you\'re logged in with the correct email, or contact the person who invited you.';
}
```

**Result**:
- ✅ Clear error message explains the email mismatch issue
- ✅ Users know they need to use the correct email
- ✅ Prevents confusion about "invitation not found"

**Key Learning**: 
- **Email matching is enforced for security** - Can't accept invitations sent to other emails
- **Provide clear error messages** - Don't just say "not found", explain possible causes
- **Consider showing invited email** - Display "Invitation for: email@example.com" on the page
- **Backend validation is necessary** - Prevents unauthorized workspace access

**Don't Do This**:
❌ Allow any logged-in user to accept any invitation (security risk!)
❌ Show generic "not found" error without explanation
❌ Assume user knows they need to match the invited email
❌ Skip email validation on backend

**Do This Instead**:
✅ Enforce email matching for invitation acceptance
✅ Provide helpful error messages mentioning email mismatch
✅ Show invited email on acceptance page for clarity
✅ Validate both token AND email on backend
✅ Suggest "logout and signup with correct email" in error

## Email Invitation Links - Missing Accept Route (October 15, 2025)

### Issue: Invitation Link Redirects to Main App Instead of Acceptance Page
**Problem**: When clicking the email invitation link `http://localhost:5173/accept-invitation?token=...`, it immediately redirects to the main app at `http://localhost:5173/` instead of showing an invitation acceptance page.

**Root Cause**: 
- No `/accept-invitation` route existed in the React app
- Catch-all route `<Route path="*" element={<Navigate to="/" replace />} />` was redirecting unknown routes to home
- App had no UI for new users to create account and accept invitation via email link

**How To Detect**:
```typescript
// App.tsx routes - /accept-invitation was missing!
<Routes>
  <Route path="/" element={<TaskManager />} />
  <Route path="/task/:taskId" element={<TaskDetailView />} />
  <Route path="/team-dashboard" element={<TeamDashboard />} />
  <Route path="/time-reports" element={<TimeReports />} />
  {/* Missing: /accept-invitation route */}
  <Route path="*" element={<Navigate to="/" replace />} /> {/* This catches /accept-invitation! */}
</Routes>
```

**Solution**:
Created `AcceptInvitation.tsx` component and added route:

**Component Features**:
1. **Extracts token from URL** using `useSearchParams()`
2. **Auto-accepts if logged in** - existing users don't need to re-authenticate
3. **Shows signup form for new users** - beautiful onboarding experience
4. **Switch between login/signup** - for users who already have accounts
5. **Success/error states** - clear feedback with loading, success, and error messages
6. **Auto-redirect after acceptance** - takes user to main app after 2 seconds

**Added Route**:
```typescript
<Route path="/accept-invitation" element={<AcceptInvitation />} />
```

**User Flows**:
1. **Existing User Flow**:
   - Click email link → Already logged in → Auto-accepts → Success message → Redirects to app ✅

2. **New User Flow**:
   - Click email link → Not logged in → Signup form shown → Create account → Auto-accepts → Success → Redirects ✅

3. **Existing User (Not Logged In) Flow**:
   - Click email link → Not logged in → Signup form → "Already have account?" link → Login form → Auto-accepts ✅

**Result**:
- ✅ Email invitation links now work for both new and existing users
- ✅ Beautiful branded UI for invitation acceptance
- ✅ Smooth authentication flow integrated with invitation
- ✅ Clear success/error messaging
- ✅ Auto-redirect after successful acceptance

**Key Learning**: 
- **Always create routes for email links** - Don't assume users are logged in
- **Handle both authenticated and unauthenticated states** - Email recipients may or may not have accounts
- **Use URL params for tokens** - `useSearchParams()` for accessing query parameters
- **Catch-all routes come last** - Place `path="*"` as the last route to avoid catching valid routes
- **Consider the full user journey** - Email link → Landing page → Auth → Acceptance → Redirect

**Don't Do This**:
❌ Send email links without implementing the frontend route
❌ Assume all invitation recipients are already logged in
❌ Place catch-all route before specific routes
❌ Forget to handle error cases (invalid token, expired invitation)
❌ Skip the success feedback - users need confirmation

**Do This Instead**:
✅ Create dedicated route for email link destinations
✅ Handle both logged-in and logged-out user states
✅ Show clear signup/login options for new users
✅ Auto-accept for already authenticated users
✅ Provide clear success/error messages
✅ Test the complete flow: email → click → auth → acceptance

## Email Invitation Links - Wrong Domain (October 15, 2025)

### Issue: Invitation Email Links Point to Wrong/Non-Existent Domain
**Problem**: Invitation emails were sent successfully and looked great, but clicking "Accept Invitation" button led to `app.workoto.com` which gives `DNS_PROBE_FINISHED_NXDOMAIN` error. The actual production frontend is at `https://www.workoto.app/`.

**Root Cause**: 
- Invitation email template uses `c.env.FRONTEND_URL || 'https://app.workoto.com'` for the invitation link
- `FRONTEND_URL` environment variable was **not configured** in `wrangler.toml`
- Fell back to hardcoded **wrong domain** `app.workoto.com` (should be `www.workoto.app`)
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
FRONTEND_URL = "https://www.workoto.app"
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

## Workspace Member Role Management (October 16, 2025)

### Issue: No Way for Workspace Owners to Change Member Roles
**Problem**: Workspace owners couldn't change member roles from admin to member or vice versa. Members were stuck with the role they were invited with, requiring removal and re-invitation to change roles.

**Root Cause**: 
- Backend had no endpoint to update member roles
- Frontend TeamManagement component showed static role badges with no edit functionality
- Only way to change roles was to remove member and send new invitation with different role

**What Was Missing**:
- ❌ No API endpoint for updating workspace member roles
- ❌ No UI for owners to change member roles
- ❌ No permission checks for role changes
- ❌ Static role display with no interaction

**Solution**:

1. **Added Backend API Endpoint** (`cloudflare-workers/src/workers/workspaces.ts`):
   ```typescript
   // PATCH /api/workspaces/:id/members/:userId/role
   workspaces.patch('/:id/members/:userId/role', async (c) => {
     const auth = await requireAuth(c.req.raw, c.env);
     const workspaceId = c.req.param('id');
     const userIdToUpdate = c.req.param('userId');
     
     // Only workspace owner can change roles
     const requesterMembership = await c.env.DB.prepare(`
       SELECT role FROM workspace_members
       WHERE workspace_id = ? AND user_id = ?
     `).bind(workspaceId, auth.userId).first<{ role: string }>();

     if (!requesterMembership || requesterMembership.role !== 'owner') {
       return c.json({ error: 'Permission denied. Only workspace owner can change member roles' }, 403);
     }

     const body = await c.req.json<{ role: string }>();

     if (!body.role || (body.role !== 'admin' && body.role !== 'member')) {
       return c.json({ error: 'Invalid role. Must be either "admin" or "member"' }, 400);
     }

     // Cannot change owner role
     const memberToUpdate = await c.env.DB.prepare(`
       SELECT role FROM workspace_members
       WHERE workspace_id = ? AND user_id = ?
     `).bind(workspaceId, userIdToUpdate).first<{ role: string }>();

     if (memberToUpdate.role === 'owner') {
       return c.json({ error: 'Cannot change workspace owner role' }, 400);
     }

     // Update member role
     await c.env.DB.prepare(`
       UPDATE workspace_members
       SET role = ?
       WHERE workspace_id = ? AND user_id = ?
     `).bind(body.role, workspaceId, userIdToUpdate).run();

     return c.json({ 
       success: true, 
       message: `Member role updated to ${body.role} successfully`,
       role: body.role
     });
   });
   ```

2. **Added API Client Method** (`src/lib/api-client.ts`):
   ```typescript
   async updateWorkspaceMemberRole(workspaceId: string, userId: string, role: 'admin' | 'member') {
     return this.patch<{ success: boolean; message: string; role: string }>(
       `/api/workspaces/${workspaceId}/members/${userId}/role`,
       { role }
     );
   }
   ```

3. **Updated Frontend Component** (`src/components/TeamManagement.tsx`):
   - Added `updatingRoleUserId` state to track loading
   - Added `isOwner` check to determine permissions
   - Created `handleRoleChange` function:
     ```typescript
     const handleRoleChange = async (userId: string, newRole: 'admin' | 'member', memberName: string) => {
       if (!currentWorkspace) return;
       
       setUpdatingRoleUserId(userId);
       try {
         await apiClient.updateWorkspaceMemberRole(currentWorkspace.id, userId, newRole);
         alert(`${memberName}'s role has been updated to ${newRole}.`);
         await loadTeamData();
       } catch (error: any) {
         console.error('Error updating member role:', error);
         alert(error.message || 'Failed to update member role. Please try again.');
       } finally {
         setUpdatingRoleUserId(null);
       }
     };
     ```

4. **Updated UI with Role Dropdown**:
   ```typescript
   {isOwner && member.role !== 'owner' ? (
     <Select
       value={member.role}
       onValueChange={(value) => handleRoleChange(member.user_id, value as 'admin' | 'member', member.name || member.email)}
       disabled={updatingRoleUserId === member.user_id}
     >
       <SelectTrigger className={`w-[140px] h-[44px] px-4 border-2 rounded-xl font-bold ${getRoleBadge(member.role)} hover:opacity-80 transition-all disabled:opacity-50`}>
         <div className="flex items-center gap-2">
           {updatingRoleUserId === member.user_id ? (
             <Loader2 className="w-4 h-4 animate-spin" />
           ) : (
             getRoleIcon(member.role)
           )}
           <SelectValue />
         </div>
       </SelectTrigger>
       <SelectContent>
         <SelectItem value="admin">
           <div className="flex items-center gap-2">
             <Shield className="w-4 h-4 text-blue-600" />
             <span className="font-medium">Admin</span>
           </div>
         </SelectItem>
         <SelectItem value="member">
           <div className="flex items-center gap-2">
             <Users className="w-4 h-4 text-gray-600" />
             <span className="font-medium">Member</span>
           </div>
         </SelectItem>
       </SelectContent>
     </Select>
   ) : (
     <span className={`flex items-center gap-2 text-sm px-4 py-2 rounded-xl font-bold border ${getRoleBadge(member.role)}`}>
       {getRoleIcon(member.role)}
       {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
     </span>
   )}
   ```

**Key Features**:
- ✅ **Owner-only permission** - Only workspace owners can change roles
- ✅ **Inline role editing** - Dropdown appears directly in member list
- ✅ **Two roles supported** - Can switch between 'admin' and 'member'
- ✅ **Owner role protected** - Cannot change owner role
- ✅ **Loading states** - Shows spinner during API call
- ✅ **Auto-refresh** - Updates member list after role change
- ✅ **Visual feedback** - Dropdown styled to match role badge colors
- ✅ **Validation** - Backend validates role values

**Permission Structure**:
```
Owner → Can change any member/admin role
Admin → Cannot change roles (read-only view)
Member → Cannot change roles (read-only view)
```

**UI Behavior**:
- **For Owners**: Role badge becomes a clickable dropdown
- **For Admins/Members**: Role badge is static text only
- **For Owner Badge**: Always static (owner role cannot be changed)

**Result**:
- ✅ Workspace owners can promote members to admins
- ✅ Workspace owners can demote admins to members
- ✅ No need to remove and re-invite to change roles
- ✅ Instant role changes with immediate UI feedback
- ✅ Proper permission checks prevent unauthorized changes

**Key Learning**: 
- **Inline editing improves UX** - No need for separate "Edit Role" modal
- **Owner-only restriction** - Role management is a sensitive owner privilege
- **Reuse existing UI components** - Select component works great for role changes
- **Loading states prevent confusion** - Show spinner during async operations
- **Always validate on backend** - Frontend controls are for UX, backend enforces security
- **Cannot change owner role** - Workspace must always have exactly one owner

**API Endpoints**:
- `PATCH /api/workspaces/:id/members/:userId/role` - Update member role

**Response Format**:
```json
{
  "success": true,
  "message": "Member role updated to admin successfully",
  "role": "admin"
}
```

**Error Cases Handled**:
- 403: Not workspace owner
- 400: Invalid role (not 'admin' or 'member')
- 400: Trying to change owner role
- 404: Member not found

**Don't Do This**:
❌ Allow admins to change roles (owner-only privilege)
❌ Allow changing owner role (must always have one owner)
❌ Accept arbitrary role values without validation
❌ Forget to refresh UI after role change
❌ Show role dropdown to non-owners

**Do This Instead**:
✅ Restrict role changes to workspace owners only
✅ Protect owner role from being changed
✅ Validate role values on backend ('admin' or 'member' only)
✅ Auto-refresh member list after successful role change
✅ Show interactive dropdown only to owners
✅ Use loading states to prevent double-clicks
✅ Provide clear success/error messages

**Testing Checklist**:
1. ✅ Owner can change member to admin
2. ✅ Owner can change admin to member
3. ✅ Admin cannot see role dropdowns
4. ✅ Member cannot see role dropdowns
5. ✅ Cannot change owner role (static badge)
6. ✅ Loading spinner shows during update
7. ✅ Success message displays after change
8. ✅ Member list refreshes with new role
9. ✅ Backend validates ownership
10. ✅ Backend validates role values

**CRITICAL DEPLOYMENT RULE**:
⚠️ **ALWAYS deploy to development environment ONLY**
```bash
# ✅ CORRECT - Always use this:
npm run deploy -- --env development

# ❌ WRONG - Never use plain deploy (goes to production):
npm run deploy
wrangler deploy
```

**Why**: Frontend at `localhost:5173` points to `task-manager-api-dev.benjiemalinao879557.workers.dev`, NOT production API. Deploying to production causes 404 errors in local development.

## Task Visibility - Role-Based Permissions (October 16, 2025)

### Issue: Members Can See All Workspace Tasks (Security/Privacy Issue)
**Problem**: When a member role user logged in, they could see ALL tasks in the workspace, including tasks created by the owner that were not assigned to them. This is a major privacy and security issue.

**Root Cause**: 
- Task query in `GET /api/tasks` checked workspace membership but not user role
- Query returned all tasks in the workspace regardless of role
- No filtering applied for member role users
- Members had same visibility as admins/owners

**Security Impact**:
- 🚨 Members could see private/sensitive tasks not meant for them
- 🚨 Members could see unassigned tasks created by owners/admins
- 🚨 No task privacy within workspaces
- 🚨 Violated principle of least privilege

**What Members Could See (WRONG)**:
```sql
-- Old query (no role check)
SELECT * FROM tasks 
WHERE workspace_id = ? 
-- Returns ALL workspace tasks to everyone!
```

**Solution**:
Added role-based filtering to task queries:

**1. For specific workspace queries** (when `workspaceId` is provided):
```typescript
// Check user's role in workspace
const membership = await c.env.DB.prepare(`
  SELECT role FROM workspace_members
  WHERE workspace_id = ? AND user_id = ?
`).bind(workspaceId, auth.userId).first<{ role: string }>();

// Members only see tasks assigned to them OR created by them
if (userRole === 'member') {
  query += ` AND (t.assigned_to = ? OR t.user_id = ?)`;
  bindings.push(auth.userId);
  bindings.push(auth.userId);
}
// Admins and Owners see all workspace tasks
```

**2. For default queries** (no specific workspace):
```typescript
// Apply member restriction across all workspaces
query += ` AND (
  EXISTS (
    SELECT 1 FROM workspace_members wm 
    WHERE wm.workspace_id = t.workspace_id 
    AND wm.user_id = ? 
    AND wm.role IN ('owner', 'admin')
  )
  OR t.assigned_to = ?
  OR t.user_id = ?
)`;
```

**Permission Structure Now**:
```
👑 Owner    → Sees ALL tasks in workspace
🛡️  Admin    → Sees ALL tasks in workspace
👤 Member   → Only sees:
              1. Tasks assigned to them (t.assigned_to = user_id)
              2. Tasks they created (t.user_id = user_id)
```

**What Members See Now (CORRECT)**:
- ✅ Tasks assigned to them
- ✅ Tasks they created
- ❌ Unassigned tasks created by others
- ❌ Tasks assigned to other members
- ❌ Private owner/admin tasks

**Result**:
- ✅ Members have restricted task visibility (privacy protected)
- ✅ Admins can see all workspace tasks (for management)
- ✅ Owners can see all workspace tasks (full control)
- ✅ Follows principle of least privilege
- ✅ Task privacy within workspaces enforced

**Key Learning**: 
- **Role-based access control (RBAC) is critical** - Don't assume workspace membership equals full access
- **Members need restricted visibility** - They should only see what they need to work on
- **Test with different role users** - Login as each role type to verify permissions
- **Security by default** - Start with least privilege, not most
- **Workspace membership ≠ Full access** - Membership grants access, role determines what you can see/do

**Testing Procedure**:
1. Login as workspace owner
2. Create a task (don't assign it)
3. Logout, login as member user
4. ✅ Member should NOT see the unassigned task
5. Owner assigns task to member
6. ✅ Member now sees the task
7. Member creates their own task
8. ✅ Member can see their own task

**SQL Query Patterns**:
```sql
-- For Members (restricted)
WHERE workspace_id = ? 
AND (assigned_to = ? OR user_id = ?)

-- For Admins/Owners (full access)
WHERE workspace_id = ?
```

**Don't Do This**:
❌ Show all workspace tasks to all workspace members
❌ Assume "workspace member" means "can see everything"
❌ Skip role checks in queries
❌ Forget to test with member role users
❌ Give members admin-level visibility

**Do This Instead**:
✅ Filter tasks by user role in every query
✅ Members see only assigned tasks + own tasks
✅ Admins/Owners see all workspace tasks
✅ Test with each role type
✅ Apply principle of least privilege
✅ Check role in both specific and default queries

**Related Endpoints That May Need Similar Fixes**:
- Task detail view (GET /api/tasks/:id)
- Task statistics/reports
- Calendar view
- Any other task listing endpoints

## Member Role - Dashboard/Reports Access Control (October 16, 2025)

### Issue: Members Could Access Team Dashboard and Reports (UI/UX Issue)
**Problem**: Members could navigate to `/team-dashboard` and `/time-reports`, which triggered 403 errors showing "Failed to load dashboard data" with no helpful error message. Members don't need these management views.

**Root Cause**: 
- No role-based UI restrictions on navigation links
- No redirect logic in Dashboard and Reports components
- Generic error messages didn't explain why access was denied
- Members saw navigation links for pages they couldn't access

**User Experience Problems**:
- 🚨 Members saw "Dashboard" and "Reports" links in navigation
- 🚨 Clicking them showed generic "Failed to load dashboard data" error
- 🚨 No explanation about why they couldn't access it
- 🚨 Poor UX - showing links that don't work

**Solution**:

**1. Hide Navigation Links for Members** (`TeamNavigation.tsx`):
```typescript
// Check if user is owner or admin
const canViewReports = currentWorkspace?.role === 'owner' || currentWorkspace?.role === 'admin';

// Conditionally render Dashboard and Reports links
{canViewReports && (
  <button onClick={() => navigate('/team-dashboard')}>
    📊 Dashboard
  </button>
)}

{canViewReports && (
  <button onClick={() => navigate('/time-reports')}>
    ⏱️ Reports
  </button>
)}

// Team link always visible (all roles can see team members)
<button onClick={() => navigate('/team-management')}>
  👥 Team
</button>
```

**2. Auto-Redirect Members** (`TeamDashboard.tsx` and `TimeReports.tsx`):
```typescript
const navigate = useNavigate();

useEffect(() => {
  if (currentWorkspace && currentWorkspace.role === 'member') {
    console.log('Team Dashboard is only available for owners and admins. Redirecting member to tasks page...');
    navigate('/');
  }
}, [currentWorkspace, navigate]);
```

**3. Improved Error Messages**:
```typescript
// Before (generic)
catch (err) {
  setError('Failed to load dashboard data');
}

// After (specific)
catch (err: any) {
  if (err.message?.includes('Permission denied')) {
    setError('Access denied. This dashboard is only available for workspace owners and admins.');
  } else if (err.message?.includes('404')) {
    setError('Dashboard data not found. Please try refreshing the page.');
  } else {
    setError(`Unable to load dashboard: ${err.message || 'Unknown error'}`);
  }
}
```

**UI Behavior Now**:
```
👑 Owner Navigation:   [Back to Tasks] [📊 Dashboard] [👥 Team] [⏱️ Reports]
🛡️  Admin Navigation:   [Back to Tasks] [📊 Dashboard] [👥 Team] [⏱️ Reports]
👤 Member Navigation:  [Back to Tasks] [👥 Team]
```

**What Happens When Member Tries to Access**:
1. **Via URL** (`/team-dashboard`, `/time-reports`): Automatically redirected to `/` (main tasks)
2. **Via Navigation**: Links are hidden - can't click them
3. **Console Message**: Clear log explaining redirect reason

**Result**:
- ✅ Members only see navigation links they can actually use
- ✅ Auto-redirect prevents access to management pages
- ✅ Clear console messages for debugging
- ✅ Specific error messages if API calls fail
- ✅ Clean UX - no broken/inaccessible links

**Key Learning**: 
- **Hide UI elements users can't access** - Don't show navigation links for restricted pages
- **Auto-redirect unauthorized users** - Prevent frustration from seeing errors
- **Provide helpful error messages** - Explain WHY access is denied, not just "failed"
- **Role-based UI rendering** - Use role checks to conditionally show/hide features
- **Test with all user roles** - Verify each role sees appropriate UI

**Navigation Access Matrix**:
```
Page                Owner   Admin   Member
-------------------------------------------
/                   ✅      ✅      ✅
/team-dashboard     ✅      ✅      ❌ (redirected)
/team-management    ✅      ✅      ✅ (view only)
/time-reports       ✅      ✅      ❌ (redirected)
```

**Don't Do This**:
❌ Show navigation links to pages users can't access
❌ Display generic "Failed to load" errors
❌ Let members navigate to management pages only to see errors
❌ Forget to add role checks to navigation components

**Do This Instead**:
✅ Conditionally render navigation links based on user role
✅ Auto-redirect unauthorized users to appropriate pages
✅ Provide specific, helpful error messages
✅ Use console.log to explain redirect reasons (for debugging)
✅ Test navigation and access with each user role
✅ Separate management features (Dashboard/Reports) from general features (Team)
