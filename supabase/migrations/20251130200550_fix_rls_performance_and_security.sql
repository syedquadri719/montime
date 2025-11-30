/*
  # Fix RLS Performance and Security Issues

  This migration addresses multiple security and performance issues:

  ## 1. RLS Policy Performance Optimization
  - Updates all RLS policies to use `(select auth.uid())` instead of `auth.uid()`
  - Prevents re-evaluation of auth functions for each row, significantly improving query performance
  - Affects policies on: profiles, servers, metrics, and alerts tables

  ## 2. Index Optimization
  - Removes duplicate index `idx_servers_api_key` (duplicate of `idx_servers_token`)
  - Removes unused indexes that are not being utilized by queries:
    * `idx_servers_token`
    * `idx_servers_user_id`
    * `idx_metrics_server_id`
    * `idx_metrics_timestamp`
    * `idx_alerts_server_id`
    * `idx_alerts_user_id`
    * `idx_alerts_created_at`
  - Note: Indexes will be recreated if query patterns show they are needed

  ## 3. Security Definer and Function Security
  - Fixes `users` view to remove SECURITY DEFINER if present
  - Sets explicit search_path for functions to prevent search path injection attacks:
    * `handle_new_user` function
    * `update_updated_at_column` function

  ## Security Impact
  - Improves RLS policy performance at scale
  - Prevents potential search path injection vulnerabilities
  - Reduces index overhead on write operations
*/

-- ============================================================================
-- 1. OPTIMIZE RLS POLICIES - PROFILES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

-- ============================================================================
-- 2. OPTIMIZE RLS POLICIES - SERVERS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own servers" ON servers;
CREATE POLICY "Users can view own servers"
  ON servers
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own servers" ON servers;
CREATE POLICY "Users can insert own servers"
  ON servers
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own servers" ON servers;
CREATE POLICY "Users can update own servers"
  ON servers
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own servers" ON servers;
CREATE POLICY "Users can delete own servers"
  ON servers
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================================================
-- 3. OPTIMIZE RLS POLICIES - METRICS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view metrics for own servers" ON metrics;
CREATE POLICY "Users can view metrics for own servers"
  ON metrics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM servers
      WHERE servers.id = metrics.server_id
      AND servers.user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- 4. OPTIMIZE RLS POLICIES - ALERTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own alerts" ON alerts;
CREATE POLICY "Users can view own alerts"
  ON alerts
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own alerts" ON alerts;
CREATE POLICY "Users can update own alerts"
  ON alerts
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================================================
-- 5. REMOVE DUPLICATE AND UNUSED INDEXES
-- ============================================================================

-- Remove duplicate index (idx_servers_api_key is duplicate of idx_servers_token)
DROP INDEX IF EXISTS idx_servers_api_key;

-- Remove unused indexes (can be recreated later if query patterns require them)
DROP INDEX IF EXISTS idx_servers_token;
DROP INDEX IF EXISTS idx_servers_user_id;
DROP INDEX IF EXISTS idx_metrics_server_id;
DROP INDEX IF EXISTS idx_metrics_timestamp;
DROP INDEX IF EXISTS idx_alerts_server_id;
DROP INDEX IF EXISTS idx_alerts_user_id;
DROP INDEX IF EXISTS idx_alerts_created_at;

-- ============================================================================
-- 6. FIX FUNCTION SECURITY - SEARCH PATH
-- ============================================================================

-- Fix handle_new_user function to have immutable search_path
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$;

-- Recreate trigger for handle_new_user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Fix update_updated_at_column function to have immutable search_path
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Recreate triggers for update_updated_at_column
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_servers_updated_at ON servers;
CREATE TRIGGER update_servers_updated_at
  BEFORE UPDATE ON servers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. FIX SECURITY DEFINER VIEW
-- ============================================================================

-- Recreate users view without SECURITY DEFINER if it exists
DROP VIEW IF EXISTS users;
CREATE OR REPLACE VIEW users AS
SELECT
  id,
  email,
  created_at,
  updated_at
FROM profiles;

-- Grant appropriate permissions
GRANT SELECT ON users TO authenticated;
