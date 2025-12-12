'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function PublicStatusPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/monitors/${params.id}/public`);
        const result = await response.json();

        if (response.ok) {
          setData(result);
        }
      } catch (error) {
        console.error('Failed to load status page');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Loading status...</p>
      </div>
    );
  }

  if (!data || !data.monitor) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Monitor Not Found</h1>
          <p className="text-slate-600 mt-2">This status page does not exist or is not available.</p>
        </div>
      </div>
    );
  }

  const { monitor, stats, incidents, checks } = data;

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

  const getStatusVariant = (status: string): 'default' | 'destructive' | 'outline' => {
    switch (status) {
      case 'up':
        return 'default';
      case 'down':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return date;
  });

  const uptimeByDay = last30Days.map(day => {
    const dayStart = new Date(day.setHours(0, 0, 0, 0)).getTime();
    const dayEnd = new Date(day.setHours(23, 59, 59, 999)).getTime();

    const dayChecks = checks.filter((check: any) => {
      const checkTime = new Date(check.created_at).getTime();
      return checkTime >= dayStart && checkTime <= dayEnd;
    });

    const successCount = dayChecks.filter((c: any) => c.success).length;
    const percentage = dayChecks.length > 0 ? (successCount / dayChecks.length) * 100 : 100;

    return {
      date: day,
      uptime: percentage
    };
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="text-center py-8">
          <h1 className="text-4xl font-bold text-slate-900">{monitor.name}</h1>
          <p className="text-slate-600 mt-2">{monitor.url}</p>
          <div className="flex items-center justify-center gap-4 mt-4">
            <Badge variant={getStatusVariant(monitor.status)} className="text-base px-4 py-2">
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${getStatusColor(monitor.status)}`} />
                {monitor.status === 'up' ? 'All Systems Operational' : 'System Down'}
              </div>
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Uptime</p>
                  <p className="text-3xl font-bold mt-2">{stats.uptimePercentage}%</p>
                  <p className="text-xs text-slate-500 mt-1">Last {stats.totalChecks} checks</p>
                </div>
                <Activity className="h-12 w-12 text-green-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Response Time</p>
                  <p className="text-3xl font-bold mt-2">{monitor.last_response_time || 0}ms</p>
                  <p className="text-xs text-slate-500 mt-1">Latest check</p>
                </div>
                <Clock className="h-12 w-12 text-blue-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Last Checked</p>
                  <p className="text-lg font-bold mt-2">
                    {monitor.last_checked_at
                      ? format(new Date(monitor.last_checked_at), 'HH:mm:ss')
                      : 'Never'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {monitor.last_checked_at
                      ? format(new Date(monitor.last_checked_at), 'MMM d, yyyy')
                      : ''}
                  </p>
                </div>
                <Clock className="h-12 w-12 text-slate-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>30-Day Uptime History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-1">
              {uptimeByDay.map((day, index) => (
                <div
                  key={index}
                  className="flex-1 h-12 rounded transition-colors cursor-pointer hover:opacity-80"
                  style={{
                    backgroundColor:
                      day.uptime >= 100
                        ? '#22c55e'
                        : day.uptime >= 95
                        ? '#84cc16'
                        : day.uptime >= 80
                        ? '#eab308'
                        : '#ef4444'
                  }}
                  title={`${format(day.date, 'MMM d')}: ${day.uptime.toFixed(1)}% uptime`}
                />
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-slate-500">
              <span>30 days ago</span>
              <span>Today</span>
            </div>
          </CardContent>
        </Card>

        {incidents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Incidents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {incidents.map((incident: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-4 border rounded-lg"
                  >
                    {incident.status === 'open' ? (
                      <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{incident.message || 'Downtime'}</p>
                      <p className="text-sm text-slate-600 mt-1">
                        Started: {format(new Date(incident.started_at), 'PPpp')}
                      </p>
                      {incident.resolved_at && (
                        <>
                          <p className="text-sm text-slate-600">
                            Resolved: {format(new Date(incident.resolved_at), 'PPpp')}
                          </p>
                          {incident.duration && (
                            <p className="text-sm text-slate-600">
                              Duration: {Math.floor(incident.duration / 60)}m {incident.duration % 60}s
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    <Badge variant={incident.status === 'open' ? 'destructive' : 'outline'}>
                      {incident.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center text-sm text-slate-500 py-4">
          <p>Powered by MonTime</p>
          <p className="mt-1">Updated automatically every minute</p>
        </div>
      </div>
    </div>
  );
}
