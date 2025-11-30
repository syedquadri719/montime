'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  Server,
  Copy,
  Check,
  Trash2,
  Activity,
  Cpu,
  MemoryStick,
  HardDrive,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { MetricChart } from '@/components/metric-chart';
import { AlertBadge } from '@/components/alert-badge';

interface ServerData {
  id: string;
  name: string;
  token: string;
  status: string;
  last_seen_at: string | null;
  created_at: string;
}

interface MetricData {
  id: string;
  cpu: number;
  memory: number;
  disk: number;
  status: string;
  created_at: string;
}

interface AlertData {
  id: string;
  type: string;
  message: string;
  severity: string;
  current_value: number | null;
  threshold_value: number | null;
  created_at: string;
}

export default function ServerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const serverId = params.id as string;

  const [server, setServer] = useState<ServerData | null>(null);
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  useEffect(() => {
    loadServerData();
    const interval = setInterval(loadServerData, 30000);
    return () => clearInterval(interval);
  }, [serverId]);

  const loadServerData = async () => {
    try {
      const [serverRes, metricsRes, alertsRes] = await Promise.all([
        fetch(`/api/servers/${serverId}`),
        fetch(`/api/metrics/recent?serverId=${serverId}&limit=50`),
        fetch(`/api/alerts/recent?limit=10`)
      ]);

      if (serverRes.ok) {
        const serverData = await serverRes.json();
        setServer(serverData.server);
      } else {
        router.push('/dashboard');
        return;
      }

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData.metrics || []);
      }

      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        const serverAlerts = alertsData.alerts.filter(
          (alert: any) => alert.servers?.id === serverId
        );
        setAlerts(serverAlerts.slice(0, 10));
      }
    } catch (error) {
      console.error('Error loading server data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteServer = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/servers/${serverId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error deleting server:', error);
    } finally {
      setDeleting(false);
    }
  };

  const copyToken = () => {
    if (server) {
      navigator.clipboard.writeText(server.token);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'critical':
        return 'bg-red-500';
      default:
        return 'bg-slate-400';
    }
  };

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'online':
        return 'default';
      case 'warning':
        return 'secondary';
      case 'critical':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Activity className="h-12 w-12 text-slate-400 animate-pulse mx-auto mb-4" />
          <p className="text-slate-600">Loading server details...</p>
        </div>
      </div>
    );
  }

  if (!server) {
    return null;
  }

  const latestMetric = metrics[0];

  const cpuData = metrics.map(m => ({
    timestamp: m.created_at,
    value: m.cpu
  })).reverse();

  const memoryData = metrics.map(m => ({
    timestamp: m.created_at,
    value: m.memory
  })).reverse();

  const diskData = metrics.map(m => ({
    timestamp: m.created_at,
    value: m.disk
  })).reverse();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Server
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Server</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {server.name}? This action cannot be
                undone. All metrics and alerts for this server will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteServer}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Server className="h-8 w-8 text-slate-600" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{server.name}</h1>
            <p className="text-slate-600 text-sm mt-1">
              {server.last_seen_at
                ? `Last seen ${formatDistanceToNow(new Date(server.last_seen_at), { addSuffix: true })}`
                : 'Never seen'}
            </p>
          </div>
        </div>
        <Badge variant={getStatusVariant(server.status)}>
          <div className="flex items-center gap-1.5">
            <div className={`h-2 w-2 rounded-full ${getStatusColor(server.status)}`} />
            {server.status}
          </div>
        </Badge>
      </div>

      {latestMetric && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">CPU Usage</CardTitle>
              <Cpu className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{latestMetric.cpu.toFixed(1)}%</div>
              <p className="text-xs text-slate-500 mt-1">Current usage</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Memory Usage</CardTitle>
              <MemoryStick className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{latestMetric.memory.toFixed(1)}%</div>
              <p className="text-xs text-slate-500 mt-1">Current usage</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Disk Usage</CardTitle>
              <HardDrive className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{latestMetric.disk.toFixed(1)}%</div>
              <p className="text-xs text-slate-500 mt-1">Current usage</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-1">
        {cpuData.length > 0 && (
          <MetricChart
            title="CPU Usage"
            data={cpuData}
            color="#3b82f6"
            unit="%"
          />
        )}

        {memoryData.length > 0 && (
          <MetricChart
            title="Memory Usage"
            data={memoryData}
            color="#10b981"
            unit="%"
          />
        )}

        {diskData.length > 0 && (
          <MetricChart
            title="Disk Usage"
            data={diskData}
            color="#f59e0b"
            unit="%"
          />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Server Token</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Authentication Token</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={server.token}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyToken}
                >
                  {copiedToken ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Use this token to configure the monitoring agent on your server.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length > 0 ? (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start justify-between pb-3 border-b last:border-0 last:pb-0"
                  >
                    <div className="flex-1">
                      <AlertBadge type={alert.type} severity={alert.severity} />
                      <p className="text-sm text-slate-700 mt-2">{alert.message}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <p className="text-sm">No alerts for this server</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
