-- Alerts Feature Diagnostic Script
-- Run this in your Supabase SQL Editor to diagnose issues with the alerts feature

-- ========================================
-- 1. Check if alerts table exists
-- ========================================
SELECT
  CASE
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'alerts')
    THEN '✓ alerts table exists'
    ELSE '✗ alerts table MISSING - create it first'
  END as alerts_table_status;

-- ========================================
-- 2. Check if alert_settings table exists
-- ========================================
SELECT
  CASE
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'alert_settings')
    THEN '✓ alert_settings table exists'
    ELSE '✗ alert_settings table MISSING - create it first'
  END as alert_settings_table_status;

-- ========================================
-- 3. Check alerts table columns
-- ========================================
SELECT
  column_name,
  data_type,
  is_nullable,
  CASE
    WHEN column_name IN (
      'id', 'server_id', 'user_id', 'team_id', 'type', 'message', 'severity',
      'current_value', 'threshold_value', 'acknowledged', 'acknowledged_at',
      'acknowledged_by', 'resolved', 'resolved_at', 'resolved_by', 'created_at'
    ) THEN '✓'
    ELSE '?'
  END as expected
FROM information_schema.columns
WHERE table_name = 'alerts'
ORDER BY ordinal_position;

-- ========================================
-- 4. Check for missing columns in alerts
-- ========================================
WITH expected_columns AS (
  SELECT unnest(ARRAY[
    'id', 'server_id', 'user_id', 'team_id', 'type', 'message', 'severity',
    'current_value', 'threshold_value', 'acknowledged', 'acknowledged_at',
    'acknowledged_by', 'resolved', 'resolved_at', 'resolved_by', 'created_at'
  ]) as column_name
),
actual_columns AS (
  SELECT column_name
  FROM information_schema.columns
  WHERE table_name = 'alerts'
)
SELECT
  '✗ Missing column: ' || e.column_name as issue
FROM expected_columns e
LEFT JOIN actual_columns a ON e.column_name = a.column_name
WHERE a.column_name IS NULL;

-- ========================================
-- 5. Check RLS status
-- ========================================
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  CASE
    WHEN rowsecurity THEN '✓ RLS is enabled'
    ELSE '✗ RLS is DISABLED - this is a security risk!'
  END as rls_status
FROM pg_tables
WHERE tablename IN ('alerts', 'alert_settings');

-- ========================================
-- 6. Check RLS policies on alerts
-- ========================================
SELECT
  policyname as policy_name,
  cmd as command,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies
WHERE tablename = 'alerts';

-- ========================================
-- 7. Check foreign key constraints
-- ========================================
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  '✓' as status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('alerts', 'alert_settings');

-- ========================================
-- 8. Check indexes
-- ========================================
SELECT
  tablename,
  indexname,
  indexdef,
  CASE
    WHEN indexname LIKE '%pkey%' THEN '✓ Primary key'
    WHEN indexname LIKE 'idx_alerts_%' THEN '✓ Index exists'
    ELSE '?'
  END as status
FROM pg_indexes
WHERE tablename IN ('alerts', 'alert_settings')
ORDER BY tablename, indexname;

-- ========================================
-- 9. Count existing alerts
-- ========================================
SELECT
  COUNT(*) as total_alerts,
  COUNT(*) FILTER (WHERE resolved = false) as active_alerts,
  COUNT(*) FILTER (WHERE resolved = true) as resolved_alerts,
  COUNT(*) FILTER (WHERE severity = 'critical') as critical_alerts,
  COUNT(*) FILTER (WHERE severity = 'warning') as warning_alerts
FROM alerts;

-- ========================================
-- 10. Count alert settings
-- ========================================
SELECT
  COUNT(*) as total_settings,
  COUNT(*) FILTER (WHERE enabled = true) as enabled_settings,
  COUNT(*) FILTER (WHERE server_id IS NOT NULL) as server_settings,
  COUNT(*) FILTER (WHERE group_id IS NOT NULL) as group_settings
FROM alert_settings;

-- ========================================
-- 11. Test basic query (as current user)
-- ========================================
-- This will test if RLS is working correctly for the current user
SELECT
  id,
  server_id,
  type,
  severity,
  created_at,
  '✓ Query successful - RLS working' as status
FROM alerts
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 5;

-- ========================================
-- 12. Summary Report
-- ========================================
SELECT
  '=== DIAGNOSTIC SUMMARY ===' as report_section,
  CASE
    WHEN NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'alerts')
    THEN '✗ CRITICAL: alerts table does not exist'
    WHEN NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'alerts' AND rowsecurity)
    THEN '✗ WARNING: RLS not enabled on alerts table'
    WHEN NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'alerts')
    THEN '✗ WARNING: No RLS policies found on alerts table'
    ELSE '✓ Basic setup looks good'
  END as status;

-- ========================================
-- INSTRUCTIONS:
-- ========================================
-- If you see any ✗ issues:
-- 1. Check ALERTS_TROUBLESHOOTING.md for solutions
-- 2. Verify table creation SQL from ALERTS_FEATURE.md
-- 3. Check browser console for detailed error messages
-- 4. Look at server logs for API errors
