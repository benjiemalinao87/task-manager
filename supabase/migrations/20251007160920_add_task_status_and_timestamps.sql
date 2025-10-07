/*
  # Add task status and start time tracking

  1. Changes
    - Add `status` column to tasks table with values: 'in_progress', 'completed'
    - Add `started_at` column to track when task was created/started
    - Add `completed_at` column to track when task was completed
    - Set default status to 'in_progress'
  
  2. Notes
    - Existing tasks will be set to 'completed' status by default
    - This enables tracking task lifecycle from creation to completion
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'status'
  ) THEN
    ALTER TABLE tasks ADD COLUMN status text DEFAULT 'in_progress' NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'started_at'
  ) THEN
    ALTER TABLE tasks ADD COLUMN started_at timestamptz DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE tasks ADD COLUMN completed_at timestamptz;
  END IF;
END $$;

-- Update existing tasks to have completed status
UPDATE tasks SET status = 'completed', completed_at = updated_at WHERE status = 'in_progress' AND email_sent = true;
