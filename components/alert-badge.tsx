import { Badge } from '@/components/ui/badge';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

interface AlertBadgeProps {
  type: string;
  severity?: string;
  className?: string;
}

export function AlertBadge({ type, severity, className }: AlertBadgeProps) {
  const getAlertConfig = () => {
    const configs: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
      down: {
        label: 'Server Down',
        variant: 'destructive',
        icon: <AlertCircle className="h-3 w-3" />
      },
      cpu_high: {
        label: 'High CPU',
        variant: severity === 'critical' ? 'destructive' : 'secondary',
        icon: <AlertTriangle className="h-3 w-3" />
      },
      memory_high: {
        label: 'High Memory',
        variant: severity === 'critical' ? 'destructive' : 'secondary',
        icon: <AlertTriangle className="h-3 w-3" />
      },
      disk_high: {
        label: 'High Disk',
        variant: 'destructive',
        icon: <AlertCircle className="h-3 w-3" />
      }
    };

    return configs[type] || {
      label: type,
      variant: 'outline' as const,
      icon: <Info className="h-3 w-3" />
    };
  };

  const config = getAlertConfig();

  return (
    <Badge variant={config.variant} className={className}>
      <span className="flex items-center gap-1">
        {config.icon}
        {config.label}
      </span>
    </Badge>
  );
}
