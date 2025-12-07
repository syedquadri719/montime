# Evaluate Alerts Edge Function

This Supabase Edge Function evaluates server metrics and creates alerts when thresholds are exceeded.

## Features

- Runs every minute via Supabase Cron
- Evaluates all servers for alert conditions
- Implements 30-minute debounce to prevent alert spam
- Sends email notifications via Resend
- Supports multiple alert types: down, cpu_high, memory_high, disk_high

## Alert Conditions

| Alert Type | Condition | Severity |
|------------|-----------|----------|
| `down` | No metrics received in last 120 seconds | Critical |
| `cpu_high` | CPU usage > 85% | Critical |
| `memory_high` | Memory usage > 80% | Warning |
| `disk_high` | Disk usage > 90% | Critical |

## Setup

### 1. Deploy the Function

The function has already been deployed to your Supabase project.

### 2. Set Environment Variables

Configure the following secrets in your Supabase dashboard:

```bash
# Required - Already configured automatically
SUPABASE_URL=your-project-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional - For email notifications
RESEND_API_KEY=your-resend-api-key
ALERT_EMAIL_FROM=alerts@montime.io  # Default if not set
```

To add the Resend API key:

1. Sign up at [resend.com](https://resend.com)
2. Get your API key
3. Add it to Supabase:
   - Go to Project Settings > Edge Functions > Environment Variables
   - Add `RESEND_API_KEY` with your key

### 3. Set Up Cron Job

Create a cron schedule in Supabase to run this function every minute:

**Using Supabase Dashboard:**

1. Go to your Supabase project
2. Navigate to Database > Extensions
3. Enable `pg_cron` extension if not already enabled
4. Go to SQL Editor and run:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a cron job to run every minute
SELECT cron.schedule(
  'evaluate-alerts-every-minute',
  '* * * * *',  -- Every minute
  $$
  SELECT
    net.http_post(
      url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/evaluate-alerts',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
      body:='{}'::jsonb
    ) AS request_id;
  $$
);
```

Replace:
- `YOUR_PROJECT_REF` with your Supabase project reference (e.g., `sxyuivpzhsrgjzhznbj`)
- `YOUR_ANON_KEY` with your anon/public API key

**Alternative: Using Supabase CLI:**

```bash
supabase functions schedule evaluate-alerts "* * * * *"
```

### 4. Verify Cron Job

Check if the cron job is running:

```sql
SELECT * FROM cron.job;
```

View cron job execution history:

```sql
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
```

## Manual Testing

You can manually trigger the function to test:

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/evaluate-alerts \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

Expected response:

```json
{
  "success": true,
  "serversEvaluated": 5,
  "alertsCreated": 2,
  "emailsSent": 2,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Email Notifications

When alerts are triggered, users receive emails with:

- Alert type and severity
- Server name
- Current metric values
- Threshold values
- Timestamp
- Link to dashboard

**Email Configuration:**

The function uses Resend for email delivery. Configure:

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx
ALERT_EMAIL_FROM=alerts@montime.io  # Must be verified in Resend
```

If `RESEND_API_KEY` is not set, alerts will be created but no emails will be sent.

## Debounce Logic

To prevent alert spam, the function implements a 30-minute debounce window:

- Same alert type for the same server
- Won't trigger again within 30 minutes
- Each alert type is tracked independently

Example: If CPU alert triggers at 10:00, another CPU alert for that server won't trigger until 10:30.

## Monitoring

View function logs:

```bash
# Supabase CLI
supabase functions logs evaluate-alerts

# Or in Supabase Dashboard
# Go to Edge Functions > evaluate-alerts > Logs
```

Check alert creation:

```sql
SELECT
  alerts.*,
  servers.name as server_name,
  profiles.email as user_email
FROM alerts
JOIN servers ON alerts.server_id = servers.id
JOIN profiles ON alerts.user_id = profiles.id
ORDER BY alerts.created_at DESC
LIMIT 20;
```

## Troubleshooting

### Cron job not running

1. Check if pg_cron extension is enabled:
```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

2. Verify cron job exists:
```sql
SELECT * FROM cron.job WHERE jobname = 'evaluate-alerts-every-minute';
```

3. Check for errors:
```sql
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'evaluate-alerts-every-minute')
ORDER BY start_time DESC;
```

### Emails not sending

1. Verify `RESEND_API_KEY` is set in environment variables
2. Check Resend dashboard for delivery status
3. Ensure sender email is verified in Resend
4. Check function logs for email errors

### Alerts not creating

1. Check RLS policies on alerts table
2. Verify server metrics are being ingested
3. Check function logs for errors
4. Ensure thresholds are being exceeded

## Performance

- Evaluates all servers in parallel
- Typical execution time: 100-500ms for 10 servers
- Memory usage: ~50MB
- Edge function timeout: 10 seconds

## Development

To modify alert thresholds, edit the `evaluateMetrics` function:

```typescript
if (cpu !== null && cpu > 85) {  // Change threshold here
  return {
    type: 'cpu_high',
    message: `CPU usage is critically high at ${cpu.toFixed(1)}%`,
    severity: 'critical',
    currentValue: cpu,
    threshold: 85  // Update this too
  };
}
```

After changes, redeploy:

```bash
supabase functions deploy evaluate-alerts
```
