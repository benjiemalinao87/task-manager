/*
  # Create Tasks Management Schema

  1. New Tables
    - `tasks`
      - `id` (uuid, primary key) - Unique identifier for each task
      - `task_name` (text) - Name/title of the task
      - `description` (text) - Detailed description of the task
      - `estimated_time` (text) - Estimated time to complete the task
      - `actual_time` (text) - Actual time spent on the task (nullable)
      - `task_link` (text) - Link related to the task (nullable)
      - `ai_summary` (text) - AI-generated summary of the task (nullable)
      - `email_sent` (boolean) - Whether email notification was sent
      - `created_at` (timestamptz) - When the task was created
      - `updated_at` (timestamptz) - When the task was last updated

  2. Security
    - Enable RLS on `tasks` table
    - Add policies for public access (anyone can create and read tasks)
*/

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_name text NOT NULL,
  description text NOT NULL,
  estimated_time text NOT NULL,
  actual_time text,
  task_link text,
  ai_summary text,
  email_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tasks"
  ON tasks FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create tasks"
  ON tasks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update tasks"
  ON tasks FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete tasks"
  ON tasks FOR DELETE
  USING (true);