-- Migration: Add priority field to tasks table
-- Created: 2025-10-14

ALTER TABLE tasks ADD COLUMN priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent'));

-- Create index for priority queries
CREATE INDEX idx_tasks_priority ON tasks(priority);
