/*
  # Create Settings Table

  1. New Tables
    - `settings`
      - `id` (uuid, primary key) - Unique identifier
      - `default_email` (text) - Default destination email for task notifications
      - `created_at` (timestamptz) - When the settings were created
      - `updated_at` (timestamptz) - When the settings were last updated

  2. Security
    - Enable RLS on `settings` table
    - Add policies for public access (anyone can read and update settings)
    
  3. Notes
    - This is a single-row settings table for simplicity
    - Initial row is created with a default email placeholder
*/

CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  default_email text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view settings"
  ON settings FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert settings"
  ON settings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update settings"
  ON settings FOR UPDATE
  USING (true)
  WITH CHECK (true);

INSERT INTO settings (default_email) VALUES ('') ON CONFLICT DO NOTHING;