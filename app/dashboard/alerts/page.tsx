import { getCurrentUserServer } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { AlertBadge } from "@/components/alert-badge";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const user = await getCurrentUserServer();
  if (!user) return <p className="p-6">Not authenticated</p>;

  const supabaseAdmin = getSupabaseAdmin();

  const { data: alerts } = await supabaseAdmin
    .from("alerts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Alerts</h1>

      <div className="space-y-3">
        {alerts?.map((alert) => (
          <div
            key={alert.id}
            className="flex items-center justify-between p-4 bg-white border rounded-lg"
          >
            <AlertBadge alert={alert} />
            <p className="text-sm text-slate-600 flex-1 ml-4">
              {alert.message}
            </p>
            <span className="text-xs text-slate-400">
              {new Date(alert.created_at).toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      {!alerts?.length && (
        <div className="text-center py-12">
          <p className="text-slate-500">No alerts to display</p>
        </div>
      )}
    </div>
  );
}
