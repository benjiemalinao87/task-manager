/*
  # Create Integrations Table

  1. New Tables
    - `integrations`
      - `id` (uuid, primary key) - Unique identifier
      - `integration_type` (text) - Type of integration: 'asana', 'resend', 'sendgrid'
      - `api_key` (text) - API key or access token for the integration
      - `is_active` (boolean) - Whether this integration is currently active
      - `config` (jsonb) - Integration-specific configuration (project_id, domains, assignees, etc.)
      - `created_at` (timestamptz) - When the integration was created
      - `updated_at` (timestamptz) - When the integration was last updated

  2. Security
    - Enable RLS on `integrations` table
    - Add policies for public access (anyone can read and update integrations)
    
  3. Indexes
    - Add index on integration_type for faster lookups
    - Add unique constraint on integration_type to ensure only one config per integration

  4. Notes
    - API keys should be handled securely
    - config field stores integration-specific settings like:
      - Asana: { project_gid, default_assignee_email }
      - Resend: { from_domain, from_email }
      - SendGrid: { from_email, from_name }
*/

CREATE TABLE IF NOT EXISTS integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_type text NOT NULL,
  api_key text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT false,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_integration_type UNIQUE (integration_type)
);

CREATE INDEX IF NOT EXISTS idx_integrations_type ON integrations(integration_type);

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view integrations"
  ON integrations FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert integrations"
  ON integrations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update integrations"
  ON integrations FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete integrations"
  ON integrations FOR DELETE
  USING (true);