/*
  # Create Time Sessions Table

  1. New Tables
    - `time_sessions`
      - `id` (uuid, primary key) - Unique identifier
      - `clock_in` (timestamptz) - Time when user clocked in
      - `clock_out` (timestamptz, nullable) - Time when user clocked out
      - `duration_minutes` (integer, nullable) - Total duration in minutes
      - `report_sent` (boolean) - Whether the report email has been sent
      - `created_at` (timestamptz) - When the record was created
      - `updated_at` (timestamptz) - When the record was last updated

  2. Security
    - Enable RLS on `time_sessions` table
    - Add policies for public access (anyone can read and write)
    
  3. Notes
    - Duration is calculated when user clocks out
    - Report is sent when clock_out is recorded
*/

CREATE TABLE IF NOT EXISTS time_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clock_in timestamptz NOT NULL DEFAULT now(),
  clock_out timestamptz,
  duration_minutes integer,
  report_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE time_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view time sessions"
  ON time_sessions FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert time sessions"
  ON time_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update time sessions"
  ON time_sessions FOR UPDATE
  USING (true)
  WITH CHECK (true);