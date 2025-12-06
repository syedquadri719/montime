'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function AddServerPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverToken, setServerToken] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/servers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Server creation failed:', data);
        setError(data.error || 'Failed to add server');
        setLoading(false);
        return;
      }

      setServerToken(data.server.token);
      setLoading(false);
    } catch (err: any) {
      console.error('Error adding server:', err);
      setError(err.message || 'Failed to add server');
      setLoading(false);
    }
  };

  if (serverToken) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-white border rounded-lg p-6 space-y-4">
          <h1 className="text-2xl font-bold text-green-600">Server Added Successfully!</h1>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h2 className="font-semibold mb-2">Server API Token</h2>
            <p className="text-sm text-slate-600 mb-3">
              Save this token securely. You'll need it to configure the monitoring agent on your server.
            </p>
            <code className="block bg-slate-800 text-white p-3 rounded text-sm break-all">
              {serverToken}
            </code>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Next Steps</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-slate-600">
              <li>Copy the API token above</li>
              <li>Install the monitoring agent on your server</li>
              <li>Configure the agent with your API token</li>
              <li>Start monitoring your server metrics</li>
            </ol>
          </div>

          <button
            onClick={() => router.push('/dashboard/servers')}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Servers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Add New Server</h1>

      <div className="bg-white border rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
              Server Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Production Web Server"
            />
            <p className="mt-1 text-xs text-slate-500">
              A friendly name to identify your server
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
            >
              {loading ? 'Adding...' : 'Add Server'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
