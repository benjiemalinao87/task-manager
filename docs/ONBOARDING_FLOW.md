# User Onboarding Flow - Notification Preferences

## Overview

After a user signs up, they are guided through a beautiful onboarding screen where they can choose which email notifications they want to receive. This creates a great first impression and lets users customize their experience from day one.

---

## 🎯 User Journey

```
1. User clicks "Sign Up"
          ↓
2. Fills in registration form
   - Name
   - Email
   - Password
   - Sees "🎉 Early Adopter Plan" badge
          ↓
3. Submits form
   - Account created in database
   - Automatically logged in
   - JWT token stored
          ↓
4. Notification Preferences Screen ✨ (NEW)
   - Choose notification types
   - Multi-select interface
   - Beautiful card-based UI
          ↓
5. Saves preferences
   - Settings saved to database
   - onboarding_completed = 1
          ↓
6. Main Task Manager App
   - Can start creating tasks
   - Receives chosen notifications
```

---

## 📋 Notification Types

### 1. New Task Created ✅ (Recommended)
- **Icon:** 📧 Mail
- **Color:** Blue
- **Default:** Enabled
- **Description:** "Get notified when you create a new task with AI summary and details"
- **Status:** ✅ Live

**Email Includes:**
- Task name
- Description
- Estimated time
- AI-generated summary
- Task link (if provided)

### 2. Task Completion ✅ (Recommended)
- **Icon:** ✅ CheckCircle
- **Color:** Green
- **Default:** Enabled
- **Description:** "Receive a summary email when you complete a task with actual time vs estimated"
- **Status:** ✅ Live

**Email Includes:**
- Task name
- Completion notes
- Actual time vs estimated time
- Performance insights
- AI summary

### 3. Daily Summary 🔜 (Coming Soon)
- **Icon:** 📅 Calendar
- **Color:** Purple
- **Default:** Disabled
- **Description:** "Get a daily recap of all tasks completed, time spent, and productivity insights"
- **Status:** 🔜 Planned

**Email Will Include:**
- Tasks completed today
- Total time spent
- Productivity score
- Top achievements
- Tomorrow's goals

### 4. Weekly Summary 🔜 (Coming Soon)
- **Icon:** 📊 BarChart
- **Color:** Orange
- **Default:** Disabled
- **Description:** "Weekly performance report with task completion rate, time tracking, and trends"
- **Status:** 🔜 Planned

**Email Will Include:**
- Week-over-week comparison
- Completion rate trends
- Time tracking analysis
- Most productive days
- Insights & recommendations

---

## 🎨 UI/UX Features

### Interactive Cards
Each notification type is a clickable card with:
- Large checkbox indicator (changes color when selected)
- Icon representing the notification type
- Clear title and description
- Visual feedback on hover
- "Coming Soon" badge for future features

### Color Coding
- **Blue:** Task Created (primary action)
- **Green:** Task Completed (success)
- **Purple:** Daily Summary (future)
- **Orange:** Weekly Summary (future)

### User Actions
1. **Save Preferences:** Saves selections and proceeds to app
2. **Skip for Now:** All notifications disabled, proceeds to app
3. Can change preferences anytime in Settings

---

## 🔧 Technical Implementation

### Database Schema

```sql
CREATE TABLE settings (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  default_email TEXT NOT NULL DEFAULT '',
  timezone TEXT DEFAULT 'America/Los_Angeles',
  notifications_enabled INTEGER DEFAULT 1,
  notify_task_created INTEGER DEFAULT 1,        -- NEW
  notify_task_completed INTEGER DEFAULT 1,      -- NEW
  notify_daily_summary INTEGER DEFAULT 0,       -- NEW
  notify_weekly_summary INTEGER DEFAULT 0,      -- NEW
  onboarding_completed INTEGER DEFAULT 0,       -- NEW
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### API Endpoints

#### Save Notification Preferences
```
POST /api/settings/notifications
Authorization: Bearer <jwt_token>

Request Body:
{
  "notifyTaskCreated": true,
  "notifyTaskCompleted": true,
  "notifyDailySummary": false,
  "notifyWeeklySummary": false
}

Response:
{
  "success": true,
  "message": "Notification preferences saved",
  "onboardingCompleted": true
}
```

#### Get User Settings
```
GET /api/settings
Authorization: Bearer <jwt_token>

Response:
{
  "id": "settings_123",
  "user_id": "user_456",
  "default_email": "user@example.com",
  "timezone": "America/Los_Angeles",
  "notifications_enabled": 1,
  "notify_task_created": 1,
  "notify_task_completed": 1,
  "notify_daily_summary": 0,
  "notify_weekly_summary": 0,
  "onboarding_completed": 1,
  "created_at": "2025-10-12T...",
  "updated_at": "2025-10-12T..."
}
```

#### Update Settings
```
PATCH /api/settings
Authorization: Bearer <jwt_token>

Request Body:
{
  "notify_task_created": false,
  "notify_daily_summary": true
}

Response:
{
  "id": "settings_123",
  "user_id": "user_456",
  ... (full updated settings)
}
```

---

## 📱 Frontend Implementation

### Components

**NotificationPreferences.tsx**
- Located: `src/components/onboarding/NotificationPreferences.tsx`
- Props: `{ onComplete: () => void }`
- State: Manages selected notification preferences
- Actions: Save preferences or skip

**AuthContext Updates**
- Added `needsOnboarding: boolean` state
- Added `checkOnboardingStatus()` function
- Added `completeOnboarding()` function
- Checks onboarding status on login

**App.tsx Flow**
```typescript
function AppContent() {
  const { isAuthenticated, needsOnboarding, completeOnboarding } = useAuth();

  // 1. Loading state
  if (isLoading) return <LoadingSpinner />;

  // 2. Not authenticated → Login/Signup
  if (!isAuthenticated) return <AuthPage />;

  // 3. Needs onboarding → Notification Preferences
  if (needsOnboarding) return <NotificationPreferences onComplete={completeOnboarding} />;

  // 4. All set → Main App
  return <TaskManager />;
}
```

### State Management

**Initial State (After Signup):**
```javascript
{
  isAuthenticated: true,
  needsOnboarding: true,  // Because onboarding_completed = 0
  user: { id: "...", email: "...", name: "..." }
}
```

**After Onboarding:**
```javascript
{
  isAuthenticated: true,
  needsOnboarding: false,  // Because onboarding_completed = 1
  user: { id: "...", email: "...", name: "..." }
}
```

---

## 🔄 Email Logic

### How Notifications Are Sent

When a task is created or completed, the email worker checks user preferences:

```typescript
// In email-consumer.ts
const settings = await DB.prepare(
  'SELECT * FROM settings WHERE user_id = ?'
).bind(userId).first();

// For task created
if (type === 'task_created' && !settings.notify_task_created) {
  return; // Don't send email
}

// For task completed
if (type === 'task_completed' && !settings.notify_task_completed) {
  return; // Don't send email
}

// Send email if preference is enabled
sendEmail(email, subject, body);
```

### Default Behavior
- New users: Task created & completed emails enabled by default
- If user skips onboarding: All notifications disabled
- Can change anytime in Settings

---

## 🧪 Testing Guide

### Test 1: New User Signup Flow
```bash
# 1. Start backend
cd cloudflare-workers && npm run dev

# 2. Start frontend
cd .. && npm run dev

# 3. Open http://localhost:5173
# 4. Click "Sign Up"
# 5. Fill in form
# 6. Submit
```

**Expected:**
✅ Account created
✅ Automatically logged in
✅ Notification preferences screen appears
✅ All 4 notification types visible
✅ "Coming Soon" badges on Daily & Weekly

### Test 2: Select Preferences
```bash
# On notification preferences screen:
# 1. Click different cards to toggle selection
# 2. Notice color changes and checkmarks
# 3. Click "Save Preferences"
```

**Expected:**
✅ Preferences saved to database
✅ Redirected to main Task Manager app
✅ No longer sees notification preferences screen

### Test 3: Skip Onboarding
```bash
# On notification preferences screen:
# 1. Click "Skip for Now"
```

**Expected:**
✅ All notifications disabled
✅ Redirected to main app
✅ `onboarding_completed = 1` in database

### Test 4: Change Preferences Later
```bash
# In main app:
# 1. Click Settings icon
# 2. Go to notification preferences
# 3. Toggle notification types
# 4. Save
```

**Expected:**
✅ Preferences updated
✅ Future emails respect new preferences

### Test 5: Existing User Login
```bash
# Log out and log back in with existing account
```

**Expected:**
✅ Login successful
✅ NO notification preferences screen (already completed)
✅ Directly to main app

---

## 🎯 Benefits

### For Users
✅ **Control:** Choose exactly which emails to receive
✅ **Transparency:** Clear descriptions of each notification type
✅ **Flexibility:** Can change preferences anytime
✅ **No Spam:** Only get emails they want

### For Platform
✅ **Engagement:** Higher email open rates (opted-in)
✅ **Retention:** Better first impression
✅ **Compliance:** GDPR-friendly explicit consent
✅ **Scalability:** Easy to add new notification types

---

## 🚀 Future Enhancements

### Phase 1: Email Frequency Control
```
[ ] Immediate notifications
[ ] Daily digest (all tasks in one email)
[ ] Weekly digest (all tasks in one email)
```

### Phase 2: Notification Channels
```
[ ] Email notifications
[ ] SMS notifications (via Twilio)
[ ] Push notifications (PWA)
[ ] Slack integration
```

### Phase 3: Advanced Preferences
```
[ ] Quiet hours (no emails between X and Y)
[ ] Priority tasks only
[ ] Custom notification templates
[ ] Email formatting preferences (HTML vs plain text)
```

### Phase 4: Smart Notifications
```
[ ] AI-powered digest timing (send when most likely to read)
[ ] Context-aware notifications (only urgent tasks)
[ ] Adaptive frequency (reduce if user doesn't engage)
```

---

## 📊 Analytics to Track

### Onboarding Metrics
- Signup → Notification Preferences completion rate
- Skip rate vs Save rate
- Most popular notification combinations
- Time spent on notification preferences screen

### Engagement Metrics
- Email open rates by notification type
- Click-through rates
- Users who disable notifications later
- Correlation between notifications and task completion

### SQL Queries

**Onboarding completion rate:**
```sql
SELECT 
  COUNT(*) as total_users,
  SUM(CASE WHEN onboarding_completed = 1 THEN 1 ELSE 0 END) as completed,
  ROUND(SUM(CASE WHEN onboarding_completed = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as completion_rate
FROM users
JOIN settings ON users.id = settings.user_id
WHERE users.created_at >= datetime('now', '-30 days');
```

**Most popular notification combinations:**
```sql
SELECT 
  notify_task_created,
  notify_task_completed,
  notify_daily_summary,
  notify_weekly_summary,
  COUNT(*) as user_count
FROM settings
WHERE onboarding_completed = 1
GROUP BY notify_task_created, notify_task_completed, notify_daily_summary, notify_weekly_summary
ORDER BY user_count DESC
LIMIT 10;
```

---

## 🔒 Security & Privacy

### Data Protection
- User preferences stored encrypted in D1 database
- Per-user isolation with `user_id` foreign keys
- No cross-user data leakage

### GDPR Compliance
- Explicit opt-in for each notification type
- Clear descriptions of what each email contains
- Easy to change or disable anytime
- "Skip for Now" option (all disabled by default)

### Email Best Practices
- From: Task Manager <task@customerconnects.com>
- Unsubscribe link in all emails (future)
- Clear subject lines
- Professional HTML templates

---

## 📚 Resources

### Code Files
- Backend: `cloudflare-workers/src/workers/settings.ts`
- Frontend: `src/components/onboarding/NotificationPreferences.tsx`
- Context: `src/context/AuthContext.tsx`
- API Client: `src/lib/api-client.ts`

### Documentation
- Email System: `docs/EMAIL_CONFIGURATION.md`
- Database Schema: `cloudflare-workers/schema.sql`
- API Reference: `cloudflare-workers/README.md`

---

**Last Updated:** October 12, 2025  
**Status:** ✅ Live & Ready to Test  
**Version:** 1.0

