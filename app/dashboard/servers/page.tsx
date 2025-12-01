import { getCurrentUserServer } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ServersPage() {
  const user = await getCurrentUserServer();
  if (!user) return <p className="p-6">Not authenticated</p>;

  const supabaseAdmin = getSupabaseAdmin();

  const { data: servers } = await supabaseAdmin
    .from("servers")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Servers</h1>
        <Link
          href="/dashboard/add-server"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Add Server
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {servers?.map((server) => (
          <Link
            key={server.id}
            href={`/dashboard/server/${server.id}`}
            className="block p-6 bg-white border rounded-lg hover:shadow-lg transition-shadow"
          >
            <h3 className="text-xl font-semibold mb-2">{server.name}</h3>
            <div className="space-y-2 text-sm text-slate-600">
              <p>Hostname: {server.hostname}</p>
              <p>Status: <span className={server.status === 'online' ? 'text-green-600' : 'text-red-600'}>{server.status}</span></p>
              {server.last_seen_at && (
                <p>Last Seen: {new Date(server.last_seen_at).toLocaleString()}</p>
              )}
            </div>
          </Link>
        ))}
      </div>

      {!servers?.length && (
        <div className="text-center py-12">
          <p className="text-slate-500 mb-4">No servers added yet</p>
          <Link
            href="/dashboard/add-server"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add Your First Server
          </Link>
        </div>
      )}
    </div>
  );
}
