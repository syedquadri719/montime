import { getCurrentUserServer } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUserServer();
  if (!user) return <p className="p-6">Not authenticated</p>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      <div className="bg-white border rounded-lg p-6 space-y-4">
        <div>
          <h2 className="text-xl font-semibold mb-4">Account Information</h2>
          <div className="space-y-2">
            <p className="text-sm text-slate-600">
              <span className="font-medium">Email:</span> {user.email}
            </p>
            <p className="text-sm text-slate-600">
              <span className="font-medium">User ID:</span> {user.id}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Notification Settings</h2>
        <p className="text-sm text-slate-500">Notification settings coming soon...</p>
      </div>
    </div>
  );
}
