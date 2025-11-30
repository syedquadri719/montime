/*
  # Add token column and create users view

  This migration enhances the existing schema to support the simplified API structure
  while maintaining backward compatibility.

  ## Changes

  1. Add `token` column to servers table as alias for api_key
  2. Create a users view that aliases profiles
  3. Add status column to metrics if not exists
  4. Ensure proper indexes exist

  ## Notes

  - Maintains compatibility with existing schema
  - Token and api_key are kept in sync
  - Users view provides cleaner API surface
*/

-- Add token column to servers (references api_key)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'servers' AND column_name = 'token'
  ) THEN
    ALTER TABLE servers ADD COLUMN token text UNIQUE GENERATED ALWAYS AS (api_key) STORED;
  END IF;
END $$;

-- Create users view if not exists
CREATE OR REPLACE VIEW users AS
SELECT id, email, created_at
FROM profiles;

-- Add status column to metrics if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'metrics' AND column_name = 'status'
  ) THEN
    ALTER TABLE metrics ADD COLUMN status text DEFAULT 'unknown';
  END IF;
END $$;

-- Rename metrics columns to match simpler schema
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'metrics' AND column_name = 'cpu_usage'
  ) THEN
    ALTER TABLE metrics RENAME COLUMN cpu_usage TO cpu;
    ALTER TABLE metrics RENAME COLUMN memory_usage TO memory;
    ALTER TABLE metrics RENAME COLUMN disk_usage TO disk;
  END IF;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Rename alerts columns
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'alerts' AND column_name = 'alert_type'
  ) THEN
    ALTER TABLE alerts RENAME COLUMN alert_type TO type;
  END IF;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Create index on servers token if not exists
CREATE INDEX IF NOT EXISTS idx_servers_token ON servers(api_key);