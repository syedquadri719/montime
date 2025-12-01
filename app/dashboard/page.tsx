import { getCurrentUserServer } from "@/lib/auth-server";
import { ServerCard } from "@/components/server-card";
import { AlertBadge } from "@/components/alert-badge";
import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase-server";
const supabaseAdmin = getSupabaseAdmin();

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function DashboardPage() {
  const user = await getCurrentUserServer();
  if (!user) return <p className="p-6">Not authenticated</p>;

  // Fetch servers owned by this user
  const { data: servers } = await supabaseAdmin
    .from("servers")
    .select("*")
    .eq("user_id", user.id);

  // Fetch alerts (latest 10)
  const { data: alerts } = await supabaseAdmin
    .from("alerts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  // Fetch last metric for each server
  const serverMetrics = await Promise.all(
    (servers ?? []).map(async (srv) => {
      const { data: metric } = await supabaseAdmin
        .from("metrics")
        .select("*")
        .eq("server_id", srv.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      return {
        ...srv,
        latestMetric: metric ?? null,
      };
    })
  );

  return (
    <div className="p-6 space-y-10">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard</h1>

        <Link
          href="/dashboard/add-server"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Add Server
        </Link>
      </div>

      {/* Alerts Section */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Recent Alerts</h2>
        <div className="space-y-3">
          {alerts?.length ? (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <AlertBadge alert={alert} />
                <p className="text-sm text-slate-600 flex-1 ml-3">
                  {alert.message}
                </p>
                <span className="text-xs text-slate-400">
                  {new Date(alert.created_at).toLocaleString()}
                </span>
              </div>
            ))
          ) : (
            <p className="text-slate-500 text-sm">No recent alerts</p>
          )}
        </div>
      </section>

      {/* Servers Section */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Your Servers</h2>
        {serverMetrics?.length ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {serverMetrics.map((srv) => (
              <ServerCard key={srv.id} server={srv} />
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-sm">
            You haven’t added any servers yet.
          </p>
        )}
      </section>
    </div>
  );
}