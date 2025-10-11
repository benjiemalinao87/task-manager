/*
  # Add Asana Task ID to Tasks Table

  1. Changes
    - Add `asana_task_id` column to `tasks` table to store the Asana task ID
    - This allows us to track which Asana task corresponds to each local task
    - When a task is completed locally, we can use this ID to complete it in Asana too
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'asana_task_id'
  ) THEN
    ALTER TABLE tasks ADD COLUMN asana_task_id text;
  END IF;
END $$;