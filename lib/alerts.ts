import { getSupabaseAdmin } from './supabase';

export type AlertType = 'down' | 'cpu_high' | 'memory_high' | 'disk_high';

export interface AlertCondition {
  type: AlertType;
  message: string;
  severity: 'warning' | 'critical';
  currentValue?: number;
  threshold?: number;
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
  const supabaseAdmin = getSupabaseAdmin();

  const { data: alerts, error } = await supabaseAdmin
    .from('alerts')
    .select(`
      id,
      type,
      message,
      severity,
      current_value,
      threshold_value,
      acknowledged,
      resolved,
      created_at,
      servers (
        id,
        name
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return alerts;
}
