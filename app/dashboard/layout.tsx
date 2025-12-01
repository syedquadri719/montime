import { redirect } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { DashboardNav } from '@/components/layout/dashboard-nav';
import { getCurrentUserServer } from '@/lib/auth-server';

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUserServer();

  if (!user) {
    redirect('/login?redirect=/dashboard');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header isAuthenticated={true} />
      <div className="flex">
        <DashboardNav />
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
