'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import GridLayout, { Layout } from 'react-grid-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MetricChart } from '@/components/metric-chart';
import { ArrowLeft, Save, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

interface Dashboard {
  id: string;
  name: string;
  description: string | null;
  group_id: string | null;
  layout: any[];
}

interface Server {
  id: string;
  name: string;
}

interface WidgetConfig {
  i: string;
  type: 'server-metrics' | 'group-metrics';
  serverId?: string;
  groupId?: string;
  metric: 'cpu' | 'memory' | 'disk';
  title: string;
}

export default function DashboardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [layout, setLayout] = useState<Layout[]>([]);
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [servers, setServers] = useState<Server[]>([]);
  const [metricsData, setMetricsData] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchDashboard();
      fetchServers();
    }
  }, [params.id]);

  useEffect(() => {
    if (widgets.length > 0) {
      fetchAllMetrics();
    }
  }, [widgets]);

  const fetchDashboard = async () => {
    try {
      const response = await fetch(`/api/dashboards/${params.id}`);
      const data = await response.json();

      if (response.ok) {
        setDashboard(data.data);
        const savedLayout = data.data.layout || [];

        if (savedLayout.length > 0) {
          const widgetConfigs = savedLayout.map((item: any) => item.widget);
          const layoutItems = savedLayout.map((item: any) => ({
            i: item.widget.i,
            x: item.x,
            y: item.y,
            w: item.w,
            h: item.h
          }));

          setWidgets(widgetConfigs);
          setLayout(layoutItems);
        }
      } else {
        toast.error(data.error || 'Failed to fetch dashboard');
        if (data.error?.includes('not yet configured')) {
          setTimeout(() => router.push('/dashboard/dashboards'), 2000);
        }
      }
    } catch (error) {
      toast.error('Failed to fetch dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchServers = async () => {
    try {
      const response = await fetch('/api/servers');
      const data = await response.json();

      if (response.ok) {
        setServers(data.servers || []);
      }
    } catch (error) {
      console.error('Failed to fetch servers:', error);
    }
  };

  const fetchAllMetrics = async () => {
    const newMetricsData: Record<string, any[]> = {};

    for (const widget of widgets) {
      if (widget.type === 'server-metrics' && widget.serverId) {
        try {
          const response = await fetch(
            `/api/metrics/recent?serverId=${widget.serverId}&limit=50`
          );
          const data = await response.json();
          if (response.ok) {
            newMetricsData[widget.i] = data.metrics || [];
          }
        } catch (error) {
          console.error('Failed to fetch metrics:', error);
        }
      }
    }

    setMetricsData(newMetricsData);
  };

  const addWidget = (serverId: string, metric: 'cpu' | 'memory' | 'disk') => {
    const server = servers.find(s => s.id === serverId);
    if (!server) return;

    const widgetId = `widget-${Date.now()}`;
    const newWidget: WidgetConfig = {
      i: widgetId,
      type: 'server-metrics',
      serverId,
      metric,
      title: `${server.name} - ${metric.toUpperCase()}`
    };

    const newLayoutItem: Layout = {
      i: widgetId,
      x: (widgets.length * 4) % 12,
      y: Math.floor(widgets.length / 3) * 4,
      w: 4,
      h: 4
    };

    setWidgets([...widgets, newWidget]);
    setLayout([...layout, newLayoutItem]);
  };

  const removeWidget = (widgetId: string) => {
    setWidgets(widgets.filter(w => w.i !== widgetId));
    setLayout(layout.filter(l => l.i !== widgetId));
    const newMetricsData = { ...metricsData };
    delete newMetricsData[widgetId];
    setMetricsData(newMetricsData);
  };

  const saveDashboard = async () => {
    if (!dashboard) return;

    const dashboardLayout = layout.map(layoutItem => {
      const widget = widgets.find(w => w.i === layoutItem.i);
      return {
        ...layoutItem,
        widget
      };
    });

    try {
      const response = await fetch(`/api/dashboards/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layout: dashboardLayout })
      });

      if (response.ok) {
        toast.success('Dashboard saved successfully');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to save dashboard');
      }
    } catch (error) {
      toast.error('Failed to save dashboard');
    }
  };

  const onLayoutChange = (newLayout: Layout[]) => {
    setLayout(newLayout);
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!dashboard) {
    return (
      <div className="p-6">
        <p>Dashboard not found</p>
        <Link href="/dashboard/dashboards">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboards
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/dashboards">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{dashboard.name}</h1>
            <p className="text-slate-600 mt-1">{dashboard.description || 'Custom dashboard'}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={saveDashboard}>
            <Save className="h-4 w-4 mr-2" />
            Save Layout
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Widgets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {servers.length === 0 ? (
              <p className="text-sm text-slate-600">No servers available</p>
            ) : (
              servers.map(server => (
                <div key={server.id} className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addWidget(server.id, 'cpu')}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {server.name} CPU
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addWidget(server.id, 'memory')}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {server.name} Memory
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addWidget(server.id, 'disk')}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {server.name} Disk
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <div className="min-h-screen">
        {widgets.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-slate-600">Add widgets to get started</p>
            </CardContent>
          </Card>
        ) : (
          <GridLayout
            className="layout"
            layout={layout}
            cols={12}
            rowHeight={60}
            width={1200}
            onLayoutChange={onLayoutChange}
            draggableHandle=".drag-handle"
          >
            {widgets.map(widget => (
              <div key={widget.i} className="bg-white rounded-lg border shadow-sm">
                <div className="flex justify-between items-center p-2 border-b drag-handle cursor-move bg-slate-50">
                  <span className="text-sm font-medium">{widget.title}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeWidget(widget.i)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="p-2 h-full overflow-hidden">
                  {metricsData[widget.i] && metricsData[widget.i].length > 0 ? (
                    <MetricChart
                      title=""
                      data={metricsData[widget.i]}
                      metric={widget.metric}
                      color={
                        widget.metric === 'cpu'
                          ? '#4F46E5'
                          : widget.metric === 'memory'
                          ? '#059669'
                          : '#D97706'
                      }
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-sm text-slate-500">
                      No data available
                    </div>
                  )}
                </div>
              </div>
            ))}
          </GridLayout>
        )}
      </div>
    </div>
  );
}
