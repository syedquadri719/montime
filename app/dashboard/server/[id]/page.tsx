export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { supabaseServer } from "@/lib/supabase";
import { MetricChart } from "@/components/metric-chart";
import { AlertBadge } from "@/components/alert-badge";
import Link from "next/link";

export default async function ServerDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;

  const supabase = supabaseServer;

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
    .select("id, server_id, user_id, alert_type, severity, message, created_at")
    .eq("server_id", id)
    .order("created_at", { ascending: false })
    .limit(10);

  const alertList = (alerts || []) as Array<{
    id: string;
    server_id: string;
    user_id: string;
    alert_type: string;
    severity: string;
    message: string;
    created_at: string;
  }>;

  return (
    <div className="p-6 space-y-8">
      <Link href="/dashboard" className="text-blue-400 hover:underline">
        ← Back to Dashboard
      </Link>

      <h1 className="text-3xl font-bold text-white">{server.name}</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricChart title="CPU Usage" data={metricList} metric="cpu" color="#4F46E5" />
        <MetricChart title="Memory Usage" data={metricList} metric="memory" color="#059669" />
        <MetricChart title="Disk Usage" data={metricList} metric="disk" color="#D97706" />
      </div>

      {/* Alerts */}
      <div>
        <h2 className="text-2xl font-semibold text-zinc-300 mb-4">Recent Alerts</h2>
        <div className="space-y-3">
          {alertList.map((alert) => (
            <AlertBadge key={alert.id} alert={alert} />
          ))}
        </div>
      </div>
    </div>
  );
}