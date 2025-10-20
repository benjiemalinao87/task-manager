-- Migration: Update task status constraint to support new status values
-- Date: 2025-10-20
-- Description: Expands the task status CHECK constraint to include all workflow statuses

-- SQLite doesn't support modifying CHECK constraints directly
-- We need to:
-- 1. Create a new table with the updated constraint
-- 2. Copy data from the old table
-- 3. Drop the old table
-- 4. Rename the new table

-- Temporarily disable foreign key constraints during migration
PRAGMA foreign_keys = OFF;

-- Step 1: Create new tasks table with updated status constraint
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
  status TEXT DEFAULT 'in_progress' CHECK(status IN (
    'draft',
    'in_progress',
    'waiting_approval',
    'changes_requested',
    'approved',
    'live',
    'archived',
    'cancelled',
    'completed'
  )),
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
INSERT INTO tasks_new SELECT * FROM tasks;

-- Step 3: Drop the old table
DROP TABLE tasks;

-- Step 4: Rename new table to original name
ALTER TABLE tasks_new RENAME TO tasks;

-- Recreate indexes for performance
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_workspace_id ON tasks(workspace_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);

-- Re-enable foreign key constraints
PRAGMA foreign_keys = ON;
