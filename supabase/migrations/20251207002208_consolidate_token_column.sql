/*
  # Consolidate to single token column

  1. Changes
    - Drop the generated token column
    - Rename api_key to token
    - Update indexes to use token instead of api_key
    - This ensures consistent naming across the application
  
  2. Security
    - No RLS changes needed
    - Maintains all existing constraints and defaults
*/

-- Drop the generated token column
ALTER TABLE servers 
DROP COLUMN IF EXISTS token;

-- Rename api_key to token
ALTER TABLE servers 
RENAME COLUMN api_key TO token;

-- Drop old index and create new one with correct name
DROP INDEX IF EXISTS idx_servers_api_key;
DROP INDEX IF EXISTS idx_servers_token;
CREATE INDEX idx_servers_token ON servers(token);
