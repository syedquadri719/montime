'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert as AlertUI, AlertDescription } from '@/components/ui/alert';
import {
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Server,
  Clock,
  User,
  Filter,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Alert {
  id: string;
  server_id: string;
  type: string;
  message: string;
  severity: 'warning' | 'critical';
  current_value?: number;
  threshold_value?: number;
  acknowledged: boolean;
  acknowledged_at?: string;
  acknowledged_by?: string;
  resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
  created_at: string;
  servers?: {
    id: string;
    name: string;
  };
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [featureAvailable, setFeatureAvailable] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAlerts();
  }, []);

  useEffect(() => {
    filterAlerts();
  }, [alerts, activeTab, severityFilter]);

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/alerts');
      const data = await response.json();

      if (response.status === 503 || data.message?.includes('not yet configured')) {
        setFeatureAvailable(false);
        setLoading(false);
        return;
      }

      if (response.ok) {
        setAlerts(data.alerts || []);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
      setFeatureAvailable(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterAlerts = () => {
    let filtered = [...alerts];

    if (activeTab === 'active') {
      filtered = filtered.filter(a => !a.resolved);
    } else if (activeTab === 'resolved') {
      filtered = filtered.filter(a => a.resolved);
    }

    if (severityFilter) {
      filtered = filtered.filter(a => a.severity === severityFilter);
    }

    setFilteredAlerts(filtered);
  };

  const refreshAlerts = () => {
    setRefreshing(true);
    fetchAlerts();
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'acknowledge' })
      });

      if (response.ok) {
        toast.success('Alert acknowledged');
        fetchAlerts();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to acknowledge alert');
      }
    } catch (error) {
      toast.error('Failed to acknowledge alert');
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolve' })
      });

      if (response.ok) {
        toast.success('Alert resolved');
        fetchAlerts();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to resolve alert');
      }
    } catch (error) {
      toast.error('Failed to resolve alert');
    }
  };

  const getAlertIcon = (severity: string) => {
    if (severity === 'critical') {
      return <AlertCircle className="h-5 w-5 text-red-600" />;
    }
    return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
  };

  const getAlertTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      down: 'Server Down',
      cpu_high: 'High CPU',
      memory_high: 'High Memory',
      disk_high: 'High Disk',
      custom: 'Custom'
    };
    return labels[type] || type;
  };

  const getSeverityBadge = (severity: string) => {
    if (severity === 'critical') {
      return <Badge className="bg-red-100 text-red-800">Critical</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>;
  };

  if (loading) {
    return <div className="p-6">Loading alerts...</div>;
  }

  if (!featureAvailable) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Alerts & Notifications</h1>
          <p className="text-slate-600 mt-1">Monitor and manage system alerts</p>
        </div>

        <AlertUI>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Alerts feature is not yet available. Database tables need to be created manually.
            Contact your administrator to enable alerts and notifications.
          </AlertDescription>
        </AlertUI>
      </div>
    );
  }

  const activeCount = alerts.filter(a => !a.resolved).length;
  const criticalCount = alerts.filter(a => !a.resolved && a.severity === 'critical').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Alerts & Notifications</h1>
          <p className="text-slate-600 mt-1">Monitor and manage system alerts</p>
        </div>
        <Button onClick={refreshAlerts} disabled={refreshing} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alerts.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Alert History</CardTitle>
              <CardDescription>View and manage all system alerts</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={severityFilter === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSeverityFilter(null)}
              >
                All
              </Button>
              <Button
                variant={severityFilter === 'critical' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSeverityFilter('critical')}
              >
                Critical
              </Button>
              <Button
                variant={severityFilter === 'warning' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSeverityFilter('warning')}
              >
                Warning
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="active">
                Active ({alerts.filter(a => !a.resolved).length})
              </TabsTrigger>
              <TabsTrigger value="resolved">
                Resolved ({alerts.filter(a => a.resolved).length})
              </TabsTrigger>
              <TabsTrigger value="all">
                All ({alerts.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4 mt-4">
              {filteredAlerts.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-slate-500">No alerts to display</p>
                </div>
              ) : (
                filteredAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="border rounded-lg p-4 space-y-3 bg-white hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        {getAlertIcon(alert.severity)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">
                              {getAlertTypeLabel(alert.type)}
                            </span>
                            {getSeverityBadge(alert.severity)}
                            {alert.acknowledged && !alert.resolved && (
                              <Badge variant="outline" className="text-blue-600">
                                Acknowledged
                              </Badge>
                            )}
                            {alert.resolved && (
                              <Badge variant="outline" className="text-green-600">
                                Resolved
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-700 mb-2">
                            {alert.message}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            {alert.servers && (
                              <div className="flex items-center gap-1">
                                <Server className="h-3 w-3" />
                                {alert.servers.name}
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(alert.created_at), 'PPp')}
                            </div>
                            {alert.current_value && alert.threshold_value && (
                              <span>
                                Value: {alert.current_value.toFixed(1)}% (Threshold: {alert.threshold_value}%)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {!alert.resolved && (
                        <div className="flex gap-2">
                          {!alert.acknowledged && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => acknowledgeAlert(alert.id)}
                            >
                              Acknowledge
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={() => resolveAlert(alert.id)}
                          >
                            Resolve
                          </Button>
                        </div>
                      )}
                    </div>
                    {(alert.acknowledged_at || alert.resolved_at) && (
                      <div className="text-xs text-slate-500 pt-2 border-t">
                        {alert.acknowledged_at && (
                          <div>Acknowledged: {format(new Date(alert.acknowledged_at), 'PPp')}</div>
                        )}
                        {alert.resolved_at && (
                          <div>Resolved: {format(new Date(alert.resolved_at), 'PPp')}</div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
