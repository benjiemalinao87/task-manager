# Activity Tracking & Auto-Pause Feature

## Overview
Automatically detects user inactivity and pauses time tracking to ensure accurate time logs. This feature helps prevent inflated time tracking when users step away from their computer.

**NEW:** Now includes **cross-tab activity tracking** via WebSocket! Activity detected in any open tab of the application will keep timers running across all tabs.

## Features

### 1. **Inactivity Detection**
- Monitors mouse movement, keyboard input, clicks, scrolls, and touch events
- Tracks tab visibility (detects when user switches to another tab)
- **Cross-tab activity synchronization via WebSocket**
- Configurable idle timeout (default: 2 minutes)

### 2. **User Prompt System**
- Shows friendly modal asking "Are you still working?"
- 60-second countdown before auto-pause
- Options: "Yes, I'm Still Working" or "Pause My Timers"
- Beautiful, non-intrusive design

### 3. **Auto-Pause Functionality**
- Automatically pauses session timer when idle timeout expires
- Saves accurate time tracking data
- Shows notification when auto-paused
- Easy resume with single click

### 4. **Activity Logging to D1**
- All activity events stored in database
- Track idle patterns and user behavior
- Generate activity statistics and reports
- Useful for productivity analysis

## Technical Implementation

### Frontend Components

#### 1. `useActivityTracker` Hook
**Location:** `src/hooks/useActivityTracker.ts`

**Features:**
- Tracks user activity events (mouse, keyboard, scroll, touch)
- Monitors Page Visibility API for tab switching
- **Cross-tab activity synchronization via WebSocket**
- Throttled event handling (1 event per second max for local, 5 seconds for heartbeats)
- Configurable timeouts
- Callback system for idle/active/timeout events
- Unique tab ID generation for identifying different browser tabs

**Usage:**
```typescript
const {
  showPrompt,
  confirmActivity,
  pauseTracking,
} = useActivityTracker({
  idleTimeoutMs: 2 * 60 * 1000, // 2 minutes
  promptTimeoutMs: 60 * 1000, // 1 minute  
  enabled: isClockedIn && !isPaused,
  onIdle: () => console.log('User idle'),
  onActive: () => console.log('User active'),
  onPromptTimeout: () => handlePause(),
  sendActivityHeartbeat: (tabId) => sendHeartbeat(tabId), // NEW: Send to other tabs
  onActivityBroadcast: (callback) => registerCallback(callback), // NEW: Receive from other tabs
});
```

#### 2. `ActivityPrompt` Component
**Location:** `src/components/ActivityPrompt.tsx`

**Features:**
- Beautiful modal with countdown timer
- Two action buttons: Continue or Pause
- Animated appearance
- Auto-dismisses after timeout
- Shows helpful explanatory text

**Props:**
```typescript
interface ActivityPromptProps {
  show: boolean;
  timeoutSeconds: number;
  onContinue: () => void;
  onPause: () => void;
}
```

#### 3. Integration in `ConsolidatedHeader`
**Location:** `src/components/ConsolidatedHeader.tsx`

- Activity tracking only enabled when clocked in and not paused
- Automatically calls pause API when timeout expires
- Shows success/error toasts for user feedback
- Logs activity events to console for debugging
- Receives WebSocket functions from parent component for cross-tab tracking

#### 4. `useChatWebSocket` Hook (Extended for Activity Tracking)
**Location:** `src/hooks/useChatWebSocket.ts`

**New Features for Activity Tracking:**
- `sendActivityHeartbeat(tabId)` - Sends activity heartbeat to ChatRoom Durable Object
- `onActivityBroadcast(callback)` - Registers callback to receive activity from other tabs
- Handles `activity_heartbeat` and `activity_broadcast` message types

**How It Works:**
1. Each browser tab has a unique `tabId` (generated via `crypto.randomUUID()`)
2. When local activity is detected, the tab sends a heartbeat message via WebSocket
3. The ChatRoom Durable Object broadcasts the activity to all other tabs of the same user
4. Other tabs receive the broadcast and reset their idle timers
5. This keeps all tabs synchronized - activity in one tab prevents auto-pause in all tabs

### Backend Components

#### ChatRoom Durable Object (Extended)
**Location:** `cloudflare-workers/src/durable-objects/ChatRoom.ts`

**New Features:**
- Tracks `tabId` for each WebSocket session
- Handles `activity_heartbeat` message type
- New method: `broadcastToUserTabs()` - broadcasts only to tabs of a specific user
- Filters broadcasts to exclude the sender tab (prevents echo loops)

**Message Flow:**
```
Tab 1 (User types) → activity_heartbeat → ChatRoom DO
                                              ↓
                              activity_broadcast → Tab 2, Tab 3 (same user)
                                              ↓
                              All tabs reset idle timer
```

### Backend API Endpoints

#### 1. **POST /api/activity/log**
Log an activity event

**Request Body:**
```json
{
  "eventType": "idle_detected",
  "idleDurationSeconds": 300,
  "wasClockedIn": true,
  "wasTaskTimerRunning": true,
  "promptResponseTimeSeconds": 15,
  "tabVisible": true,
  "notes": "User switched tabs"
}
```

**Event Types:**
- `idle_detected` - User became idle
- `prompt_shown` - Idle prompt displayed
- `user_continued` - User clicked "Continue Working"
- `auto_paused` - Auto-paused due to timeout
- `manual_paused` - User clicked "Pause"
- `resumed` - Session resumed
- `tab_hidden` - User switched to another tab
- `tab_visible` - User returned to tab

**Response:**
```json
{
  "success": true,
  "logId": "act_123...",
  "message": "Activity logged successfully"
}
```

#### 2. **GET /api/activity/logs**
Retrieve activity logs

**Query Parameters:**
- `limit` (optional): Max number of logs (1-100, default 50)
- `eventType` (optional): Filter by event type
- `dateFrom` (optional): Start date (YYYY-MM-DD)
- `dateTo` (optional): End date (YYYY-MM-DD)

**Response:**
```json
{
  "logs": [...],
  "count": 25
}
```

#### 3. **GET /api/activity/stats**
Get activity statistics

**Query Parameters:**
- `dateFrom` (optional): Start date
- `dateTo` (optional): End date

**Response:**
```json
{
  "eventCounts": [
    {
      "event_type": "auto_paused",
      "count": 15,
      "avg_idle_seconds": 330,
      "avg_response_seconds": 25
    }
  ],
  "totalAutoPauses": 15,
  "avgIdleTimeSeconds": 330
}
```

#### 4. **GET /api/activity/settings**
Get user's activity tracking settings

**Response:**
```json
{
  "settings": {
    "idle_timeout_minutes": 5,
    "prompt_timeout_seconds": 60,
    "activity_tracking_enabled": 1,
    "track_tab_visibility": 1,
    "notify_on_auto_pause": 1
  }
}
```

#### 5. **PATCH /api/activity/settings**
Update activity tracking settings

**Request Body:**
```json
{
  "idleTimeoutMinutes": 10,
  "promptTimeoutSeconds": 90,
  "activityTrackingEnabled": true,
  "trackTabVisibility": true,
  "notifyOnAutoPause": true
}
```

### Database Schema

#### `activity_logs` Table
```sql
CREATE TABLE activity_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  workspace_id TEXT,
  session_id TEXT,
  
  event_type TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  idle_duration_seconds INTEGER,
  
  was_clocked_in INTEGER DEFAULT 0,
  was_task_timer_running INTEGER DEFAULT 0,
  
  prompt_response_time_seconds INTEGER,
  user_agent TEXT,
  tab_visible INTEGER DEFAULT 1,
  notes TEXT,
  
  created_at TEXT NOT NULL,
  
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (session_id) REFERENCES time_sessions(id)
);
```

**Indexes:**
- `idx_activity_logs_user_id`
- `idx_activity_logs_workspace_id`
- `idx_activity_logs_session_id`
- `idx_activity_logs_event_type`
- `idx_activity_logs_timestamp`
- `idx_activity_logs_user_timestamp`

#### `activity_settings` Table
```sql
CREATE TABLE activity_settings (
  user_id TEXT PRIMARY KEY,
  
  idle_timeout_minutes INTEGER DEFAULT 5,
  prompt_timeout_seconds INTEGER DEFAULT 60,
  
  activity_tracking_enabled INTEGER DEFAULT 1,
  track_tab_visibility INTEGER DEFAULT 1,
  notify_on_auto_pause INTEGER DEFAULT 1,
  
  updated_at TEXT NOT NULL,
  
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## User Flow

### Single Tab Flow
1. **User clocks in** → Activity tracking starts
2. **User works actively** → Timer runs normally
3. **User becomes idle (2 min)** → Prompt appears
4. **Countdown starts (60 sec)** → User has time to respond
5. **Two outcomes:**
   - **User clicks "Continue"** → Tracking continues, prompt dismissed
   - **Timeout expires** → Auto-pause, session paused, notification shown
6. **User returns** → Clicks "Resume" to continue tracking

### Multi-Tab Flow (NEW)
1. **User has app open in multiple tabs** (e.g., Tab A: Tasks, Tab B: Reports)
2. **User works in Tab B** → Activity detected
3. **Tab B sends heartbeat** → Via WebSocket to ChatRoom
4. **ChatRoom broadcasts** → Activity message to Tab A
5. **Tab A receives broadcast** → Resets its idle timer
6. **Result:** Timer stays active in all tabs as long as user is active in ANY tab

**Key Benefit:** Users can work across multiple tabs/windows of the app without timers pausing!

## Benefits

### For Users
- ✅ **Accurate time tracking** - No inflated hours from forgotten timers
- ✅ **Flexible** - Can continue working if actively engaged
- ✅ **Transparent** - Clear prompts and notifications
- ✅ **Non-intrusive** - Only appears when truly idle
- ✅ **Multi-tab support** - Work across multiple tabs without interruption (NEW)

### For Admins/Managers
- ✅ **Reliable data** - Activity logs show true work patterns
- ✅ **Analytics** - Track idle patterns and productivity
- ✅ **Compliance** - Accurate billing and payroll data
- ✅ **Insights** - Understand team work habits

## Configuration

### Default Settings
- **Idle timeout:** 2 minutes
- **Prompt timeout:** 60 seconds
- **Activity tracking:** Enabled
- **Tab visibility tracking:** Enabled
- **Cross-tab tracking:** Enabled (automatic via WebSocket)
- **Heartbeat throttle:** 5 seconds (prevents excessive WebSocket messages)
- **Auto-pause notifications:** Enabled

### Customization
Users can adjust settings via API or (future) Settings UI:
- Increase/decrease idle timeout
- Adjust prompt timeout duration
- Disable activity tracking
- Turn off notifications

## Testing

### Manual Testing Steps

#### Single Tab Testing
1. Clock in to start a session
2. Wait 2 minutes without interacting with the page
3. Verify prompt appears with countdown
4. Click "Yes, I'm Still Working" → verify tracking continues
5. Wait 2 minutes again
6. Let countdown expire → verify auto-pause occurs
7. Check database for activity logs

#### Multi-Tab Testing (NEW)
1. Open the app in **two separate browser tabs** (Tab A and Tab B)
2. Clock in from Tab A
3. Switch to Tab B and verify timer is running
4. **Stay in Tab B** and don't interact for 2 minutes
5. **While still in Tab B**, move your mouse or type in Tab A
6. **Expected:** Tab B should NOT show the idle prompt (because Tab A had activity)
7. Check console logs in both tabs to see heartbeat messages

### Console Logs
The system logs activity events to console:
- `⏸️ User idle detected - showing prompt`
- `🟢 User active again`
- `⏸️ Auto-pausing due to inactivity`
- `👁️ Tab hidden - pausing activity tracking`
- `👁️ Tab visible - resuming activity tracking`
- `🆔 Tab ID: [unique-id]` (NEW)
- `💓 Sending activity heartbeat to other tabs` (NEW)
- `🔄 Activity received from another tab: [tab-id]` (NEW)

## API Client Methods

```typescript
// Log an activity event
await apiClient.logActivity({
  eventType: 'idle_detected',
  idleDurationSeconds: 300,
  wasClockedIn: true,
});

// Get activity logs
const { logs } = await apiClient.getActivityLogs({
  limit: 50,
  eventType: 'auto_paused',
  dateFrom: '2025-10-01',
  dateTo: '2025-10-31',
});

// Get activity statistics
const stats = await apiClient.getActivityStats('2025-10-01', '2025-10-31');

// Get user settings
const { settings } = await apiClient.getActivitySettings();

// Update settings
await apiClient.updateActivitySettings({
  idleTimeoutMinutes: 10,
  promptTimeoutSeconds: 90,
});
```

## Future Enhancements

### Planned Features
- [ ] Settings UI in user preferences
- [ ] Activity dashboard/analytics page
- [ ] Email notifications for auto-pauses
- [ ] Team activity reports
- [ ] Machine learning for personalized idle detection
- [ ] Integration with task-level timers
- [ ] Productivity insights and recommendations
- [ ] Browser extension for cross-tab tracking

### Potential Improvements
- Detect specific types of activity (typing vs mouse movement)
- Smart idle detection based on user patterns
- Pause/resume animations
- Keyboard shortcuts for quick resume
- Sound notifications (optional)
- Mobile app support

## Troubleshooting

### Issue: Prompt not appearing
**Check:**
- Is user clocked in? (Activity tracking only works when clocked in)
- Is session already paused? (Tracking disabled when paused)
- Check console for error messages
- Verify `enabled` prop is true in useActivityTracker

### Issue: Auto-pause not working
**Check:**
- Did user respond to prompt? (Clicking "Continue" resets timer)
- Check if handlePause function is being called
- Verify API endpoint is accessible
- Check network tab for failed requests

### Issue: Prompt appears too quickly/slowly
**Solution:**
- Adjust `idleTimeoutMs` in useActivityTracker configuration
- Default is 2 minutes (120,000ms)
- Can be customized per user via settings

### Issue: Cross-tab tracking not working (NEW)
**Check:**
- Is WebSocket connected? (Check `isConnected` in console)
- Are both tabs in the same workspace?
- Check console for heartbeat messages (`💓 Sending activity heartbeat`)
- Verify ChatRoom Durable Object is receiving messages
- Ensure `sendActivityHeartbeat` and `onActivityBroadcast` props are passed to `useActivityTracker`

### Issue: Too many WebSocket messages
**Note:**
- Heartbeats are throttled to once every 5 seconds per tab
- This prevents excessive network traffic
- If you see more frequent messages, check the throttling logic in `useActivityTracker`

## Security & Privacy

### Data Protection
- Activity logs are user-scoped (can only see own logs)
- Workspace owners can see team member activity in future feature
- No sensitive data captured (only event types and timings)
- User agent logged for debugging, not tracking

### Privacy Considerations
- Activity tracking is opt-in (can be disabled)
- Clear communication about what's tracked
- No keystroke logging or screen monitoring
- Respects user privacy while ensuring accurate time tracking

## Performance

### Optimization Techniques
- Event throttling (max 1 event/second)
- Efficient event listeners with cleanup
- Lightweight D1 queries with indexes
- Minimal re-renders with useRef
- Lazy loading of activity logs

### Impact
- Negligible CPU/memory usage
- ~1-2KB additional bundle size
- No impact on page load time
- Database queries optimized with indexes

## Deployment

### Migration Applied
```bash
wrangler d1 execute task-manager-dev --remote --file=migrations/005_add_activity_tracking.sql
```

### Worker Deployed
```bash
npm run deploy
```

### Version
- **Deployed:** October 23, 2025
- **Worker Version:** 3683f8f5-e832-4788-bb5a-d43263ea9522
- **Migration:** 005_add_activity_tracking.sql

## Summary

The Activity Tracking feature provides:
- ✅ Automatic inactivity detection
- ✅ User-friendly prompt system
- ✅ Auto-pause after timeout
- ✅ Complete activity logging to D1
- ✅ Accurate time tracking
- ✅ Non-intrusive UX
- ✅ Configurable settings
- ✅ Analytics-ready data
- ✅ **Cross-tab activity synchronization via WebSocket (NEW)**
- ✅ **Seamless multi-tab workflow support (NEW)**

This ensures users have accurate time logs while maintaining a smooth, transparent user experience. The new cross-tab tracking feature allows users to work across multiple tabs of the application without their timers pausing unexpectedly.

## Limitations & Future Improvements

### Current Limitations
- **Browser-only tracking:** Activity is only tracked within the browser where the app is open
- **Same-app tabs only:** Cross-tab tracking only works between tabs of this application
- **No system-level tracking:** Cannot detect activity in other applications (Excel, Word, etc.)
- **No cross-browser tracking:** Activity in Chrome won't sync to Firefox tabs

### Comparison with Desktop Apps (e.g., Hubstaff)
Desktop time tracking applications like Hubstaff can track:
- System-wide mouse/keyboard activity
- Active application windows
- Screenshots (optional)
- Activity across all applications

Our web-based solution provides:
- ✅ No installation required
- ✅ Works on any device with a browser
- ✅ Cross-tab synchronization within the app
- ❌ Cannot track activity outside the browser
- ❌ Cannot track activity in other applications

### Potential Future Solutions
1. **Browser Extension:** Could enable cross-tab tracking across all browser tabs (not just our app)
2. **Desktop Application:** Using Electron/Tauri for system-level activity tracking
3. **Hybrid Approach:** Optional desktop agent for power users who need full system tracking
4. **Mobile Apps:** Native iOS/Android apps with background tracking capabilities

