/*
  # Create Alert Settings Table
  
  1. New Table
    - `alert_settings`: Stores alert configuration for servers and groups
      - `id` (uuid, primary key)
      - `server_id` (uuid, nullable) - Specific server settings
      - `group_id` (uuid, nullable) - Group-wide settings
      - `user_id` (uuid, required) - Owner of the settings
      - `team_id` (uuid, nullable) - Team ownership (future use)
      - `enabled` (boolean) - Whether alerts are enabled
      - `cpu_threshold` (integer) - CPU usage threshold percentage
      - `memory_threshold` (integer) - Memory usage threshold percentage
      - `disk_threshold` (integer) - Disk usage threshold percentage
      - `down_threshold_seconds` (integer) - Seconds before considering server down
      - `notification_channels` (text[]) - Array of notification types
      - `email_recipients` (text[]) - Array of email addresses
      - `slack_webhook_url` (text) - Slack webhook URL
      - `webhook_url` (text) - Custom webhook URL
      - `webhook_headers` (jsonb) - Custom headers for webhook
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Constraints
    - Either server_id OR group_id must be set (not both, not neither)
    - Foreign keys to servers, users
  
  3. Security
    - Enable RLS
    - Users can only access their own settings
  
  4. Indexes
    - Index on server_id for quick lookups
    - Index on user_id for filtering
*/

-- Create alert_settings table
CREATE TABLE IF NOT EXISTS alert_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  server_id uuid REFERENCES servers(id) ON DELETE CASCADE,
  group_id uuid,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id uuid,
  enabled boolean DEFAULT true,
  cpu_threshold integer DEFAULT 80,
  memory_threshold integer DEFAULT 85,
  disk_threshold integer DEFAULT 90,
  down_threshold_seconds integer DEFAULT 300,
  notification_channels text[] DEFAULT ARRAY['email']::text[],
  email_recipients text[] DEFAULT ARRAY[]::text[],
  slack_webhook_url text,
  webhook_url text,
  webhook_headers jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT alert_settings_target_check CHECK (
    (server_id IS NOT NULL AND group_id IS NULL) OR
    (server_id IS NULL AND group_id IS NOT NULL)
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_alert_settings_server_id ON alert_settings(server_id);
CREATE INDEX IF NOT EXISTS idx_alert_settings_group_id ON alert_settings(group_id);
CREATE INDEX IF NOT EXISTS idx_alert_settings_user_id ON alert_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_settings_team_id ON alert_settings(team_id);

-- Enable RLS
ALTER TABLE alert_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own alert settings"
  ON alert_settings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own alert settings"
  ON alert_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own alert settings"
  ON alert_settings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own alert settings"
  ON alert_settings FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_alert_settings_updated_at
  BEFORE UPDATE ON alert_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
