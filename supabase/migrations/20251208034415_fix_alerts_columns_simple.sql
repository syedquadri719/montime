/*
  # Fix Alerts Table Schema (Simple Version)
  
  1. Changes
    - Rename `alert_type` column to `type` to match application code
    - Add `team_id` column (nullable, for future team support)
    - Add `acknowledged_by` column to track who acknowledged the alert
    - Add `resolved_by` column to track who resolved the alert
    - Add indexes for new columns for performance
  
  2. Security
    - Update RLS policies for user-only access (no team support yet)
    - Ensure proper foreign key constraints
  
  Note: This fixes the "column type does not exist" error
*/

-- Rename alert_type to type
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'alerts' AND column_name = 'alert_type'
  ) THEN
    ALTER TABLE alerts RENAME COLUMN alert_type TO type;
  END IF;
END $$;

-- Add team_id column if it doesn't exist (nullable for future use)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'alerts' AND column_name = 'team_id'
  ) THEN
    ALTER TABLE alerts ADD COLUMN team_id uuid;
  END IF;
END $$;

-- Add acknowledged_by column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'alerts' AND column_name = 'acknowledged_by'
  ) THEN
    ALTER TABLE alerts ADD COLUMN acknowledged_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Add resolved_by column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'alerts' AND column_name = 'resolved_by'
  ) THEN
    ALTER TABLE alerts ADD COLUMN resolved_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_alerts_team_id ON alerts(team_id);
CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged_by ON alerts(acknowledged_by);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved_by ON alerts(resolved_by);

-- Add index for filtering by resolved status
CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);

-- Update RLS policies for user-only access
DROP POLICY IF EXISTS "Users can view own alerts" ON alerts;
DROP POLICY IF EXISTS "Users can update own alerts" ON alerts;
DROP POLICY IF EXISTS "Users can insert own alerts" ON alerts;
DROP POLICY IF EXISTS "Users can delete own alerts" ON alerts;

-- Create simple user-based RLS policies
CREATE POLICY "Users can view own alerts"
  ON alerts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own alerts"
  ON alerts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own alerts"
  ON alerts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own alerts"
  ON alerts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
