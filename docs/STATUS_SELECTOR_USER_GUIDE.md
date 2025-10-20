# Status Selector - User Guide

## Overview
The new status selector allows users to manage task and invoice statuses with a beautiful, intuitive dropdown interface featuring color-coded status options with icons.

---

## How to Use the Status Selector

### 1. **For Tasks (Task Detail View)**

#### Location
- Navigate to any task by clicking on it from the task list
- The status selector appears in the **top-right corner** of the task card, next to the priority badge

#### How to Change Status

1. **Click the status button** (shows current status with icon)
   - Default shows current status (e.g., "In Progress" with a loading icon)

2. **Dropdown menu opens** showing all available status options:
   - 🚫 **No status** (gray) - Remove status
   - 🕐 **Draft** (lavender) - Task is being drafted
   - ⏳ **In Progress** (cyan) - Currently working on task
   - 👁️ **Waiting for approval** (purple) - Awaiting review
   - 💬 **Changes requested** (orange) - Needs modifications
   - ✓ **Approved** (green) - Task approved
   - ▷ **Live** (lime) - Task is live/deployed
   - 📦 **Archived** (yellow) - Task archived
   - ⚠️ **Cancelled** (red) - Task cancelled/not used

3. **Click any status** to update
   - Status updates immediately via API
   - Visual feedback shows the new status
   - No page reload required

#### Visual Example
```
┌─────────────────────────────────────────┐
│ Task Name                    [High] [⏳ In Progress ▼] │
│                                         │
│ Click the status → Dropdown opens       │
│                                         │
│   🚫 No status                          │
│   🕐 Draft                              │
│ → ⏳ In Progress    ← Currently selected│
│   👁️ Waiting for approval              │
│   💬 Changes requested                  │
│   ✓ Approved                            │
│   ▷ Live                                │
│   📦 Archived                           │
│   ⚠️ Cancelled                          │
└─────────────────────────────────────────┘
```

---

### 2. **For Invoices (Invoice List)**

#### Location
- Go to the Invoices section
- Each invoice card displays a status badge

#### Current Functionality
- **Read-only badges** - Shows current invoice status with icon and color
- Status options:
  - 🕐 **Draft** (gray) - Invoice in draft mode
  - 📤 **Sent** (blue) - Invoice sent to client
  - ✓ **Paid** (green) - Invoice paid
  - ❌ **Overdue** (red) - Payment overdue
  - 🚫 **Cancelled** (gray) - Invoice cancelled

#### Filter by Status
At the top of the invoice list, click filter buttons:
- **All** - Show all invoices
- **Draft** - Show only draft invoices
- **Sent** - Show only sent invoices
- **Paid** - Show only paid invoices
- **Overdue** - Show only overdue invoices

---

## Status Workflow Examples

### Task Status Flow (Recommended)

```
Draft → In Progress → Waiting for approval → Changes requested → Approved → Live
                                    ↓
                                Cancelled
                                    ↓
                                Archived
```

### Invoice Status Flow (Recommended)

```
Draft → Sent → Paid
         ↓
      Overdue
         ↓
     Cancelled
```

---

## Technical Details

### API Integration
- Status changes trigger `PUT /api/tasks/:id` or `PUT /api/invoices/:id`
- Updates are persisted to the database immediately
- Failed updates show error alerts

### Components Used
- **StatusSelector**: Interactive dropdown for changing status
- **StatusBadge**: Read-only display of current status
- Both support task and invoice types

### Keyboard Navigation
- **Tab**: Navigate to status selector
- **Enter/Space**: Open dropdown
- **Arrow keys**: Navigate status options
- **Enter**: Select status
- **Escape**: Close dropdown

---

## Future Enhancements

### Planned Features
1. **Inline status editing in lists** - Change status without opening task/invoice
2. **Status history tracking** - View when status changed and by whom
3. **Custom status creation** - Define your own workflow statuses
4. **Status-based automation** - Trigger actions on status change
5. **Status notifications** - Get notified when status changes

### Invoice Status Editing
Currently, invoice statuses are read-only badges. Future updates will add:
- StatusSelector in InvoicePreview
- Status change permissions based on user role
- Automatic status transitions (e.g., Draft → Sent when email sent)

---

## Troubleshooting

### Status Not Updating?
1. Check your internet connection
2. Ensure you have permission to edit the task/invoice
3. Try refreshing the page
4. Check browser console for errors

### Dropdown Not Opening?
1. Clear browser cache
2. Disable browser extensions that might interfere
3. Try a different browser

### Status Reverting to Old Value?
- This means the API update failed
- Check network tab in DevTools
- Verify backend server is running
- Check authentication token validity

---

## Design Philosophy

The status selector follows these principles:

1. **Visual Clarity** - Each status has unique color and icon
2. **Pastel Palette** - Soft colors reduce visual fatigue
3. **Semantic Colors** - Green = positive, Red = negative, Blue = in-progress
4. **Icon Reinforcement** - Icons provide quick visual recognition
5. **Accessibility** - High contrast, keyboard navigation, screen reader support

---

## Color Reference

| Status | Color | RGB | Tailwind Class |
|--------|-------|-----|----------------|
| Draft | Lavender | Light Purple | `bg-purple-100` |
| In Progress | Cyan | Light Blue-Green | `bg-cyan-100` |
| Waiting | Purple | Light Purple | `bg-purple-100` |
| Changes | Peach | Light Orange | `bg-orange-100` |
| Approved | Mint | Light Green | `bg-green-100` |
| Live | Lime | Yellow-Green | `bg-lime-100` |
| Archived | Yellow | Light Yellow | `bg-yellow-100` |
| Cancelled | Pink | Light Red | `bg-red-100` |
| No Status | Gray | Light Gray | `bg-gray-100` |

---

## Developer Notes

### Using StatusSelector Component

```tsx
import { StatusSelector } from './components/StatusSelector';
import { TaskStatus } from './lib/statusConstants';

function MyComponent() {
  const [status, setStatus] = useState<TaskStatus>('in_progress');

  const handleChange = async (newStatus: TaskStatus | null) => {
    // Update via API
    await updateTask(taskId, { status: newStatus });
    setStatus(newStatus);
  };

  return (
    <StatusSelector
      type="task"
      value={status}
      onChange={handleChange}
      allowNoStatus={true}
      placeholder="Set status"
      className="w-[200px]"
    />
  );
}
```

### Using StatusBadge Component

```tsx
import { StatusBadge } from './components/StatusBadge';

function MyComponent() {
  return (
    <StatusBadge
      type="invoice"
      status="paid"
      showIcon={true}
      className="my-custom-class"
    />
  );
}
```

---

## Support

For issues or feature requests:
1. Check existing GitHub issues
2. Create new issue with detailed description
3. Include screenshots if UI-related
4. Mention browser/OS version

---

**Last Updated**: October 20, 2025
**Version**: 1.0.0
