/*
  # MonTime Complete Schema - Production Deployment

  This migration creates the complete MonTime server monitoring platform schema.

  ## Tables Created
  
  ### 1. profiles
  - `id` (uuid, primary key) - Links to auth.users
  - `email` (text, not null, unique) - User email
  - `full_name` (text, nullable) - User's full name
  - `company_name` (text, nullable) - Company name
  - `stripe_customer_id` (text, nullable) - Stripe customer ID for billing
  - `subscription_status` (text, default 'trialing') - Subscription status
  - `subscription_tier` (text, default 'free') - Subscription tier
  - `server_limit` (integer, default 5) - Number of servers allowed
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. servers
  - `id` (uuid, primary key) - Unique server identifier
  - `user_id` (uuid, foreign key) - Links to profiles
  - `name` (text, not null) - Server display name
  - `hostname` (text, not null) - Server hostname/IP
  - `api_key` (text, not null, unique) - Authentication token for agents
  - `status` (text, default 'unknown') - Server status (online/offline/warning)
  - `last_seen_at` (timestamptz, nullable) - Last metrics received timestamp
  - `metadata` (jsonb, default '{}') - Additional server info (OS, cores, RAM, etc)
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 3. metrics
  - `id` (uuid, primary key) - Unique metric record
  - `server_id` (uuid, foreign key) - Links to servers
  - `timestamp` (timestamptz, not null) - When metric was collected
  - `cpu_usage` (numeric, nullable) - CPU usage percentage
  - `memory_usage` (numeric, nullable) - Memory usage percentage
  - `disk_usage` (numeric, nullable) - Disk usage percentage
  - `network_in` (bigint, default 0) - Network bytes received
  - `network_out` (bigint, default 0) - Network bytes sent
  - `load_average` (numeric, nullable) - System load average
  - `uptime` (bigint, default 0) - System uptime in seconds
  - `processes` (integer, default 0) - Number of running processes
  - `created_at` (timestamptz) - Record creation timestamp

  ### 4. alerts
  - `id` (uuid, primary key) - Unique alert identifier
  - `server_id` (uuid, foreign key) - Links to servers
  - `user_id` (uuid, foreign key) - Links to profiles
  - `alert_type` (text, not null) - Alert type (cpu/memory/disk)
  - `severity` (text, default 'warning') - Alert severity (warning/critical)
  - `message` (text, not null) - Human-readable alert message
  - `threshold_value` (numeric, nullable) - Threshold that was exceeded
  - `current_value` (numeric, nullable) - Current value that triggered alert
  - `acknowledged` (boolean, default false) - Whether alert was acknowledged
  - `acknowledged_at` (timestamptz, nullable) - When alert was acknowledged
  - `resolved` (boolean, default false) - Whether alert is resolved
  - `resolved_at` (timestamptz, nullable) - When alert was resolved
  - `created_at` (timestamptz) - Alert creation timestamp

  ## Security Features
  
  - Row Level Security (RLS) enabled on all tables
  - Users can only access their own data
  - Service role has full access for system operations
  - Optimized RLS policies using (select auth.uid()) pattern
  - Functions secured with proper search_path settings

  ## Performance Features
  
  - Foreign key indexes on all relationships
  - Composite indexes for common query patterns
  - Automatic updated_at timestamp triggers
  - Optimized for time-series metric queries

  ## Additional Features
  
  - Automatic profile creation on user signup
  - Users view for cleaner API interface
  - Token-based authentication for monitoring agents
  - Audit trail with created_at/updated_at timestamps
*/

-- ============================================================================
-- ENABLE UUID EXTENSION
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CREATE TABLES
-- ============================================================================

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  full_name text,
  company_name text,
  stripe_customer_id text,
  subscription_status text DEFAULT 'trialing',
  subscription_tier text DEFAULT 'free',
  server_limit integer DEFAULT 5,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. SERVERS TABLE
CREATE TABLE IF NOT EXISTS servers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  hostname text NOT NULL,
  api_key text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'base64'),
  status text DEFAULT 'unknown',
  last_seen_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. METRICS TABLE
CREATE TABLE IF NOT EXISTS metrics (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  server_id uuid NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  timestamp timestamptz NOT NULL DEFAULT now(),
  cpu_usage numeric,
  memory_usage numeric,
  disk_usage numeric,
  network_in bigint DEFAULT 0,
  network_out bigint DEFAULT 0,
  load_average numeric,
  uptime bigint DEFAULT 0,
  processes integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 4. ALERTS TABLE
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  server_id uuid NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  alert_type text NOT NULL,
  severity text DEFAULT 'warning',
  message text NOT NULL,
  threshold_value numeric,
  current_value numeric,
  acknowledged boolean DEFAULT false,
  acknowledged_at timestamptz,
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- CREATE INDEXES
-- ============================================================================

-- Foreign key indexes for optimal JOIN performance
CREATE INDEX IF NOT EXISTS idx_servers_user_id_fk ON servers(user_id);
CREATE INDEX IF NOT EXISTS idx_metrics_server_id_fk ON metrics(server_id);
CREATE INDEX IF NOT EXISTS idx_alerts_server_id_fk ON alerts(server_id);
CREATE INDEX IF NOT EXISTS idx_alerts_user_id_fk ON alerts(user_id);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_metrics_server_created ON metrics(server_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_user_created ON alerts(user_id, created_at DESC);

-- Index for API key lookups (used by monitoring agents)
CREATE INDEX IF NOT EXISTS idx_servers_api_key ON servers(api_key);

-- ============================================================================
-- CREATE FUNCTIONS
-- ============================================================================

-- Function to automatically create profile on user signup
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

-- Function to automatically update updated_at timestamp
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

-- ============================================================================
-- CREATE TRIGGERS
-- ============================================================================

-- Trigger to create profile on auth user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Triggers to auto-update updated_at timestamps
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_servers_updated_at ON servers;
CREATE TRIGGER update_servers_updated_at
  BEFORE UPDATE ON servers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CREATE RLS POLICIES - PROFILES
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
-- CREATE RLS POLICIES - SERVERS
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

DROP POLICY IF EXISTS "Service role has full access to servers" ON servers;
CREATE POLICY "Service role has full access to servers"
  ON servers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- CREATE RLS POLICIES - METRICS
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

DROP POLICY IF EXISTS "Service role has full access to metrics" ON metrics;
CREATE POLICY "Service role has full access to metrics"
  ON metrics
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- CREATE RLS POLICIES - ALERTS
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

DROP POLICY IF EXISTS "Service role has full access to alerts" ON alerts;
CREATE POLICY "Service role has full access to alerts"
  ON alerts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- CREATE VIEWS
-- ============================================================================

-- Users view for cleaner API surface
DROP VIEW IF EXISTS users CASCADE;
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

COMMENT ON VIEW users IS 'Public view of user profiles without SECURITY DEFINER. Access controlled by RLS on profiles table.';

-- ============================================================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- ============================================================================

ANALYZE profiles;
ANALYZE servers;
ANALYZE metrics;
ANALYZE alerts;