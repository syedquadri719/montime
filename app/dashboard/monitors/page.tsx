'use client';

import { useState, useEffect } from 'react';
import { MonitorCard } from '@/components/monitor-card';
import { MonitorForm } from '@/components/monitor-form';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Activity, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Monitor {
  id: string;
  name: string;
  type: string;
  url: string;
  status: string;
  last_checked_at: string | null;
  last_response_time: number | null;
  enabled: boolean;
  created_at: string;
}

export default function MonitorsPage() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [tableNotConfigured, setTableNotConfigured] = useState(false);

  const fetchMonitors = async () => {
    try {
      const response = await fetch('/api/monitors');
      const data = await response.json();

      if (response.ok) {
        setMonitors(data.monitors || []);
        if (data.message?.includes('not yet configured')) {
          setTableNotConfigured(true);
        }
      } else {
        if (data.error?.includes('not yet configured')) {
          setTableNotConfigured(true);
        } else {
          toast.error('Failed to load monitors');
        }
      }
    } catch (error) {
      toast.error('An error occurred while loading monitors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitors();
  }, []);

  const handleCreateSuccess = () => {
    setIsCreateOpen(false);
    fetchMonitors();
  };

  const uptime = monitors.filter(m => m.status === 'up').length;
  const downtime = monitors.filter(m => m.status === 'down').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">External Monitors</h1>
          <p className="text-slate-600 mt-1">Monitor websites, APIs, and services</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} disabled={tableNotConfigured}>
          <Plus className="h-4 w-4 mr-2" />
          Add Monitor
        </Button>
      </div>

      {tableNotConfigured && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900">Database Tables Not Configured</h3>
                <p className="text-sm text-amber-800 mt-1">
                  The monitors feature requires database tables to be created. Please run the following SQL to set up the required tables:
                </p>
                <pre className="mt-3 p-3 bg-white rounded text-xs overflow-x-auto border border-amber-200">
{`-- Create monitors table
CREATE TABLE IF NOT EXISTS monitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  url TEXT NOT NULL,
  interval INTEGER DEFAULT 5,
  timeout INTEGER DEFAULT 30,
  expected_status INTEGER,
  expected_keyword TEXT,
  port INTEGER,
  enabled BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'unknown',
  last_checked_at TIMESTAMPTZ,
  last_response_time INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create monitor_checks table
CREATE TABLE IF NOT EXISTS monitor_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id UUID NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  success BOOLEAN NOT NULL,
  response_time INTEGER NOT NULL,
  status_code INTEGER,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create monitor_incidents table
CREATE TABLE IF NOT EXISTS monitor_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id UUID NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  started_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  duration INTEGER,
  status TEXT DEFAULT 'open',
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE monitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitor_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitor_incidents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for monitors
CREATE POLICY "Users can view own monitors"
  ON monitors FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own monitors"
  ON monitors FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own monitors"
  ON monitors FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own monitors"
  ON monitors FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for monitor_checks
CREATE POLICY "Users can view checks for own monitors"
  ON monitor_checks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM monitors
      WHERE monitors.id = monitor_checks.monitor_id
      AND monitors.user_id = auth.uid()
    )
  );

-- Service role can insert checks
CREATE POLICY "Service role can insert checks"
  ON monitor_checks FOR INSERT
  TO service_role
  WITH CHECK (true);

-- RLS Policies for monitor_incidents
CREATE POLICY "Users can view own incidents"
  ON monitor_incidents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role can manage incidents
CREATE POLICY "Service role can manage incidents"
  ON monitor_incidents FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_monitors_user_id ON monitors(user_id);
CREATE INDEX IF NOT EXISTS idx_monitor_checks_monitor_id ON monitor_checks(monitor_id);
CREATE INDEX IF NOT EXISTS idx_monitor_checks_created_at ON monitor_checks(created_at);
CREATE INDEX IF NOT EXISTS idx_monitor_incidents_monitor_id ON monitor_incidents(monitor_id);`}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!tableNotConfigured && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Monitors</p>
                    <p className="text-3xl font-bold mt-2">{monitors.length}</p>
                  </div>
                  <Activity className="h-12 w-12 text-blue-500 opacity-20" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Up</p>
                    <p className="text-3xl font-bold mt-2 text-green-600">{uptime}</p>
                  </div>
                  <Activity className="h-12 w-12 text-green-500 opacity-20" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Down</p>
                    <p className="text-3xl font-bold mt-2 text-red-600">{downtime}</p>
                  </div>
                  <Activity className="h-12 w-12 text-red-500 opacity-20" />
                </div>
              </CardContent>
            </Card>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-slate-500">Loading monitors...</p>
            </div>
          ) : monitors.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Activity className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No monitors yet</h3>
                  <p className="text-slate-600 mb-4">
                    Start monitoring your websites, APIs, and services
                  </p>
                  <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Monitor
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {monitors.map((monitor) => (
                <MonitorCard key={monitor.id} monitor={monitor} />
              ))}
            </div>
          )}
        </>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Monitor</DialogTitle>
          </DialogHeader>
          <MonitorForm
            onSuccess={handleCreateSuccess}
            onCancel={() => setIsCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
