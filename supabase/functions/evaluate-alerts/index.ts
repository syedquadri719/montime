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
  lastSeenAt: string | null
): AlertCondition | null {
  const now = Date.now();
  const lastSeen = lastSeenAt ? new Date(lastSeenAt).getTime() : 0;
  const secondsSinceLastSeen = (now - lastSeen) / 1000;

  if (secondsSinceLastSeen > 120) {
    return {
      type: 'down',
      message: 'Server is not responding. No metrics received in the last 2 minutes.',
      severity: 'critical'
    };
  }

  if (cpu !== null && cpu > 85) {
    return {
      type: 'cpu_high',
      message: `CPU usage is critically high at ${cpu.toFixed(1)}%`,
      severity: 'critical',
      currentValue: cpu,
      threshold: 85
    };
  }

  if (memory !== null && memory > 80) {
    return {
      type: 'memory_high',
      message: `Memory usage is high at ${memory.toFixed(1)}%`,
      severity: 'warning',
      currentValue: memory,
      threshold: 80
    };
  }

  if (disk !== null && disk > 90) {
    return {
      type: 'disk_high',
      message: `Disk usage is critically high at ${disk.toFixed(1)}%`,
      severity: 'critical',
      currentValue: disk,
      threshold: 90
    };
  }

  return null;
}

async function sendAlertEmail(
  resend: Resend,
  userEmail: string,
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
    <p>View your dashboard: <a href="https://montime.io/dashboard">https://montime.io/dashboard</a></p>
    <p style="color: #666; font-size: 12px;">This is an automated alert from Montime.io</p>
  `;

  try {
    await resend.emails.send({
      from: emailSender,
      to: userEmail,
      subject: emailSubject,
      html: emailBody
    });
    console.log(`✓ Email sent to ${userEmail} for ${serverName}`);
  } catch (error) {
    console.error(`✗ Failed to send email to ${userEmail}:`, error);
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
    let emailsSent = 0;

    for (const server of servers || []) {
      const { data: latestMetric } = await supabase
        .from('metrics')
        .select('cpu_usage, memory_usage, disk_usage, created_at')
        .eq('server_id', server.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const alertCondition = evaluateMetrics(
        latestMetric?.cpu_usage || null,
        latestMetric?.memory_usage || null,
        latestMetric?.disk_usage || null,
        server.last_seen_at
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

            if (resend && server.profiles?.email) {
              await sendAlertEmail(
                resend,
                server.profiles.email,
                server.name,
                alertCondition
              );
              emailsSent++;
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
      emailsSent,
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