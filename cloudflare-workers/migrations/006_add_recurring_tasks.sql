-- ============================================
-- Recurring Tasks Migration
-- Add support for recurring task patterns
-- ============================================

-- Add recurring pattern fields to tasks table
ALTER TABLE tasks ADD COLUMN is_recurring INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN recurring_pattern_id TEXT;
ALTER TABLE tasks ADD COLUMN recurrence_instance_date TEXT;

-- Create recurring_patterns table
CREATE TABLE IF NOT EXISTS recurring_patterns (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  workspace_id TEXT,
  
  -- Task template fields
  task_name TEXT NOT NULL,
  description TEXT NOT NULL,
  estimated_time TEXT NOT NULL,
  task_link TEXT,
  priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_to TEXT,
  
  -- Recurrence settings
  frequency TEXT NOT NULL CHECK(frequency IN ('daily', 'weekly', 'monthly', 'yearly', 'custom')),
  interval INTEGER DEFAULT 1, -- Every X days/weeks/months/years
  
  -- Weekly options (for weekly frequency)
  days_of_week TEXT, -- JSON array: ["monday", "tuesday", "friday"]
  
  -- Monthly options (for monthly frequency)
  day_of_month INTEGER, -- 1-31
  week_of_month INTEGER, -- 1-4, or -1 for last
  day_name TEXT, -- "monday", "tuesday", etc. (for week_of_month)
  
  -- Time of day
  time_of_day TEXT, -- "09:00", "14:30", etc. or NULL for all-day
  
  -- Start and end dates
  start_date TEXT NOT NULL,
  end_date TEXT, -- NULL for no end date
  occurrences_limit INTEGER, -- Max number of occurrences, NULL for unlimited
  occurrences_count INTEGER DEFAULT 0, -- Current count
  
  -- Status
  is_active INTEGER DEFAULT 1,
  last_generated_date TEXT,
  next_occurrence_date TEXT,
  
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_recurring_patterns_user_id ON recurring_patterns(user_id);
CREATE INDEX idx_recurring_patterns_workspace_id ON recurring_patterns(workspace_id);
CREATE INDEX idx_recurring_patterns_active ON recurring_patterns(is_active);
CREATE INDEX idx_recurring_patterns_next_occurrence ON recurring_patterns(next_occurrence_date);
CREATE INDEX idx_recurring_patterns_frequency ON recurring_patterns(frequency);

-- Create index on tasks for recurring lookups
CREATE INDEX idx_tasks_recurring_pattern ON tasks(recurring_pattern_id);
CREATE INDEX idx_tasks_is_recurring ON tasks(is_recurring);
CREATE INDEX idx_tasks_recurrence_instance ON tasks(recurrence_instance_date);

