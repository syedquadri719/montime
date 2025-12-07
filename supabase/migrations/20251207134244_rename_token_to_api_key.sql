/*
  # Rename token column to api_key in servers table

  1. Changes
    - Rename `servers.token` column to `servers.api_key`
    - All constraints and defaults are preserved
    - All data is preserved
  
  2. Notes
    - This is a safe rename operation with no data loss
    - The unique constraint on the column is maintained
*/

-- Rename the token column to api_key
ALTER TABLE servers 
RENAME COLUMN token TO api_key;
