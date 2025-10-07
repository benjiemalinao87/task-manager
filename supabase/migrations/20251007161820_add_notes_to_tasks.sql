/*
  # Add Notes Field to Tasks

  1. Changes
    - Add optional `notes` column to `tasks` table
    - Notes can be added when completing a task
    - Notes will be included in completion emails
  
  2. Details
    - Column: `notes` (text, nullable)
    - Default: NULL (optional field)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'notes'
  ) THEN
    ALTER TABLE tasks ADD COLUMN notes text;
  END IF;
END $$;