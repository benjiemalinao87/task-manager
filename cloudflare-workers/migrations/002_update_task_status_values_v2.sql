-- Migration: Remove CHECK constraint from task status to allow flexible status values
-- Date: 2025-10-20
-- Description: Removes the restrictive CHECK constraint on task status field

-- Temporarily disable foreign key constraints during migration
PRAGMA foreign_keys = OFF;

-- Step 1: Create new tasks table without CHECK constraint on status
CREATE TABLE tasks_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  workspace_id TEXT,
  task_name TEXT NOT NULL,
  description TEXT,
  estimated_time TEXT,
  actual_time TEXT,
  task_link TEXT,
  ai_summary TEXT,
  status TEXT DEFAULT 'in_progress',
  priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
  asana_task_id TEXT,
  notes TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  assigned_to TEXT,
  assigned_by TEXT,
  assigned_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Step 2: Copy all data from old table to new table
INSERT INTO tasks_new (
  id, user_id, workspace_id, task_name, description, estimated_time, actual_time,
  task_link, ai_summary, status, priority, asana_task_id, notes, started_at,
  completed_at, created_at, updated_at, assigned_to, assigned_by, assigned_at
)
SELECT
  id, user_id, workspace_id, task_name, description, estimated_time, actual_time,
  task_link, ai_summary, status, priority, asana_task_id, notes, started_at,
  completed_at, created_at, updated_at, assigned_to, assigned_by, assigned_at
FROM tasks;

-- Step 3: Drop the old table
DROP TABLE tasks;

-- Step 4: Rename new table to original name
ALTER TABLE tasks_new RENAME TO tasks;

-- Recreate indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);

-- Re-enable foreign key constraints
PRAGMA foreign_keys = ON;
