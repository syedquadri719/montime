'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MonitorChart } from '@/components/monitor-chart';
import { MonitorForm } from '@/components/monitor-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ArrowLeft, Edit2, Trash2, PlayCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';

export default function MonitorDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [monitor, setMonitor] = useState<any>(null);
  const [checks, setChecks] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isCheckRunning, setIsCheckRunning] = useState(false);

  const fetchMonitorData = async () => {
    try {
      const [monitorRes, checksRes, incidentsRes] = await Promise.all([
        fetch(`/api/monitors/${params.id}`),
        fetch(`/api/monitors/${params.id}/checks?limit=50`),
        fetch(`/api/monitors/${params.id}/incidents?limit=20`)
      ]);

      const monitorData = await monitorRes.json();
      const checksData = await checksRes.json();
      const incidentsData = await incidentsRes.json();

      if (monitorRes.ok && monitorData.monitor) {
        setMonitor(monitorData.monitor);
      } else {
        toast.error('Monitor not found');
        router.push('/dashboard/monitors');
        return;
      }

      setChecks(checksData.checks || []);
      setIncidents(incidentsData.incidents || []);
    } catch (error) {
      toast.error('Failed to load monitor data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitorData();
    const interval = setInterval(fetchMonitorData, 30000);
    return () => clearInterval(interval);
  }, [params.id]);

  const handleRunCheck = async () => {
    setIsCheckRunning(true);
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      const response = await fetch('/api/monitors/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({ monitorId: params.id })
      });

      if (response.ok) {
        toast.success('Check completed');
        fetchMonitorData();
      } else {
        toast.error('Check failed');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsCheckRunning(false);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/monitors/${params.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Monitor deleted');
        router.push('/dashboard/monitors');
      } else {
        toast.error('Failed to delete monitor');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-slate-500">Loading monitor...</p>
        </div>
      </div>
    );
  }

  if (!monitor) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'up':
        return 'bg-green-500';
      case 'down':
        return 'bg-red-500';
      default:
        return 'bg-slate-400';
    }
  };

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'up':
        return 'default';
      case 'down':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const successfulChecks = checks.filter(c => c.success).length;
  const uptimePercentage = checks.length > 0 ? ((successfulChecks / checks.length) * 100).toFixed(2) : '0.00';
  const avgResponseTime = checks.length > 0
    ? Math.round(checks.reduce((sum, c) => sum + c.response_time, 0) / checks.length)
    : 0;

  return (
    <div className="p-6 space-y-6">
      <Link href="/dashboard/monitors" className="text-blue-600 hover:underline inline-flex items-center gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Monitors
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{monitor.name}</h1>
          <p className="text-slate-600 mt-1">{monitor.url}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={getStatusVariant(monitor.status)}>
            <div className="flex items-center gap-1.5">
              <div className={`h-2 w-2 rounded-full ${getStatusColor(monitor.status)}`} />
              {monitor.status.toUpperCase()}
            </div>
          </Badge>
          <Button variant="outline" size="sm" onClick={handleRunCheck} disabled={isCheckRunning}>
            {isCheckRunning ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4 mr-2" />
                Run Check
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)}>
            <Edit2 className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setIsDeleteOpen(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-600">Uptime</p>
            <p className="text-3xl font-bold mt-2">{uptimePercentage}%</p>
            <p className="text-xs text-slate-500 mt-1">Last {checks.length} checks</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-600">Avg Response Time</p>
            <p className="text-3xl font-bold mt-2">{avgResponseTime}ms</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-600">Check Interval</p>
            <p className="text-3xl font-bold mt-2">{monitor.interval}m</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-600">Last Check</p>
            <p className="text-lg font-bold mt-2">
              {monitor.last_checked_at
                ? formatDistanceToNow(new Date(monitor.last_checked_at), { addSuffix: true })
                : 'Never'}
            </p>
          </CardContent>
        </Card>
      </div>

      {checks.length > 0 && (
        <MonitorChart
          title="Response Time (Last 50 Checks)"
          data={checks.slice(0, 50).reverse()}
          color="#3b82f6"
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Incidents</CardTitle>
        </CardHeader>
        <CardContent>
          {incidents.length === 0 ? (
            <p className="text-slate-500 text-sm py-4">No incidents recorded</p>
          ) : (
            <div className="space-y-3">
              {incidents.map((incident) => (
                <div
                  key={incident.id}
                  className="flex items-start justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={`h-5 w-5 mt-0.5 ${incident.status === 'open' ? 'text-red-500' : 'text-slate-400'}`} />
                    <div>
                      <p className="font-medium">{incident.message || 'Downtime detected'}</p>
                      <p className="text-sm text-slate-600 mt-1">
                        Started: {format(new Date(incident.started_at), 'PPpp')}
                      </p>
                      {incident.resolved_at && (
                        <p className="text-sm text-slate-600">
                          Resolved: {format(new Date(incident.resolved_at), 'PPpp')}
                        </p>
                      )}
                      {incident.duration && (
                        <p className="text-sm text-slate-600">
                          Duration: {Math.floor(incident.duration / 60)}m {incident.duration % 60}s
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant={incident.status === 'open' ? 'destructive' : 'outline'}>
                    {incident.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Check History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {checks.slice(0, 10).map((check) => (
              <div
                key={check.id}
                className="flex items-center justify-between p-3 border rounded text-sm"
              >
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${check.success ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-slate-600">
                    {format(new Date(check.created_at), 'PPpp')}
                  </span>
                  <span className="text-slate-500">{check.message}</span>
                </div>
                <span className="font-medium">{check.response_time}ms</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Monitor</DialogTitle>
          </DialogHeader>
          <MonitorForm
            monitor={monitor}
            onSuccess={() => {
              setIsEditOpen(false);
              fetchMonitorData();
            }}
            onCancel={() => setIsEditOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Monitor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this monitor? This will also delete all check history and incidents. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
