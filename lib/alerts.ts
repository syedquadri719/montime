import { getSupabaseAdmin } from './supabase';
import { getResourceFilter } from './team';

export type AlertType = 'down' | 'cpu_high' | 'memory_high' | 'disk_high' | 'custom';

export type NotificationChannel = 'email' | 'slack' | 'webhook';

export interface AlertCondition {
  type: AlertType;
  message: string;
  severity: 'warning' | 'critical';
  currentValue?: number;
  threshold?: number;
}

export interface Alert {
  id: string;
  server_id: string;
  user_id: string;
  team_id?: string;
  type: AlertType;
  message: string;
  severity: 'warning' | 'critical';
  current_value?: number;
  threshold_value?: number;
  acknowledged: boolean;
  acknowledged_at?: string;
  acknowledged_by?: string;
  resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
  created_at: string;
  servers?: {
    id: string;
    name: string;
  };
}

export interface AlertSettings {
  id: string;
  server_id?: string;
  group_id?: string;
  user_id: string;
  team_id?: string;
  enabled: boolean;
  cpu_threshold?: number;
  memory_threshold?: number;
  disk_threshold?: number;
  down_threshold_seconds?: number;
  notification_channels: NotificationChannel[];
  email_recipients?: string[];
  slack_webhook_url?: string;
  webhook_url?: string;
  webhook_headers?: Record<string, string>;
  created_at: string;
  updated_at: string;
}

const DEBOUNCE_WINDOW_MINUTES = 30;

export async function shouldTriggerAlert(
  serverId: string,
  alertType: AlertType
): Promise<boolean> {
  const supabaseAdmin = getSupabaseAdmin();
  const debounceTime = new Date(Date.now() - DEBOUNCE_WINDOW_MINUTES * 60 * 1000);

  const { data: recentAlert } = await supabaseAdmin
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

export async function recordAlert(
  serverId: string,
  userId: string,
  condition: AlertCondition
): Promise<void> {
  const supabaseAdmin = getSupabaseAdmin();

  const alertData: any = {
    server_id: serverId,
    user_id: userId,
    type: condition.type,
    message: condition.message,
    severity: condition.severity,
    acknowledged: false,
    resolved: false
  };

  if (condition.currentValue !== undefined) {
    alertData.current_value = condition.currentValue;
  }

  if (condition.threshold !== undefined) {
    alertData.threshold_value = condition.threshold;
  }

  await supabaseAdmin.from('alerts').insert(alertData);
}

export function evaluateMetrics(
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

export async function getRecentAlerts(userId: string, limit: number = 10) {
  try {
    const filter = await getResourceFilter(userId);
    const supabaseAdmin = getSupabaseAdmin();

    let query = supabaseAdmin
      .from('alerts')
      .select(`
        id,
        type,
        message,
        severity,
        current_value,
        threshold_value,
        acknowledged,
        acknowledged_at,
        acknowledged_by,
        resolved,
        resolved_at,
        resolved_by,
        created_at,
        servers (
          id,
          name
        )
      `);

    if (filter.useTeam && filter.teamId) {
      query = query.or(`team_id.eq.${filter.teamId},user_id.eq.${userId}`);
    } else {
      query = query.eq('user_id', userId);
    }

    const { data: alerts, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return [];
      }
      throw error;
    }

    return alerts || [];
  } catch (error) {
    console.log('Alerts feature not available (tables not created):', error);
    return [];
  }
}

export async function getAlertSettings(userId: string, serverId?: string, groupId?: string): Promise<AlertSettings | null> {
  try {
    const filter = await getResourceFilter(userId);
    const supabaseAdmin = getSupabaseAdmin();

    let query = supabaseAdmin
      .from('alert_settings')
      .select('*');

    if (serverId) {
      query = query.eq('server_id', serverId);
    } else if (groupId) {
      query = query.eq('group_id', groupId);
    }

    if (filter.useTeam && filter.teamId) {
      query = query.or(`team_id.eq.${filter.teamId},user_id.eq.${userId}`);
    } else {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.log('Alert settings not available (tables not created):', error);
    return null;
  }
}

export async function sendNotification(
  alert: Alert,
  settings: AlertSettings,
  serverName: string
): Promise<void> {
  const channels = settings.notification_channels || [];

  for (const channel of channels) {
    try {
      switch (channel) {
        case 'email':
          await sendEmailNotification(alert, settings, serverName);
          break;
        case 'slack':
          await sendSlackNotification(alert, settings, serverName);
          break;
        case 'webhook':
          await sendWebhookNotification(alert, settings, serverName);
          break;
      }
    } catch (error) {
      console.error(`Failed to send ${channel} notification:`, error);
    }
  }
}

async function sendEmailNotification(
  alert: Alert,
  settings: AlertSettings,
  serverName: string
): Promise<void> {
  if (!settings.email_recipients || settings.email_recipients.length === 0) {
    return;
  }

  console.log(`Would send email notification for alert ${alert.id} to:`, settings.email_recipients);
}

async function sendSlackNotification(
  alert: Alert,
  settings: AlertSettings,
  serverName: string
): Promise<void> {
  if (!settings.slack_webhook_url) {
    return;
  }

  const color = alert.severity === 'critical' ? 'danger' : 'warning';
  const emoji = alert.severity === 'critical' ? ':rotating_light:' : ':warning:';

  const payload = {
    attachments: [
      {
        color,
        title: `${emoji} ${alert.severity.toUpperCase()}: ${serverName}`,
        text: alert.message,
        fields: [
          {
            title: 'Server',
            value: serverName,
            short: true
          },
          {
            title: 'Alert Type',
            value: alert.type.replace('_', ' ').toUpperCase(),
            short: true
          },
          ...(alert.current_value ? [{
            title: 'Current Value',
            value: `${alert.current_value.toFixed(1)}%`,
            short: true
          }] : []),
          ...(alert.threshold_value ? [{
            title: 'Threshold',
            value: `${alert.threshold_value}%`,
            short: true
          }] : [])
        ],
        footer: 'MonTime Alert',
        ts: Math.floor(new Date(alert.created_at).getTime() / 1000)
      }
    ]
  };

  const response = await fetch(settings.slack_webhook_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Slack notification failed: ${response.statusText}`);
  }
}

async function sendWebhookNotification(
  alert: Alert,
  settings: AlertSettings,
  serverName: string
): Promise<void> {
  if (!settings.webhook_url) {
    return;
  }

  const payload = {
    alert_id: alert.id,
    server_id: alert.server_id,
    server_name: serverName,
    type: alert.type,
    severity: alert.severity,
    message: alert.message,
    current_value: alert.current_value,
    threshold_value: alert.threshold_value,
    timestamp: alert.created_at
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(settings.webhook_headers || {})
  };

  const response = await fetch(settings.webhook_url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Webhook notification failed: ${response.statusText}`);
  }
}
