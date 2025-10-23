# Recurring Task Workflow

## 📋 Overview

This document explains how recurring tasks work in the task management system, from creation to completion and automatic regeneration.

---

## 🔄 Complete Workflow

### 1. **Creating a Recurring Task**

When a user creates a recurring task:

1. User fills out the task form and toggles "Make this a recurring task"
2. User configures:
   - **Frequency**: Daily, Weekly, Monthly, Yearly
   - **Interval**: Every N days/weeks/months/years
   - **Days of Week**: For weekly tasks (e.g., Monday, Wednesday, Friday)
   - **Day of Month**: For monthly tasks (e.g., 15th of each month)
   - **Start Date**: When the recurrence begins
   - **End Date** (optional): When the recurrence stops
   - **Max Occurrences** (optional): Limit total instances
   - **Time of Day** (optional): Specific time for the task

3. Backend creates:
   - ✅ **Recurring Pattern** (template in `recurring_patterns` table)
   - ✅ **First Task Instance** (actual task in `tasks` table with status `in_progress`)

4. User sees:
   - Task appears immediately in "Active Tasks"
   - Purple "🔄 Recurring" badge next to task name
   - "This Instance" date showing current occurrence

---

### 2. **Working on a Recurring Task Instance**

The current instance behaves like a normal task:

- ✅ Timer starts automatically
- ✅ User can pause/resume the timer
- ✅ User can add notes, change priority, assign to others
- ✅ Activity tracking monitors work time
- ✅ All task features work normally

**Key Point**: This is a **specific instance** of the recurring pattern, not the pattern itself.

---

### 3. **Completing a Recurring Task Instance**

When user clicks "Complete Task" on a recurring instance:

#### **Step 1: Complete Current Instance**
- Task status changes to `completed`
- Actual time is calculated and saved
- Timer stops and pause state is cleared
- Task moves to "Completed Tasks" section

#### **Step 2: Auto-Generate Next Instance** ✨
- System detects `recurring_pattern_id` exists
- Backend automatically generates the next task instance:
  - Calculates next occurrence date based on pattern
  - Creates new task with:
    - Same task name, description, estimated time
    - Same priority, assignment, and settings
    - Status: `in_progress`
    - Fresh timer (starts at 00:00:00)
    - Links to the same recurring pattern
  - Updates pattern's `next_occurrence_date`
  - Increments `occurrences_count`

#### **Step 3: User Notification**
- Success message shows: 
  > "Great job! Your task has been completed successfully. Next instance scheduled for [date]."
- New instance appears in "Active Tasks" immediately
- User can continue working seamlessly

---

## 📊 Database Structure

### `recurring_patterns` Table
Stores the recurring task template:

```sql
{
  id: "pattern-uuid",
  user_id: "user-uuid",
  task_name: "Check analytics",
  description: "Review daily analytics",
  frequency: "daily",
  interval: 1,
  start_date: "2025-10-23",
  next_occurrence_date: "2025-10-24",
  occurrences_count: 1,
  is_active: 1
}
```

### `tasks` Table
Stores individual task instances:

```sql
{
  id: "task-uuid",
  user_id: "user-uuid",
  task_name: "Check analytics",
  description: "Review daily analytics",
  status: "in_progress",
  is_recurring: 1,
  recurring_pattern_id: "pattern-uuid",
  recurrence_instance_date: "2025-10-23",
  started_at: "2025-10-23T10:00:00Z"
}
```

---

## 🎯 Example Scenarios

### **Scenario 1: Daily Task**
**Pattern**: "Check email" - Every day at 9:00 AM

1. **Oct 23**: First instance created → User completes at 10:30 AM
2. **Oct 24**: Next instance auto-generated → User completes at 9:45 AM
3. **Oct 25**: Next instance auto-generated → User completes at 11:00 AM
4. **Continues daily...**

### **Scenario 2: Weekly Task**
**Pattern**: "Team meeting" - Every Monday and Wednesday

1. **Monday, Oct 21**: First instance created → User completes
2. **Wednesday, Oct 23**: Next instance auto-generated → User completes
3. **Monday, Oct 28**: Next instance auto-generated → User completes
4. **Wednesday, Oct 30**: Next instance auto-generated → User completes
5. **Continues on Mon/Wed...**

### **Scenario 3: Monthly Task with End Date**
**Pattern**: "Monthly report" - 1st of each month, ends after 3 occurrences

1. **Nov 1**: First instance created → User completes
2. **Dec 1**: Next instance auto-generated → User completes
3. **Jan 1**: Next instance auto-generated → User completes
4. **Feb 1**: No new instance (limit reached)

---

## 🔧 Technical Implementation

### Frontend (`TaskList.tsx`)

```typescript
const handleCompleteTask = async (task: Task, notes?: string) => {
  // ... complete the task ...
  
  // If this is a recurring task, generate the next instance
  if (task.recurring_pattern_id) {
    try {
      const result = await apiClient.generateRecurringTaskInstance(
        task.recurring_pattern_id
      );
      showSuccess(
        'Task Completed!',
        `Next instance scheduled for ${result.nextOccurrence}.`
      );
    } catch (error) {
      console.error('Error generating next recurring instance:', error);
    }
  }
  
  await fetchTasks(); // Refresh to show new instance
};
```

### Backend (`recurring-tasks.ts`)

```typescript
// POST /api/recurring-tasks/:id/generate
recurringTasks.post('/:id/generate', async (c) => {
  // 1. Get the recurring pattern
  const pattern = await c.env.DB.prepare(`
    SELECT * FROM recurring_patterns WHERE id = ?
  `).bind(patternId).first();
  
  // 2. Calculate next occurrence date
  const nextOccurrence = calculateNextOccurrence(pattern);
  
  // 3. Create new task instance
  await c.env.DB.prepare(`
    INSERT INTO tasks (...)
    VALUES (?, ?, ?, ...)
  `).bind(...).run();
  
  // 4. Update pattern
  await c.env.DB.prepare(`
    UPDATE recurring_patterns
    SET next_occurrence_date = ?,
        occurrences_count = occurrences_count + 1
    WHERE id = ?
  `).bind(newNextOccurrence, patternId).run();
  
  return c.json({ success: true, nextOccurrence });
});
```

---

## ✅ Benefits

1. **Seamless Experience**: Users never have to manually create the next instance
2. **No Gaps**: Next instance is ready immediately after completion
3. **Consistent Data**: All instances maintain the same settings
4. **Flexible**: Users can still modify individual instances if needed
5. **Trackable**: Full history of all completed instances
6. **Automatic**: Works without any manual intervention

---

## 🚀 Future Enhancements

### Potential Improvements:
1. **Skip Instance**: Allow users to skip an occurrence without completing
2. **Modify Pattern**: Update all future instances when pattern changes
3. **Pause Pattern**: Temporarily stop generating new instances
4. **Instance History**: View all past instances of a recurring task
5. **Calendar Integration**: Show all future occurrences in calendar view
6. **Smart Scheduling**: Adjust next occurrence based on completion patterns
7. **Reminders**: Notify users before next instance is due

---

## 📝 Notes

- Completing a recurring task instance does NOT delete the pattern
- Each instance is independent and can be modified separately
- Pattern remains active until manually deactivated or end conditions are met
- All instances are linked via `recurring_pattern_id` for tracking
- Users can delete individual instances without affecting the pattern
- Deleting the pattern will not delete existing instances (they become standalone tasks)

---

## 🎉 Summary

**What happens when you complete a recurring task instance:**

1. ✅ Current instance is marked as completed
2. ✅ Timer stops and actual time is saved
3. ✅ Next instance is automatically generated
4. ✅ User is notified of next occurrence date
5. ✅ New instance appears in Active Tasks immediately
6. ✅ Pattern continues until end conditions are met

**Result**: A seamless, automatic workflow that keeps recurring tasks flowing without manual intervention! 🚀



