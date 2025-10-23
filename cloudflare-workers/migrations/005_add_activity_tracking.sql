-- Activity Tracking Migration
-- Track user activity and auto-pause events for accurate time tracking

-- Activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  workspace_id TEXT,
  session_id TEXT,
  
  -- Activity type
  event_type TEXT NOT NULL, -- 'idle_detected', 'prompt_shown', 'user_continued', 'auto_paused', 'manual_paused', 'resumed'
  
  -- Timing
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  idle_duration_seconds INTEGER, -- How long user was idle before event
  
  -- Context
  was_clocked_in INTEGER DEFAULT 0, -- Whether user had active session
  was_task_timer_running INTEGER DEFAULT 0, -- Whether a task timer was running
  
  -- Response time (for prompts)
  prompt_response_time_seconds INTEGER, -- How long it took user to respond to prompt
  
  -- Device/Browser context
  user_agent TEXT,
  tab_visible INTEGER DEFAULT 1, -- Whether tab was visible when event occurred
  
  -- Metadata
  notes TEXT, -- Additional context
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL,
  FOREIGN KEY (session_id) REFERENCES time_sessions(id) ON DELETE SET NULL
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_workspace_id ON activity_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_session_id ON activity_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_event_type ON activity_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_timestamp ON activity_logs(user_id, timestamp);

-- User activity settings table
CREATE TABLE IF NOT EXISTS activity_settings (
  user_id TEXT PRIMARY KEY,
  
  -- Activity tracking preferences
  idle_timeout_minutes INTEGER DEFAULT 5, -- Minutes before showing idle prompt
  prompt_timeout_seconds INTEGER DEFAULT 60, -- Seconds before auto-pause
  
  -- Feature toggles
  activity_tracking_enabled INTEGER DEFAULT 1, -- Enable/disable activity tracking
  track_tab_visibility INTEGER DEFAULT 1, -- Track when user switches tabs
  
  -- Notification preferences
  notify_on_auto_pause INTEGER DEFAULT 1, -- Show notification when auto-paused
  
  -- Updated timestamp
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add activity tracking fields to time_sessions (if not exist)
-- These were added in migration 004, but including here for reference
-- ALTER TABLE time_sessions ADD COLUMN auto_paused_count INTEGER DEFAULT 0;
-- ALTER TABLE time_sessions ADD COLUMN last_activity_at TEXT;

