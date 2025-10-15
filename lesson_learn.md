# Lessons Learned

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
