export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { supabaseServer } from "@/lib/supabase";
import { MetricChart } from "@/components/metric-chart";
import { AlertBadge } from "@/components/alert-badge";
import Link from "next/link";

export default async function ServerDetailPage({ params }) {
  const { id } = params;

  const { data: server } = await supabaseServer
    .from("servers")
    .select("*")
    .eq("id", id)
    .single();

  const { data: metrics } = await supabaseServer
    .from("metrics")
    .select("*")
    .eq("server_id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: alerts } = await supabaseServer
    .from("alerts")
    .select("*")
    .eq("server_id", id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (!server) return <div>Server not found</div>;

  return (
    <div className="p-6 space-y-8">
      <Link href="/dashboard" className="text-blue-400 hover:underline">
        ← Back to Dashboard
      </Link>

      <h1 className="text-3xl font-bold text-white">{server.name}</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricChart title="CPU Usage" data={metrics} metric="cpu" color="#4F46E5" />
        <MetricChart title="Memory Usage" data={metrics} metric="memory" color="#059669" />
        <MetricChart title="Disk Usage" data={metrics} metric="disk" color="#D97706" />
      </div>

      {/* Alerts */}
      <div>
        <h2 className="text-2xl font-semibold text-zinc-300 mb-4">Recent Alerts</h2>
        <div className="space-y-3">
          {alerts?.map((alert) => (
            <AlertBadge key={alert.id} alert={alert} />
          ))}
        </div>
      </div>
    </div>
  );
}


