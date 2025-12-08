'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Activity, Server, Bell, Settings, Users, LayoutDashboard } from 'lucide-react';

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

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="w-64 border-r bg-slate-50 min-h-screen p-6">
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
      </div>
    </nav>
  );
}
