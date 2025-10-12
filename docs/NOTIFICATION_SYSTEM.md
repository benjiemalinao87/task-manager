# 📧 Notification System - Complete Guide

## Overview

The Task Manager has a smart notification system that respects user preferences and sends emails via Resend (your platform account or their custom account).

---

## 🎯 Who Gets Notified?

### The User Who Created/Completed the Task

**Simple Answer:** **YOU** get notified about **YOUR OWN** tasks.

When you:
- ✅ Create a task → You get an email (if enabled)
- ✅ Complete a task → You get an email (if enabled)
- ✅ Clock in → You get an email (if enabled)

**Important:** This is a **personal productivity tool**, not a team collaboration tool. Each user only receives notifications about their own tasks.

---

## 📬 Notification Flow (Step-by-Step)

### When You Create a Task:

```
1. You click "Create Task"
   ↓
2. Backend creates task in database with your user_id
   ↓
3. Backend checks: Do you have a default_email in settings?
   ↓
4. IF YES → Queue email to EMAIL_QUEUE with:
   - type: 'task_created'
   - userId: YOUR_USER_ID
   - email: YOUR_DEFAULT_EMAIL
   - task: { name, description, estimatedTime }
   ↓
5. Email Worker receives the queued message
   ↓
6. Worker checks: Do you have notify_task_created enabled?
   ↓
7. IF YES → Send email
   IF NO → Skip email (respects your preference!)
   ↓
8. Email sent to YOUR_DEFAULT_EMAIL from task@customerconnects.com
```

### When You Complete a Task:

```
Same flow as above, but:
- type: 'task_completed'
- Checks: notify_task_completed preference
- Email includes: actual time vs estimated time
```

---

## ⚙️ Configuration

### Where is the Email Address Stored?

**Settings Table:**
```sql
CREATE TABLE settings (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  default_email TEXT NOT NULL DEFAULT '',  ← YOUR EMAIL HERE
  notify_task_created INTEGER DEFAULT 1,    ← Preference
  notify_task_completed INTEGER DEFAULT 1,  ← Preference
  ...
);
```

### How to Set Your Email:

1. **During Onboarding:** After signup, you can set preferences
2. **In Settings:** Click ⚙️ Settings → Enter your email → Save

---

## 🔔 Notification Preferences

### 4 Types of Notifications:

| Notification Type | When | Default | Status |
|---|---|---|---|
| **New Task Created** | When you create a task | ✅ Enabled | ✅ Live |
| **Task Completion** | When you complete a task | ✅ Enabled | ✅ Live |
| **Daily Summary** | End of each day | ❌ Disabled | 🔜 Coming Soon |
| **Weekly Summary** | End of each week | ❌ Disabled | 🔜 Coming Soon |

### How Preferences Work:

**Example 1: All Enabled (Default)**
```sql
notify_task_created = 1   ← Get task created emails
notify_task_completed = 1 ← Get completion emails
```
Result: You receive both types of emails ✅

**Example 2: Only Completions**
```sql
notify_task_created = 0   ← Skip task created emails
notify_task_completed = 1 ← Get completion emails
```
Result: You only receive completion emails ✅

**Example 3: All Disabled**
```sql
notify_task_created = 0   ← Skip task created emails
notify_task_completed = 0 ← Skip completion emails
```
Result: No emails sent 🔇

---

## 📨 Email Details

### From Address

**Default (Platform):**
```
From: Task Manager <task@customerconnects.com>
To: your@email.com
```

**Custom (If you set up your own integration):**
```
From: Task Manager <noreply@yourdomain.com>
To: your@email.com
```

### Email Templates

#### New Task Created
```
Subject: New Task: Build landing page

🎯 New Task Created

Task: Build landing page
Description: Create a modern responsive landing page...
Estimated Time: 4 hours
AI Summary: This task involves...

Started At: Oct 12, 2025 at 2:30 PM PST
```

#### Task Completed
```
Subject: Task Completed: Build landing page

✅ Task Completed!

Task: Build landing page
Estimated Time: 4 hours
Actual Time: 3h 45m
Performance: 🎉 15 minutes under estimate!

Notes: Finished ahead of schedule...
AI Summary: Successfully completed...
```

---

## 🔧 Backend Implementation

### Tasks Worker (`tasks.ts`)

**Create Task:**
```typescript
// Get user's default email
const settings = await c.env.DB.prepare(
  'SELECT default_email FROM settings WHERE user_id = ?'
).bind(auth.userId).first();

// Queue email notification
if (settings && settings.default_email) {
  await c.env.EMAIL_QUEUE.send({
    type: 'task_created',
    userId: auth.userId,
    email: settings.default_email,
    taskId,
    task: { name, description, estimatedTime }
  });
}
```

**Complete Task:**
```typescript
// Same pattern, but type: 'task_completed'
if (status === 'completed') {
  await c.env.EMAIL_QUEUE.send({
    type: 'task_completed',
    userId: auth.userId,
    email: settings.default_email,
    task: { ... }
  });
}
```

### Email Consumer (`email-consumer.ts`)

**Check Preferences Before Sending:**
```typescript
// Get user's notification preferences
const settings = await env.DB.prepare(`
  SELECT notify_task_created, notify_task_completed
  FROM settings WHERE user_id = ?
`).bind(userId).first();

// Respect user preferences!
if (type === 'task_created' && !settings.notify_task_created) {
  console.log('User disabled task_created, skipping');
  return; // Don't send email
}

if (type === 'task_completed' && !settings.notify_task_completed) {
  console.log('User disabled task_completed, skipping');
  return; // Don't send email
}

// OK to send!
await sendViaResend(email, subject, emailHtml, ...);
```

---

## 🎨 Frontend Integration

### Setting Your Email

**SimpleSettings.tsx:**
```typescript
const [settings, setSettings] = useState({
  default_email: '',           // Your email
  notify_task_created: true,   // Preferences
  notify_task_completed: true,
});

// Save to backend
await apiClient.updateSettings({
  default_email: settings.default_email,
  notify_task_created: settings.notify_task_created ? 1 : 0,
  notify_task_completed: settings.notify_task_completed ? 1 : 0,
});
```

### Onboarding Flow

**After Signup:**
```typescript
// User sees notification preferences screen
<NotificationPreferences onComplete={completeOnboarding} />

// They select which notifications they want
// Saved to database immediately
await apiClient.saveNotificationPreferences({
  notifyTaskCreated: true,
  notifyTaskCompleted: true,
  notifyDailySummary: false,
  notifyWeeklySummary: false,
});
```

---

## 🐛 Bug Fixed Today!

### Before (Bug):
```typescript
// Email worker just sent emails without checking preferences
await sendViaResend(email, subject, emailHtml);
```
Result: Users received all emails even if they disabled notifications ❌

### After (Fixed):
```typescript
// Email worker NOW checks preferences first
if (type === 'task_created' && !settings.notify_task_created) {
  return; // Skip email
}

if (type === 'task_completed' && !settings.notify_task_completed) {
  return; // Skip email
}

// Only send if enabled
await sendViaResend(email, subject, emailHtml);
```
Result: Emails only sent if user enabled that notification type ✅

---

## 🧪 Testing Notifications

### Test 1: Create Task with Notifications Enabled
```
1. Go to Settings
2. Set your email: your@email.com
3. Enable "New Task Created"
4. Create a task
```
**Expected:** Receive email ✅

### Test 2: Create Task with Notifications Disabled
```
1. Go to Settings
2. Disable "New Task Created"
3. Create a task
```
**Expected:** NO email sent ✅

### Test 3: Complete Task with Notifications Enabled
```
1. Go to Settings
2. Enable "Task Completion"
3. Complete a task
```
**Expected:** Receive completion email ✅

### Test 4: No Email Set
```
1. Go to Settings
2. Leave email blank
3. Create/complete tasks
```
**Expected:** NO emails sent (no email address to send to) ✅

---

## 📊 Database Queries

### Check User's Email & Preferences
```sql
SELECT 
  default_email,
  notify_task_created,
  notify_task_completed,
  notify_daily_summary,
  notify_weekly_summary
FROM settings 
WHERE user_id = 'user_123';
```

### See Who Has Emails Enabled
```sql
SELECT 
  u.email as user_email,
  s.default_email as notification_email,
  s.notify_task_created,
  s.notify_task_completed
FROM users u
JOIN settings s ON u.id = s.user_id
WHERE s.default_email != '';
```

### Count Notification Preferences
```sql
SELECT 
  COUNT(*) as total_users,
  SUM(CASE WHEN notify_task_created = 1 THEN 1 ELSE 0 END) as task_created_enabled,
  SUM(CASE WHEN notify_task_completed = 1 THEN 1 ELSE 0 END) as task_completed_enabled
FROM settings;
```

---

## 🔐 Privacy & Security

### Data Isolation
- ✅ Each user only sees their own tasks
- ✅ Each user only gets emails about their own tasks
- ✅ No cross-user data leakage
- ✅ All queries filtered by `user_id`

### Email Security
- ✅ Emails sent via HTTPS
- ✅ Resend API with authentication
- ✅ No email addresses exposed to other users
- ✅ GDPR compliant (explicit opt-in)

---

## 🚀 Future Enhancements

### Daily Summary (Coming Soon)
```
📅 Daily Recap - October 12, 2025

✅ 5 tasks completed
⏰ 6h 30m total time
📈 85% on-time completion
🎯 Most productive: Morning

[View full report]
```

### Weekly Summary (Coming Soon)
```
📊 Weekly Performance Report

Week of Oct 7-13, 2025
✅ 23 tasks completed
⏰ 32h total time
📈 15% faster than last week

[View detailed analytics]
```

### Team Notifications (Future)
```
When sharing tasks with team members:
- Task assigned to you
- Task mentioned you
- Task deadline approaching
```

---

## 📚 Related Documentation

- **Email Configuration:** `EMAIL_CONFIGURATION.md`
- **Onboarding Flow:** `ONBOARDING_FLOW.md`
- **Settings API:** `cloudflare-workers/README.md#settings-endpoints`
- **Email Worker:** `cloudflare-workers/src/workers/email-consumer.ts`

---

**Last Updated:** October 12, 2025  
**Status:** ✅ Live & Working  
**Version:** 1.0 (Bug Fixed)

