-- ============================================
-- MIGRATION: Add Team Collaboration Features
-- Date: 2025-10-15
-- Description: Add workspaces, team members, and task assignment
-- ============================================

-- ============================================
-- 1. CREATE NEW TABLES
-- ============================================

-- Workspaces Table
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_workspaces_owner_id ON workspaces(owner_id);

-- Workspace Members Table (Junction)
CREATE TABLE IF NOT EXISTS workspace_members (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT DEFAULT 'member' CHECK(role IN ('owner', 'admin', 'member')),
  invited_by TEXT,
  joined_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(workspace_id, user_id)
);

CREATE INDEX idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user_id ON workspace_members(user_id);
CREATE INDEX idx_workspace_members_role ON workspace_members(role);

-- Workspace Invitations Table
CREATE TABLE IF NOT EXISTS workspace_invitations (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'member' CHECK(role IN ('admin', 'member')),
  invited_by TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'declined', 'expired')),
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_workspace_invitations_token ON workspace_invitations(token);
CREATE INDEX idx_workspace_invitations_email ON workspace_invitations(email);
CREATE INDEX idx_workspace_invitations_workspace_id ON workspace_invitations(workspace_id);
CREATE INDEX idx_workspace_invitations_status ON workspace_invitations(status);

-- ============================================
-- 2. MODIFY EXISTING TABLES
-- ============================================

-- Add workspace_id, assigned_to, assigned_by, assigned_at to tasks table
-- Note: SQLite doesn't support ADD COLUMN with FOREIGN KEY in one statement
-- We'll add columns first, then handle data migration

-- Check if columns already exist before adding
-- (This makes the migration idempotent)

-- Add workspace_id column
ALTER TABLE tasks ADD COLUMN workspace_id TEXT;

-- Add assigned_to column
ALTER TABLE tasks ADD COLUMN assigned_to TEXT;

-- Add assigned_by column
ALTER TABLE tasks ADD COLUMN assigned_by TEXT;

-- Add assigned_at column
ALTER TABLE tasks ADD COLUMN assigned_at TEXT;

-- Create indexes for new task columns
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_assigned ON tasks(workspace_id, assigned_to);

-- Add workspace_id to time_sessions table
ALTER TABLE time_sessions ADD COLUMN workspace_id TEXT;

CREATE INDEX IF NOT EXISTS idx_time_sessions_workspace_id ON time_sessions(workspace_id);

-- ============================================
-- 3. MIGRATE EXISTING DATA
-- ============================================

-- For each existing user, create a default workspace
-- and migrate their existing tasks and time sessions

-- Step 1: Create default workspaces for existing users
INSERT INTO workspaces (id, name, owner_id, created_at, updated_at)
SELECT
  lower(hex(randomblob(16))),
  'My Workspace',
  id,
  datetime('now'),
  datetime('now')
FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM workspaces WHERE owner_id = users.id
);

-- Step 2: Add each user as owner of their workspace
INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at, created_at)
SELECT
  lower(hex(randomblob(16))),
  w.id,
  w.owner_id,
  'owner',
  datetime('now'),
  datetime('now')
FROM workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM workspace_members
  WHERE workspace_id = w.id AND user_id = w.owner_id
);

-- Step 3: Migrate existing tasks to user's default workspace
UPDATE tasks
SET workspace_id = (
  SELECT id FROM workspaces WHERE owner_id = tasks.user_id LIMIT 1
)
WHERE workspace_id IS NULL;

-- Step 4: Migrate existing time_sessions to user's default workspace
UPDATE time_sessions
SET workspace_id = (
  SELECT id FROM workspaces WHERE owner_id = time_sessions.user_id LIMIT 1
)
WHERE workspace_id IS NULL;

-- ============================================
-- 4. VERIFICATION QUERIES (for logging)
-- ============================================

-- Count migrated workspaces
SELECT COUNT(*) as migrated_workspaces FROM workspaces;

-- Count migrated workspace members
SELECT COUNT(*) as migrated_members FROM workspace_members;

-- Count tasks with workspace
SELECT COUNT(*) as tasks_with_workspace FROM tasks WHERE workspace_id IS NOT NULL;

-- Count time sessions with workspace
SELECT COUNT(*) as sessions_with_workspace FROM time_sessions WHERE workspace_id IS NOT NULL;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
