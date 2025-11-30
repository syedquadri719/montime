export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { getCurrentUser } from "@/lib/auth";
import ServerCard from "@/components/server-card";
import AlertBadge from "@/components/alert-badge";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return <div>Please login</div>;

  const { data: servers } = await supabaseServer
    .from("servers")
    .select("id, name, last_seen, status");

  const { data: alerts } = await supabaseServer
    .from("alerts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>

        <button
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow"
          onClick={() => window.addEventListener("open-add-server", () => {})}
        >
          + Add Server
        </button>
      </div>

      {/* Recent Alerts */}
      <div>
        <h2 className="text-xl text-zinc-300 mb-4">Recent Alerts</h2>
        <div className="space-y-3">
          {alerts?.map((alert) => (
            <AlertBadge key={alert.id} alert={alert} />
          ))}
        </div>
      </div>

      {/* Servers Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {servers?.map((server) => (
          <ServerCard key={server.id} server={server} />
        ))}
      </div>
    </div>
  );
}
