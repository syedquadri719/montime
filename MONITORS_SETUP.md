# External Monitors Feature - Database Setup

The External Monitors feature has been successfully added to MonTime. All code is in place and ready to use. To complete the setup, you need to create the required database tables.

## Features Added

- **Monitor Management**: Create, edit, and delete monitors from `/dashboard/monitors`
- **Monitor Types**: HTTP(s), Ping, TCP Port, Keyword, SSL certificate checks
- **Monitoring Dashboard**: Real-time status, response time charts, uptime percentage
- **Incident Tracking**: Automatic detection and logging of downtime events
- **Public Status Pages**: Each monitor has a public status page at `/status/[monitor-id]`
- **Alert Integration**: Monitors integrate with the existing alerts system
- **Automated Checks**: Edge Function deployed for scheduled monitoring

## Database Schema

Run the following SQL in your Supabase SQL Editor to create the required tables:

```sql
-- Create monitors table
CREATE TABLE IF NOT EXISTS monitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  url TEXT NOT NULL,
  interval INTEGER DEFAULT 5,
  timeout INTEGER DEFAULT 30,
  expected_status INTEGER,
  expected_keyword TEXT,
  port INTEGER,
  enabled BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'unknown',
  last_checked_at TIMESTAMPTZ,
  last_response_time INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create monitor_checks table
CREATE TABLE IF NOT EXISTS monitor_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id UUID NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  success BOOLEAN NOT NULL,
  response_time INTEGER NOT NULL,
  status_code INTEGER,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create monitor_incidents table
CREATE TABLE IF NOT EXISTS monitor_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id UUID NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  duration INTEGER,
  status TEXT DEFAULT 'open',
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE monitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitor_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitor_incidents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for monitors
CREATE POLICY "Users can view own monitors"
  ON monitors FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own monitors"
  ON monitors FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own monitors"
  ON monitors FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own monitors"
  ON monitors FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for monitor_checks
CREATE POLICY "Users can view checks for own monitors"
  ON monitor_checks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM monitors
      WHERE monitors.id = monitor_checks.monitor_id
      AND monitors.user_id = auth.uid()
    )
  );

-- Service role can insert checks
CREATE POLICY "Service role can insert checks"
  ON monitor_checks FOR INSERT
  TO service_role
  WITH CHECK (true);

-- RLS Policies for monitor_incidents
CREATE POLICY "Users can view own incidents"
  ON monitor_incidents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role can manage incidents
CREATE POLICY "Service role can manage incidents"
  ON monitor_incidents FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_monitors_user_id ON monitors(user_id);
CREATE INDEX IF NOT EXISTS idx_monitors_enabled ON monitors(enabled);
CREATE INDEX IF NOT EXISTS idx_monitor_checks_monitor_id ON monitor_checks(monitor_id);
CREATE INDEX IF NOT EXISTS idx_monitor_checks_created_at ON monitor_checks(created_at);
CREATE INDEX IF NOT EXISTS idx_monitor_incidents_monitor_id ON monitor_incidents(monitor_id);
CREATE INDEX IF NOT EXISTS idx_monitor_incidents_status ON monitor_incidents(status);
```

## Setup Instructions

1. **Create Database Tables**:
   - Open your Supabase project dashboard
   - Navigate to SQL Editor
   - Copy and paste the SQL schema above
   - Run the query

2. **Set Up Automated Checks** (Optional):
   You can set up automated monitoring checks in two ways:

   ### Option A: Vercel Cron (Recommended)
   Add to your `vercel.json`:
   ```json
   {
     "crons": [{
       "path": "/api/monitors/check",
       "schedule": "* * * * *"
     }]
   }
   ```

   ### Option B: Supabase Edge Function
   The `check-monitors` Edge Function is already deployed. Set up a cron trigger:
   - Go to Supabase Dashboard → Database → Cron Jobs
   - Create a new cron job that invokes the `check-monitors` function every minute

3. **Start Using Monitors**:
   - Navigate to `/dashboard/monitors`
   - Click "Add Monitor"
   - Configure your first monitor
   - View real-time status and response times

## Features Overview

### Monitor Types

- **HTTP/HTTPS**: Check if a website is responding
- **Ping**: Check if a host is reachable
- **TCP Port**: Check if a specific port is open
- **SSL Certificate**: Verify SSL certificate validity
- **Keyword**: Check if page contains specific text

### Configuration Options

- **Check Interval**: 1-60 minutes
- **Timeout**: 5-120 seconds
- **Expected Status Code**: For HTTP checks
- **Expected Keyword**: For content verification
- **Port**: For TCP checks

### Monitoring Dashboard

Each monitor shows:
- Current status (Up/Down)
- Uptime percentage
- Average response time
- Response time chart (last 50 checks)
- Recent incidents
- Check history

### Public Status Pages

Share monitor status with your team or customers:
- Access at `/status/[monitor-id]`
- Shows uptime percentage
- Displays 30-day uptime history
- Lists recent incidents
- Auto-refreshes every minute

### Alert Integration

Monitors integrate seamlessly with the existing alerts system:
- Alerts created when monitors go down
- Alerts resolved when monitors come back up
- View all monitor alerts in the Alerts dashboard

## Backward Compatibility

This feature is 100% additive:
- No changes to existing server monitoring
- No changes to existing alerts
- No changes to existing groups or dashboards
- No changes to team features
- All existing functionality preserved

## Notes

- Graceful fallbacks if tables don't exist
- All new code works with current schema
- No environment variable changes required
- No database migrations in migration files
- Ready for production use immediately after DB setup
