# Recurring Tasks Feature

## 📋 Overview

The recurring tasks feature allows users to create task patterns that automatically generate task instances on a schedule, similar to Asana's recurring tasks functionality.

## ✅ Completed Work

### 1. Database Schema ✅
**Migration:** `006_add_recurring_tasks.sql`

**New Table: `recurring_patterns`**
- Stores task templates with recurrence rules
- Supports multiple recurrence frequencies
- Tracks occurrence counts and next generation dates

**Updated `tasks` Table:**
- Added `is_recurring` flag
- Added `recurring_pattern_id` foreign key
- Added `recurrence_instance_date` for tracking when instance should occur

**Supported Frequencies:**
- Daily (every X days)
- Weekly (specific days of week)
- Monthly (specific day of month)
- Yearly
- Custom intervals

### 2. Backend API ✅
**Worker:** `cloudflare-workers/src/workers/recurring-tasks.ts`

**Endpoints:**
- `POST /api/recurring-tasks` - Create recurring pattern
- `GET /api/recurring-tasks` - List all patterns
- `GET /api/recurring-tasks/:id` - Get specific pattern
- `PATCH /api/recurring-tasks/:id` - Update pattern
- `DELETE /api/recurring-tasks/:id` - Deactivate pattern
- `POST /api/recurring-tasks/:id/generate` - Manually generate next instance
- `GET /api/recurring-tasks/:id/instances` - Get all instances for a pattern

**Features:**
- Auto-calculation of next occurrence dates
- Support for weekly recurring on specific days (e.g., "Every Tuesday and Thursday")
- Support for monthly recurring on specific day (e.g., "15th of every month")
- Occurrence limits (e.g., "Generate 10 times then stop")
- End dates for patterns
- Workspace integration

### 3. Frontend API Client ✅
**File:** `src/lib/api-client.ts`

**Methods Added:**
```typescript
- createRecurringPattern()
- getRecurringPatterns()
- getRecurringPattern(id)
- updateRecurringPattern(id, updates)
- deleteRecurringPattern(id)
- generateRecurringTaskInstance(id)
- getRecurringTaskInstances(id)
```

## 🚧 Remaining Work

### 1. Frontend Task Form (IN PROGRESS)
**File:** `src/components/TaskFormModal.tsx`

**Changes Needed:**
1. Add "Make this a recurring task" toggle/checkbox
2. When enabled, show recurrence options panel:
   - Frequency selector (Daily/Weekly/Monthly/Yearly)
   - Interval input ("Every X days/weeks/months")
   - For Weekly: Day of week checkboxes (M, T, W, Th, F, Sa, Su)
   - For Monthly: Day of month selector (1-31)
   - Start date picker
   - Optional end date picker
   - Optional occurrence limit
   - Optional time of day

3. Update form submission to call `createRecurringPattern()` instead of `createTask()` when recurring is enabled

**UI Design Suggestions:**
```
┌─────────────────────────────────────┐
│ [✓] Make this a recurring task      │
├─────────────────────────────────────┤
│ Repeat: [Daily ▼] every [1] day(s) │
│                                      │
│ Start date: [Oct 23, 2025]          │
│ End date: [Never ▼]                 │
│                                      │
│ Weekly options (if Weekly):         │
│ ☐ Mon ☐ Tue ☐ Wed ☐ Thu            │
│ ☐ Fri ☐ Sat ☐ Sun                  │
│                                      │
│ Time: [All day ▼] or [09:00]        │
└─────────────────────────────────────┘
```

### 2. Calendar View Integration (PENDING)
**File:** `src/components/CalendarView.tsx`

**Changes Needed:**
1. Fetch recurring patterns for the current month
2. Calculate which dates each pattern should show on
3. Render recurring task indicators on calendar dates
4. Show both generated instances and future occurrences
5. Different styling for:
   - Generated instances (solid)
   - Future occurrences (outlined/dashed)
   - Recurring pattern badge/icon

### 3. Auto-Generation System (PENDING)
**Option A: Scheduled Worker (Recommended)**
- Create a Cloudflare Cron Trigger
- Runs daily to check patterns
- Generates instances for upcoming occurrences

**Option B: On-Demand Generation**
- Generate when user views calendar
- Generate when pattern is accessed
- More immediate but less predictable

**Implementation:**
Create `cloudflare-workers/src/workers/recurring-task-generator.ts`:
```typescript
// Cron handler that runs daily
export async function generateRecurringTasks(env: Env) {
  // Find patterns with next_occurrence_date <= today
  // Generate task instances
  // Update pattern's next_occurrence_date
}
```

Add to `wrangler.toml`:
```toml
[[workflows]]
name = "recurring-task-generator"
script_name = "task-manager-api-dev"
trigger = "0 0 * * *"  # Daily at midnight
```

### 4. Recurring Task List View (PENDING)
**New Component:** `src/components/RecurringTasksList.tsx`

**Features:**
- List all active recurring patterns
- Show next occurrence date
- Show occurrence count (if limited)
- Edit pattern button
- Pause/resume pattern toggle
- View all instances button
- Delete pattern button

### 5. Task Detail Integration (PENDING)
**Files:** 
- `src/components/TaskList.tsx`
- `src/components/TaskDetailView.tsx`

**Changes:**
- Show "🔄 Recurring" badge on recurring task instances
- Link to view the recurring pattern
- Show instance date
- Option to edit future occurrences vs just this instance

## 📊 Example Use Cases

### Example 1: Daily Analytics Check
```
Task: "Check Google Analytics"
Frequency: Daily
Start: Oct 23, 2025
End: Never
Time: 09:00
→ Generates a new task every day at 9am
```

### Example 2: Weekly Team Meeting
```
Task: "Prepare team meeting agenda"
Frequency: Weekly
Days: Tuesday
Start: Oct 23, 2025
End: Dec 31, 2025
Time: 14:00
→ Generates task every Tuesday at 2pm until end of year
```

### Example 3: Monthly Reports
```
Task: "Submit monthly report"
Frequency: Monthly
Day of month: 1
Start: Nov 1, 2025
Occurrences: 12
→ Generates on 1st of each month for 12 months
```

### Example 4: Quarterly Reviews
```
Task: "Conduct quarterly business review"
Frequency: Monthly
Interval: 3 (every 3 months)
Day of month: 15
Start: Jan 15, 2026
→ Generates Jan 15, Apr 15, Jul 15, Oct 15
```

## 🎨 UI/UX Considerations

1. **Clear Visual Distinction**: Recurring tasks should be easily identifiable
2. **Simple Creation Flow**: Don't overwhelm users with options
3. **Smart Defaults**: Pre-fill common patterns
4. **Preview**: Show "Next 3 occurrences" preview before creating
5. **Calendar Integration**: Visual indicators on calendar dates
6. **Bulk Actions**: Ability to pause/delete all future instances
7. **Asana Parity**: Match Asana's UX where possible for familiarity

## 🔧 Technical Notes

### Next Occurrence Calculation
The backend uses a `calculateNextOccurrence()` function that:
- Respects start/end dates
- Honors occurrence limits
- Calculates based on frequency and interval
- Returns null when pattern is exhausted

### Database Efficiency
- Indexes on `next_occurrence_date` for quick querying
- Indexes on `is_recurring` for filtering
- Soft deletes (is_active flag) to preserve history

### Workspace Integration
- Patterns belong to users
- Can be assigned to workspace members
- Respects workspace permissions

## 📝 Next Steps

1. **Complete Task Form UI** - Add recurring options to modal
2. **Test Pattern Creation** - Verify backend endpoints work
3. **Implement Calendar View** - Show recurring tasks
4. **Add Auto-Generator** - Set up cron job
5. **Create Management UI** - List/edit recurring patterns
6. **Testing & Refinement** - User testing and bug fixes

## 🚀 Deployment Status

- ✅ Database migrated (local & remote)
- ✅ Backend deployed
- ⏳ Frontend implementation in progress

