export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { getSupabaseAdmin } from "@/lib/supabase-server";
import { MetricChart } from "@/components/metric-chart";
import { AlertBadge } from "@/components/alert-badge";
import { TokenDisplay } from "@/components/token-display";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default async function ServerDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;

  const supabase = getSupabaseAdmin();

  const { data: serverData } = await supabase
    .from("servers")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!serverData) return <div>Server not found</div>;

  const server = serverData as {
    id: string;
    name: string;
    hostname: string;
    status: string;
    last_seen_at: string | null;
    created_at: string;
    user_id: string;
    api_key: string;
  };

  const { data: metrics } = await supabase
    .from("metrics")
    .select("*")
    .eq("server_id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  const metricList = (metrics || []) as Array<{
    id: string;
    server_id: string;
    timestamp: string;
    cpu_usage: number | null;
    memory_usage: number | null;
    disk_usage: number | null;
    created_at: string;
  }>;

  const { data: alerts } = await supabase
    .from("alerts")
    .select("id, server_id, user_id, type, severity, message, created_at")
    .eq("server_id", id)
    .order("created_at", { ascending: false })
    .limit(10);

  const alertList = (alerts || []) as Array<{
    id: string;
    server_id: string;
    user_id: string;
    type: string;
    severity: string;
    message: string;
    created_at: string;
  }>;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'critical':
        return 'bg-red-500';
      default:
        return 'bg-slate-400';
    }
  };

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'online':
        return 'default';
      case 'warning':
        return 'secondary';
      case 'critical':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="p-6 space-y-8">
      <Link href="/dashboard" className="text-blue-600 hover:underline inline-block">
        ← Back to Dashboard
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{server.name}</h1>
          <p className="text-slate-600 mt-1">{server.hostname}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={getStatusVariant(server.status)}>
            <div className="flex items-center gap-1.5">
              <div className={`h-2 w-2 rounded-full ${getStatusColor(server.status)}`} />
              {server.status}
            </div>
          </Badge>
          <TokenDisplay token={server.api_key} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricChart title="CPU Usage" data={metricList} metric="cpu" color="#4F46E5" />
        <MetricChart title="Memory Usage" data={metricList} metric="memory" color="#059669" />
        <MetricChart title="Disk Usage" data={metricList} metric="disk" color="#D97706" />
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">Recent Alerts</h2>
        <div className="space-y-3">
          {alertList.length > 0 ? (
            alertList.map((alert) => (
              <AlertBadge key={alert.id} alert={alert} />
            ))
          ) : (
            <p className="text-slate-500 text-sm">No alerts for this server</p>
          )}
        </div>
      </div>
    </div>
  );
}