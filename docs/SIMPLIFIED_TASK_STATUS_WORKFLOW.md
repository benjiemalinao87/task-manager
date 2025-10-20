# Simplified Task Status Workflow

## Overview
Task statuses have been simplified to match a typical todo/task management workflow with 5 clear states.

---

## Available Task Statuses

### 1. 📝 **To Do** (Gray)
- **When to use**: Task is planned but not started yet
- **Icon**: Clock
- **Behavior**:
  - Task moves out of "Active Tasks" list
  - Shows confirmation: "This task will be moved out of the active list. Continue?"
  - Good for tasks you want to do later

### 2. ⏳ **In Progress** (Cyan/Blue)
- **When to use**: Currently working on this task
- **Icon**: Loader (spinning)
- **Behavior**:
  - Task stays in the "Active Tasks" list
  - Timer continues running
  - This is the default active status
  - No confirmation needed

### 3. 🚫 **Blocked** (Orange)
- **When to use**: Cannot proceed due to dependencies or issues
- **Icon**: AlertCircle
- **Behavior**:
  - Task moves out of "Active Tasks" list
  - Shows confirmation: "This task will be moved out of the active list. Continue?"
  - Good for tasks waiting on external factors

### 4. ✅ **Completed** (Green)
- **When to use**: Task is finished
- **Icon**: CheckCircle
- **Behavior**:
  - Task moves out of "Active Tasks" list
  - Sets `completed_at` timestamp
  - Shows confirmation: "This will mark the task as completed and move it out of the active list. Continue?"
  - If task is linked to Asana, marks it complete there too

### 5. ❌ **Cancelled** (Red)
- **When to use**: Task is no longer relevant or needed
- **Icon**: XCircle
- **Behavior**:
  - Task moves out of "Active Tasks" list
  - Shows confirmation: "This task will be moved out of the active list. Continue?"
  - Task is not deleted, just marked as cancelled

---

## Status Flow Diagram

```
┌─────────┐
│ To Do   │
└────┬────┘
     │
     ↓
┌─────────────┐     ┌─────────┐
│ In Progress │ ←→  │ Blocked │
└─────┬───────┘     └─────────┘
      │
      ├──→ ┌───────────┐
      │    │ Completed │
      │    └───────────┘
      │
      └──→ ┌───────────┐
           │ Cancelled │
           └───────────┘
```

---

## What Happens When You Change Status

### **From "In Progress" to Anything Else**
1. User clicks status dropdown
2. Selects new status
3. **Confirmation dialog appears** (except when selecting "In Progress")
4. If user confirms:
   - Status updates in database
   - Task disappears from "Active Tasks" list
   - Task can be found in completed/archived tasks (future feature)

### **Back to "In Progress"**
- No confirmation needed
- Task immediately appears in "Active Tasks" list
- Timer can be resumed

---

## Confirmation Messages

| From Status | To Status | Confirmation Message |
|-------------|-----------|---------------------|
| In Progress | To Do | "This task will be moved out of the active list. Continue?" |
| In Progress | Blocked | "This task will be moved out of the active list. Continue?" |
| In Progress | Completed | "This will mark the task as completed and move it out of the active list. Continue?" |
| In Progress | Cancelled | "This task will be moved out of the active list. Continue?" |
| Any | In Progress | No confirmation (always allowed) |

---

## Technical Implementation

### Status Values in Database
```sql
-- Old constraint (removed)
CHECK(status IN ('in_progress', 'completed', 'cancelled'))

-- New: No constraint (flexible)
status TEXT DEFAULT 'in_progress'
```

### Frontend Validation
- Confirmation dialogs prevent accidental status changes
- User can cancel the change by clicking "Cancel" in the dialog

### API Endpoint
```
PATCH /api/tasks/:id
Body: { "status": "completed" }
```

**Special handling for "completed":**
- Sets `completed_at` timestamp
- Marks Asana task as complete (if linked)

---

## Future Enhancements

### 1. Status Filter Tabs
Add filter buttons to view tasks by status:
```
[All] [To Do] [In Progress] [Blocked] [Completed] [Cancelled]
```

### 2. Status History
Track when status changed and by whom:
```
Timeline:
- Oct 20, 2:00 PM: Status changed to "In Progress" by John
- Oct 20, 3:30 PM: Status changed to "Blocked" by John
- Oct 20, 4:00 PM: Status changed to "In Progress" by John
```

### 3. Bulk Status Update
Select multiple tasks and update status at once.

### 4. Status-Based Automation
- Auto-archive tasks completed > 30 days ago
- Send notifications when task is blocked
- Auto-assign tasks marked as "To Do"

---

## User Tips

✅ **Best Practices:**
- Use "To Do" for backlog tasks you plan to start later
- Use "Blocked" when waiting for someone/something
- Mark tasks "Completed" when fully done
- Use "Cancelled" instead of deleting tasks (keeps history)

⚠️ **Things to Know:**
- Changing status away from "In Progress" hides the task from active list
- Completed tasks set a timestamp (for time tracking)
- You can always change status back to "In Progress" to see the task again

---

## Comparison: Old vs New

### **Old Status Options** (8 statuses - too complex)
- Draft
- In Progress
- Waiting for approval
- Changes requested
- Approved
- Live
- Archived
- Do not use

### **New Status Options** (5 statuses - simplified)
- To Do
- In Progress
- Blocked
- Completed
- Cancelled

**Why the change?**
The old statuses were designed more for project/feature deployment workflows. The new statuses are simpler and match how people actually manage tasks.

---

**Last Updated**: October 20, 2025
**Version**: 2.0.0
