'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Globe, Activity, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface MonitorCardProps {
  monitor: {
    id: string;
    name: string;
    type: string;
    url: string;
    status: string;
    last_checked_at: string | null;
    last_response_time: number | null;
  };
}

export function MonitorCard({ monitor }: MonitorCardProps) {
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

  const getTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      http: 'HTTP',
      https: 'HTTPS',
      ping: 'Ping',
      tcp: 'TCP Port',
      ssl: 'SSL Certificate',
      keyword: 'Keyword'
    };
    return labels[type] || type.toUpperCase();
  };

  return (
    <Link href={`/dashboard/monitor/${monitor.id}`} className="block">
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-slate-600" />
              <CardTitle className="text-lg">{monitor.name}</CardTitle>
            </div>
            <Badge variant={getStatusVariant(monitor.status)}>
              <div className="flex items-center gap-1.5">
                <div className={`h-2 w-2 rounded-full ${getStatusColor(monitor.status)}`} />
                {monitor.status.toUpperCase()}
              </div>
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1 truncate">{monitor.url}</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <Activity className="h-4 w-4" />
                <span>Type</span>
              </div>
              <span className="font-semibold">{getTypeLabel(monitor.type)}</span>
            </div>
            {monitor.last_response_time !== null && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Clock className="h-4 w-4" />
                  <span>Response Time</span>
                </div>
                <span className="font-semibold">{monitor.last_response_time}ms</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <Clock className="h-4 w-4" />
                <span>Last Check</span>
              </div>
              <span className="font-semibold text-xs">
                {monitor.last_checked_at
                  ? formatDistanceToNow(new Date(monitor.last_checked_at), { addSuffix: true })
                  : 'Never'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
