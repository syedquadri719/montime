# Alerts Feature Troubleshooting Guide

If you're seeing errors when trying to access the alerts feature even though you've created the database tables, follow these steps to diagnose and fix the issue.

## Step 1: Check Browser Console

1. Open your browser's developer tools (F12 or right-click → Inspect)
2. Go to the Console tab
3. Navigate to `/dashboard/alerts`
4. Look for the console log that says: `Alerts API response: {...}`
5. Check the `data` object for error details

## Step 2: Common Issues and Solutions

### Issue 1: Missing `team_id` Column

**Error message**: `column "team_id" does not exist`

**Solution**: Add the `team_id` column to the alerts table:

```sql
ALTER TABLE alerts ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
CREATE INDEX idx_alerts_team_id ON alerts(team_id);
```

### Issue 2: Missing Acknowledgement/Resolution Columns

**Error message**: `column "acknowledged_at" does not exist` or similar

**Solution**: Add the missing columns:

```sql
ALTER TABLE alerts ADD COLUMN acknowledged_at TIMESTAMPTZ;
ALTER TABLE alerts ADD COLUMN acknowledged_by UUID REFERENCES auth.users(id);
ALTER TABLE alerts ADD COLUMN resolved_at TIMESTAMPTZ;
ALTER TABLE alerts ADD COLUMN resolved_by UUID REFERENCES auth.users(id);
```

### Issue 3: RLS Policy Issues

**Error message**: `Unable to access alerts. Check database permissions.`

**Solution**: Verify and recreate RLS policies:

```sql
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own alerts" ON alerts;
DROP POLICY IF EXISTS "Users can update own alerts" ON alerts;
DROP POLICY IF EXISTS "Admins can delete alerts" ON alerts;

-- Recreate policies
CREATE POLICY "Users can view own alerts"
  ON alerts FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own alerts"
  ON alerts FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'member')
    )
  );

CREATE POLICY "Admins can delete alerts"
  ON alerts FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

### Issue 4: Missing Foreign Key Relationship

**Error message**: Issues with `servers (id, name)` in SELECT query

**Solution**: Ensure the foreign key exists:

```sql
-- Check if foreign key exists
SELECT constraint_name
FROM information_schema.table_constraints
WHERE table_name = 'alerts' AND constraint_type = 'FOREIGN KEY';

-- If missing, add it:
ALTER TABLE alerts
ADD CONSTRAINT alerts_server_id_fkey
FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE;
```

### Issue 5: Teams Table Not Available

If you don't have a teams feature implemented:

**Solution**: Simplify the RLS policies to not reference teams:

```sql
-- Drop team-aware policies
DROP POLICY IF EXISTS "Users can view own alerts" ON alerts;
DROP POLICY IF EXISTS "Users can update own alerts" ON alerts;

-- Create simpler policies
CREATE POLICY "Users can view own alerts"
  ON alerts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own alerts"
  ON alerts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());
```

Also make the `team_id` column nullable:
```sql
ALTER TABLE alerts ALTER COLUMN team_id DROP NOT NULL;
```

## Step 3: Verify Table Schema

Run this query to check your alerts table structure:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'alerts'
ORDER BY ordinal_position;
```

Expected columns:
- `id` (uuid)
- `server_id` (uuid)
- `user_id` (uuid)
- `team_id` (uuid, nullable)
- `type` (text)
- `message` (text)
- `severity` (text)
- `current_value` (numeric)
- `threshold_value` (numeric)
- `acknowledged` (boolean)
- `acknowledged_at` (timestamp with time zone)
- `acknowledged_by` (uuid)
- `resolved` (boolean)
- `resolved_at` (timestamp with time zone)
- `resolved_by` (uuid)
- `created_at` (timestamp with time zone)

## Step 4: Check Alert Settings Table

If you're having issues with the alert settings component:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'alert_settings'
ORDER BY ordinal_position;
```

Expected columns:
- `id` (uuid)
- `server_id` (uuid, nullable)
- `group_id` (uuid, nullable)
- `user_id` (uuid)
- `team_id` (uuid, nullable)
- `enabled` (boolean)
- `cpu_threshold` (integer)
- `memory_threshold` (integer)
- `disk_threshold` (integer)
- `down_threshold_seconds` (integer)
- `notification_channels` (text[])
- `email_recipients` (text[])
- `slack_webhook_url` (text)
- `webhook_url` (text)
- `webhook_headers` (jsonb)
- `created_at` (timestamp with time zone)
- `updated_at` (timestamp with time zone)

## Step 5: Test with Simple Query

Test if you can query the alerts table directly using the Supabase admin panel:

```sql
SELECT COUNT(*) FROM alerts;
```

If this works, the table exists. If it returns data, there are alerts in the system.

Try this to test RLS:

```sql
-- This should return alerts for the current user
SELECT * FROM alerts WHERE user_id = auth.uid() LIMIT 1;
```

## Step 6: Server Logs

Check your server logs (terminal where you ran `npm run dev`) for any error messages. The API route now logs detailed error information.

## Step 7: Complete Table Recreation

If all else fails, drop and recreate the tables:

**WARNING: This will delete all existing alerts data!**

```sql
-- Backup data first if needed
CREATE TABLE alerts_backup AS SELECT * FROM alerts;
CREATE TABLE alert_settings_backup AS SELECT * FROM alert_settings;

-- Drop tables
DROP TABLE IF EXISTS alert_settings CASCADE;
DROP TABLE IF EXISTS alerts CASCADE;

-- Then use the SQL from ALERTS_FEATURE.md to recreate them
```

## Still Having Issues?

1. Check the full SQL schema in `ALERTS_FEATURE.md`
2. Verify your Supabase connection is working for other features
3. Make sure you're using the correct Supabase project
4. Check if RLS is enabled: `ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;`
5. Try disabling RLS temporarily for testing: `ALTER TABLE alerts DISABLE ROW LEVEL SECURITY;` (remember to re-enable it!)

## Debug Mode

To get more detailed error information, you can temporarily modify the error handling:

In `app/api/alerts/route.ts`, change the last catch block to:

```typescript
} catch (error: any) {
  console.error('Full error details:', JSON.stringify(error, null, 2));
  return NextResponse.json({
    error: 'Internal server error',
    details: error?.message || 'Unknown error',
    fullError: error
  }, { status: 500 });
}
```

Then check the response in your browser console for complete error details.
