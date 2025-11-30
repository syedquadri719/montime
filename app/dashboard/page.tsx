'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, Server, Plus, Bell, AlertCircle } from 'lucide-react';
import { ServerCard } from '@/components/server-card';
import { AlertBadge } from '@/components/alert-badge';
import { AddServerModal } from '@/components/add-server-modal';
import { formatDistanceToNow } from 'date-fns';

interface ServerData {
  id: string;
  name: string;
  token: string;
  status: string;
  last_seen_at: string | null;
  created_at: string;
  latestMetric?: {
    cpu: number;
    memory: number;
    disk: number;
    status: string;
  };
}

interface AlertData {
  id: string;
  type: string;
  message: string;
  severity: string;
  current_value: number | null;
  threshold_value: number | null;
  acknowledged: boolean;
  resolved: boolean;
  created_at: string;
  servers: {
    id: string;
    name: string;
  };
}

export default function DashboardPage() {
  const [servers, setServers] = useState<ServerData[]>([]);
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    loadServers();
    loadAlerts();
    const interval = setInterval(() => {
      loadServers();
      loadAlerts();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadServers = async () => {
    try {
      const response = await fetch('/api/servers');
      if (response.ok) {
        const data = await response.json();
        setServers(data.servers || []);
      }
    } catch (error) {
      console.error('Error loading servers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAlerts = async () => {
    try {
      const response = await fetch('/api/alerts/recent?limit=5');
      if (response.ok) {
        const data = await response.json();
        setAlerts(data.alerts || []);
      }
    } catch (error) {
      console.error('Error loading alerts:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Activity className="h-12 w-12 text-slate-400 animate-pulse mx-auto mb-4" />
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-slate-600 mt-1">Monitor your servers in real-time</p>
        </div>
        <Button onClick={() => setModalOpen(true)} size="lg">
          <Plus className="h-5 w-5 mr-2" />
          Add Server
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Servers
            </CardTitle>
            <Server className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{servers.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Online
            </CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {servers.filter((s) => s.status === 'online').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Warning
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {servers.filter((s) => s.status === 'warning').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Critical
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {servers.filter((s) => s.status === 'critical').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {alerts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-5 w-5 text-slate-700" />
            <h2 className="text-xl font-semibold">Recent Alerts</h2>
          </div>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <Card
                key={alert.id}
                className="border-l-4"
                style={{
                  borderLeftColor: alert.severity === 'critical' ? '#ef4444' : '#f59e0b'
                }}
              >
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertBadge type={alert.type} severity={alert.severity} />
                        <span className="text-sm text-slate-600">
                          {alert.servers?.name || 'Unknown Server'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 mb-1">{alert.message}</p>
                      <p className="text-xs text-slate-500">
                        {formatDistanceToNow(new Date(alert.created_at), {
                          addSuffix: true
                        })}
                      </p>
                    </div>
                    {alert.severity === 'critical' && (
                      <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 ml-4" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xl font-semibold mb-4">Your Servers</h2>
        {servers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Server className="h-16 w-16 text-slate-300 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No servers yet</h3>
              <p className="text-slate-600 mb-6 text-center max-w-md">
                Get started by adding your first server. Install the monitoring agent and
                start tracking metrics in real-time.
              </p>
              <Button onClick={() => setModalOpen(true)} size="lg">
                <Plus className="h-5 w-5 mr-2" />
                Add Your First Server
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {servers.map((server) => (
              <ServerCard key={server.id} server={server} />
            ))}
          </div>
        )}
      </div>

      <AddServerModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onServerCreated={loadServers}
      />

      <Button
        onClick={() => setModalOpen(true)}
        size="lg"
        className="fixed bottom-8 right-8 h-14 w-14 rounded-full shadow-lg"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}
