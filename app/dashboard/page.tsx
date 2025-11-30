export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { getCurrentUser } from "@/lib/auth";
import { ServerCard } from "@/components/server-card";
import { AlertBadge } from "@/components/alert-badge";
import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return <div>Please login</div>;

  const supabase = getSupabaseAdmin();

  const { data: servers } = await supabase
    .from("servers")
    .select("id, name, status, last_seen_at")
    .eq("user_id", user.id);

  const serverList = (servers || []) as Array<{
    id: string;
    name: string;
    status: string;
    last_seen_at: string | null;
  }>;

  const { data: alerts } = await supabase
    .from("alerts")
    .select("id, server_id, user_id, alert_type, severity, message, created_at")
    .eq("user_id", user.id)
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
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>

        <button
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow"
          onClick={() => window.dispatchEvent(new Event("open-add-server"))}
        >
          + Add Server
        </button>
      </div>

      {/* Recent Alerts */}
      <div>
        <h2 className="text-xl text-zinc-300 mb-4">Recent Alerts</h2>
        <div className="space-y-3">
          {alertList.map((alert) => (
            <AlertBadge key={alert.id} alert={alert} />
          ))}
        </div>
      </div>

      {/* Servers Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {serverList.map((server) => (
          <ServerCard key={server.id} server={server} />
        ))}
      </div>
    </div>
  );
}
