/*
  # Add service_role policy to servers table

  1. Changes
    - Add policy to allow service_role full access to servers table
    - This enables server-side operations using the service role key
  
  2. Security
    - service_role has full access (needed for server-side API operations)
    - Existing authenticated user policies remain unchanged
*/

-- Allow service_role to perform all operations on servers table
CREATE POLICY "Service role has full access to servers"
  ON servers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);