import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";
import { Resend } from "npm:resend@4.0.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AlertCondition {
  type: string;
  message: string;
  severity: string;
  currentValue?: number;
  threshold?: number;
}

const DEBOUNCE_WINDOW_MINUTES = 30;

async function shouldTriggerAlert(
  supabase: any,
  serverId: string,
  alertType: string
): Promise<boolean> {
  const debounceTime = new Date(Date.now() - DEBOUNCE_WINDOW_MINUTES * 60 * 1000);

  const { data: recentAlert } = await supabase
    .from('alerts')
    .select('created_at')
    .eq('server_id', serverId)
    .eq('type', alertType)
    .gte('created_at', debounceTime.toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return !recentAlert;
}

function evaluateMetrics(
  cpu: number | null,
  memory: number | null,
  disk: number | null,
  lastSeenAt: string | null,
  settings?: any
): AlertCondition | null {
  const cpuThreshold = settings?.cpu_threshold || 85;
  const memoryThreshold = settings?.memory_threshold || 80;
  const diskThreshold = settings?.disk_threshold || 90;
  const downThreshold = settings?.down_threshold_seconds || 120;

  const now = Date.now();
  const lastSeen = lastSeenAt ? new Date(lastSeenAt).getTime() : 0;
  const secondsSinceLastSeen = (now - lastSeen) / 1000;

  if (secondsSinceLastSeen > downThreshold) {
    return {
      type: 'down',
      message: `Server is not responding. No metrics received in the last ${Math.floor(downThreshold / 60)} minutes.`,
      severity: 'critical'
    };
  }

  if (cpu !== null && cpu > cpuThreshold) {
    return {
      type: 'cpu_high',
      message: `CPU usage is critically high at ${cpu.toFixed(1)}%`,
      severity: cpu > 90 ? 'critical' : 'warning',
      currentValue: cpu,
      threshold: cpuThreshold
    };
  }

  if (memory !== null && memory > memoryThreshold) {
    return {
      type: 'memory_high',
      message: `Memory usage is high at ${memory.toFixed(1)}%`,
      severity: memory > 90 ? 'critical' : 'warning',
      currentValue: memory,
      threshold: memoryThreshold
    };
  }

  if (disk !== null && disk > diskThreshold) {
    return {
      type: 'disk_high',
      message: `Disk usage is critically high at ${disk.toFixed(1)}%`,
      severity: 'critical',
      currentValue: disk,
      threshold: diskThreshold
    };
  }

  return null;
}

async function sendAlertEmail(
  resend: Resend,
  recipients: string[],
  serverName: string,
  alertCondition: AlertCondition
): Promise<void> {
  const emailSender = Deno.env.get('ALERT_EMAIL_FROM') || 'alerts@montime.io';

  const emailSubject = `🚨 Alert: ${alertCondition.type.replace('_', ' ').toUpperCase()} - ${serverName}`;

  let emailBody = `
    <h2>Alert Notification from Montime.io</h2>
    <p><strong>Server:</strong> ${serverName}</p>
    <p><strong>Alert Type:</strong> ${alertCondition.type.replace('_', ' ').toUpperCase()}</p>
    <p><strong>Severity:</strong> ${alertCondition.severity.toUpperCase()}</p>
    <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
    <hr>
    <p><strong>Message:</strong> ${alertCondition.message}</p>
  `;

  if (alertCondition.currentValue !== undefined) {
    emailBody += `<p><strong>Current Value:</strong> ${alertCondition.currentValue.toFixed(1)}%</p>`;
  }

  if (alertCondition.threshold !== undefined) {
    emailBody += `<p><strong>Threshold:</strong> ${alertCondition.threshold}%</p>`;
  }

  emailBody += `
    <hr>
    <p>View your dashboard: <a href=\"https://montime.io/dashboard\">https://montime.io/dashboard</a></p>
    <p style=\"color: #666; font-size: 12px;\">This is an automated alert from Montime.io</p>
  `;

  for (const email of recipients) {
    try {
      await resend.emails.send({
        from: emailSender,
        to: email,
        subject: emailSubject,
        html: emailBody
      });
      console.log(`✓ Email sent to ${email} for ${serverName}`);
    } catch (error) {
      console.error(`✗ Failed to send email to ${email}:`, error);
    }
  }
}

async function sendSlackNotification(
  webhookUrl: string,
  serverName: string,
  alertCondition: AlertCondition
): Promise<void> {
  const color = alertCondition.severity === 'critical' ? 'danger' : 'warning';
  const emoji = alertCondition.severity === 'critical' ? ':rotating_light:' : ':warning:';

  const payload = {
    attachments: [
      {
        color,
        title: `${emoji} ${alertCondition.severity.toUpperCase()}: ${serverName}`,
        text: alertCondition.message,
        fields: [
          {
            title: 'Server',
            value: serverName,
            short: true
          },
          {
            title: 'Alert Type',
            value: alertCondition.type.replace('_', ' ').toUpperCase(),
            short: true
          },
          ...(alertCondition.currentValue ? [{
            title: 'Current Value',
            value: `${alertCondition.currentValue.toFixed(1)}%`,
            short: true
          }] : []),
          ...(alertCondition.threshold ? [{
            title: 'Threshold',
            value: `${alertCondition.threshold}%`,
            short: true
          }] : [])
        ],
        footer: 'MonTime Alert',
        ts: Math.floor(Date.now() / 1000)
      }
    ]
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log(`✓ Slack notification sent for ${serverName}`);
    } else {
      console.error(`✗ Slack notification failed: ${response.statusText}`);
    }
  } catch (error) {
    console.error(`✗ Failed to send Slack notification:`, error);
  }
}

async function sendWebhookNotification(
  webhookUrl: string,
  headers: Record<string, string>,
  serverName: string,
  serverId: string,
  alertCondition: AlertCondition
): Promise<void> {
  const payload = {
    alert_id: `generated-${Date.now()}`,
    server_id: serverId,
    server_name: serverName,
    type: alertCondition.type,
    severity: alertCondition.severity,
    message: alertCondition.message,
    current_value: alertCondition.currentValue,
    threshold_value: alertCondition.threshold,
    timestamp: new Date().toISOString()
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log(`✓ Webhook notification sent for ${serverName}`);
    } else {
      console.error(`✗ Webhook notification failed: ${response.statusText}`);
    }
  } catch (error) {
    console.error(`✗ Failed to send webhook notification:`, error);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    const { data: servers, error: serversError } = await supabase
      .from('servers')
      .select(`
        id,
        name,
        user_id,
        last_seen_at,
        profiles!servers_user_id_fkey (
          email
        )
      `);

    if (serversError) {
      throw serversError;
    }

    let alertsCreated = 0;
    let notificationsSent = 0;

    for (const server of servers || []) {
      const { data: settings } = await supabase
        .from('alert_settings')
        .select('*')
        .eq('server_id', server.id)
        .maybeSingle();

      if (settings && !settings.enabled) {
        continue;
      }

      const lookbackTime = new Date(Date.now() - 2 * 60 * 1000);

      const { data: recentMetrics } = await supabase
        .from('metrics')
        .select('cpu, memory, disk, created_at')
        .eq('server_id', server.id)
        .gte('created_at', lookbackTime.toISOString())
        .order('created_at', { ascending: false });

      if (!recentMetrics || recentMetrics.length === 0) {
        continue;
      }

      const maxCpu = Math.max(...recentMetrics.map(m => m.cpu || 0));
      const maxMemory = Math.max(...recentMetrics.map(m => m.memory || 0));
      const maxDisk = Math.max(...recentMetrics.map(m => m.disk || 0));

      const alertCondition = evaluateMetrics(
        maxCpu > 0 ? maxCpu : null,
        maxMemory > 0 ? maxMemory : null,
        maxDisk > 0 ? maxDisk : null,
        server.last_seen_at,
        settings
      );

      if (alertCondition) {
        const shouldTrigger = await shouldTriggerAlert(
          supabase,
          server.id,
          alertCondition.type
        );

        if (shouldTrigger) {
          const alertData: any = {
            server_id: server.id,
            user_id: server.user_id,
            type: alertCondition.type,
            message: alertCondition.message,
            severity: alertCondition.severity,
            acknowledged: false,
            resolved: false
          };

          if (alertCondition.currentValue !== undefined) {
            alertData.current_value = alertCondition.currentValue;
          }

          if (alertCondition.threshold !== undefined) {
            alertData.threshold_value = alertCondition.threshold;
          }

          const { error: insertError } = await supabase
            .from('alerts')
            .insert(alertData);

          if (!insertError) {
            alertsCreated++;
            console.log(`✓ Alert created: ${alertCondition.type} for ${server.name}`);

            const channels = settings?.notification_channels || ['email'];

            if (channels.includes('email')) {
              const recipients = settings?.email_recipients || (server.profiles?.email ? [server.profiles.email] : []);
              if (recipients.length > 0 && resend) {
                await sendAlertEmail(resend, recipients, server.name, alertCondition);
                notificationsSent++;
              }
            }

            if (channels.includes('slack') && settings?.slack_webhook_url) {
              await sendSlackNotification(settings.slack_webhook_url, server.name, alertCondition);
              notificationsSent++;
            }

            if (channels.includes('webhook') && settings?.webhook_url) {
              await sendWebhookNotification(
                settings.webhook_url,
                settings.webhook_headers || {},
                server.name,
                server.id,
                alertCondition
              );
              notificationsSent++;
            }
          } else {
            console.error(`✗ Failed to create alert for ${server.name}:`, insertError);
          }
        }
      }
    }

    const result = {
      success: true,
      serversEvaluated: servers?.length || 0,
      alertsCreated,
      notificationsSent,
      timestamp: new Date().toISOString()
    };

    console.log('Alert evaluation complete:', result);

    return new Response(
      JSON.stringify(result),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        }
      }
    );
  } catch (error) {
    console.error('Error evaluating alerts:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        }
      }
    );
  }
});