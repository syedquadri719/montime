'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Server, Cpu, HardDrive, MemoryStick } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface ServerCardProps {
  server: {
    id: string;
    name: string;
    status: string;
    last_seen_at: string | null;
    latestMetric?: {
      cpu: number;
      memory: number;
      disk: number;
      status: string;
    };
  };
}

export function ServerCard({ server }: ServerCardProps) {
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

  const getMetricColor = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return 'text-red-600';
    if (value >= thresholds.warning) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <Link href={`/dashboard/server/${server.id}`} className="block">
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-slate-600" />
              <CardTitle className="text-lg">{server.name}</CardTitle>
            </div>
            <Badge variant={getStatusVariant(server.status)}>
              <div className="flex items-center gap-1.5">
                <div className={`h-2 w-2 rounded-full ${getStatusColor(server.status)}`} />
                {server.status}
              </div>
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {server.last_seen_at
              ? `Last seen ${formatDistanceToNow(new Date(server.last_seen_at), { addSuffix: true })}`
              : 'Never seen'}
          </p>
        </CardHeader>
        <CardContent>
          {server.latestMetric ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Cpu className="h-4 w-4" />
                  <span>CPU</span>
                </div>
                <span className={`font-semibold ${getMetricColor(server.latestMetric.cpu, { warning: 70, critical: 85 })}`}>
                  {server.latestMetric.cpu.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <MemoryStick className="h-4 w-4" />
                  <span>Memory</span>
                </div>
                <span className={`font-semibold ${getMetricColor(server.latestMetric.memory, { warning: 70, critical: 80 })}`}>
                  {server.latestMetric.memory.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <HardDrive className="h-4 w-4" />
                  <span>Disk</span>
                </div>
                <span className={`font-semibold ${getMetricColor(server.latestMetric.disk, { warning: 80, critical: 90 })}`}>
                  {server.latestMetric.disk.toFixed(1)}%
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-sm text-slate-500">
              <p>No metrics yet</p>
              <p className="text-xs mt-1">Waiting for first data...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
