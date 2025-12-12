'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Activity, Server, Bell, Settings, Users, LayoutDashboard, UsersRound, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const navItems = [
  {
    title: 'Overview',
    href: '/dashboard',
    icon: Activity,
  },
  {
    title: 'Servers',
    href: '/dashboard/servers',
    icon: Server,
  },
  {
    title: 'Monitors',
    href: '/dashboard/monitors',
    icon: Globe,
  },
  {
    title: 'Groups',
    href: '/dashboard/groups',
    icon: Users,
  },
  {
    title: 'Dashboards',
    href: '/dashboard/dashboards',
    icon: LayoutDashboard,
  },
  {
    title: 'Alerts',
    href: '/dashboard/alerts',
    icon: Bell,
  },
  {
    title: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
];

interface TeamInfo {
  hasTeam: boolean;
  team: {
    name: string;
  } | null;
  role: string | null;
}

export function DashboardNav() {
  const pathname = usePathname();
  const [teamInfo, setTeamInfo] = useState<TeamInfo>({ hasTeam: false, team: null, role: null });

  useEffect(() => {
    fetchTeamInfo();
  }, []);

  const fetchTeamInfo = async () => {
    try {
      const response = await fetch('/api/team');
      if (response.ok) {
        const data = await response.json();
        setTeamInfo(data);
      }
    } catch (error) {
      console.log('Team feature not available');
    }
  };

  return (
    <nav className="w-64 border-r bg-slate-50 min-h-screen p-6">
      <div className="flex flex-col gap-4">
        {teamInfo.hasTeam && teamInfo.team && (
          <div className="mb-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Team
              </span>
              <Badge variant="secondary" className="text-xs">
                {teamInfo.role}
              </Badge>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-3">
              <div className="flex items-center gap-2">
                <UsersRound className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-sm">{teamInfo.team.name}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-700 hover:bg-slate-200'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.title}</span>
              </Link>
            );
          })}

          <Link
            href="/dashboard/team"
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors border-t mt-2 pt-4',
              pathname === '/dashboard/team'
                ? 'bg-blue-600 text-white'
                : 'text-slate-700 hover:bg-slate-200'
            )}
          >
            <UsersRound className="h-5 w-5" />
            <span className="font-medium">Team</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
