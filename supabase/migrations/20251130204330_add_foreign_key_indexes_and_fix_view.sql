/*
  # Add Foreign Key Indexes and Fix Security Definer View

  This migration addresses critical performance and security issues:

  ## 1. Foreign Key Index Performance
  - Adds covering indexes for all foreign key columns
  - Improves JOIN performance and referential integrity checks
  - Prevents table scans on foreign key lookups
  
  Indexes added:
  - `idx_alerts_server_id_fk` on alerts.server_id
  - `idx_alerts_user_id_fk` on alerts.user_id
  - `idx_metrics_server_id_fk` on metrics.server_id
  - `idx_servers_user_id_fk` on servers.user_id

  ## 2. Security Definer View Fix
  - Removes SECURITY DEFINER from users view
  - Recreates view with proper security context
  - Maintains functionality while reducing attack surface

  ## Performance Impact
  - Dramatically improves JOIN query performance
  - Faster CASCADE operations on DELETE/UPDATE
  - Better query planner optimization
  - Reduced I/O for foreign key constraint checks

  ## Security Impact
  - Eliminates unnecessary privilege escalation
  - Maintains RLS policy enforcement
  - No breaking changes to application queries
*/

-- ============================================================================
-- 1. ADD FOREIGN KEY INDEXES
-- ============================================================================

-- Index for alerts.server_id foreign key
-- Used when: querying alerts for a specific server, JOINing alerts with servers
CREATE INDEX IF NOT EXISTS idx_alerts_server_id_fk 
ON alerts(server_id);

-- Index for alerts.user_id foreign key
-- Used when: querying alerts for a specific user, JOINing alerts with profiles
CREATE INDEX IF NOT EXISTS idx_alerts_user_id_fk 
ON alerts(user_id);

-- Index for metrics.server_id foreign key
-- Used when: querying metrics for a specific server, JOINing metrics with servers
-- This is critical as metrics table will have high volume
CREATE INDEX IF NOT EXISTS idx_metrics_server_id_fk 
ON metrics(server_id);

-- Index for servers.user_id foreign key
-- Used when: querying servers for a specific user, JOINing servers with profiles
CREATE INDEX IF NOT EXISTS idx_servers_user_id_fk 
ON servers(user_id);

-- ============================================================================
-- 2. ADD COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
-- ============================================================================

-- Composite index for metrics queries (server_id + created_at)
-- Optimizes: SELECT * FROM metrics WHERE server_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_metrics_server_created 
ON metrics(server_id, created_at DESC);

-- Composite index for alerts queries (user_id + created_at)
-- Optimizes: SELECT * FROM alerts WHERE user_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_alerts_user_created 
ON alerts(user_id, created_at DESC);

-- ============================================================================
-- 3. FIX SECURITY DEFINER VIEW
-- ============================================================================

-- Drop and recreate users view without SECURITY DEFINER
DROP VIEW IF EXISTS users CASCADE;

-- Create view with proper security context
CREATE VIEW users 
WITH (security_invoker = true)
AS
SELECT
  id,
  email,
  created_at,
  updated_at
FROM profiles;

-- Grant SELECT permission to authenticated users
GRANT SELECT ON users TO authenticated;

-- Add comment documenting the view
COMMENT ON VIEW users IS 'Public view of user profiles without SECURITY DEFINER. Access controlled by RLS on profiles table.';

-- ============================================================================
-- 4. ANALYZE TABLES FOR QUERY PLANNER
-- ============================================================================

-- Update statistics for query planner optimization
ANALYZE alerts;
ANALYZE metrics;
ANALYZE servers;
ANALYZE profiles;
