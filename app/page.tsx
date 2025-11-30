import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/header';
import { Activity, Server, Bell, LineChart, Shield, Zap } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      <Header isAuthenticated={false} />

      <main>
        <section className="container mx-auto px-4 py-20 text-center">
          <div className="max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full mb-6">
              <Activity className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-600">Lightweight Server Monitoring</span>
            </div>

            <h1 className="text-5xl font-bold tracking-tight mb-6">
              Monitor Your Servers
              <br />
              <span className="text-blue-600">Stay in Control</span>
            </h1>

            <p className="text-xl text-slate-600 mb-8">
              Simple, powerful server monitoring for small businesses. Track performance, get instant alerts, and keep your infrastructure running smoothly.
            </p>

            <div className="flex items-center justify-center gap-4">
              <Link href="/signup">
                <Button size="lg" className="text-lg px-8">
                  Start Free Trial
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="text-lg px-8">
                  Sign In
                </Button>
              </Link>
            </div>

            <p className="text-sm text-slate-500 mt-4">
              No credit card required • 14-day free trial
            </p>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16">
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white p-8 rounded-xl border hover:shadow-lg transition-shadow">
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Server className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Real-Time Monitoring</h3>
              <p className="text-slate-600">
                Track CPU, memory, disk usage, and network metrics in real-time across all your servers.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl border hover:shadow-lg transition-shadow">
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Bell className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Instant Alerts</h3>
              <p className="text-slate-600">
                Get notified immediately when critical thresholds are exceeded or servers go offline.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl border hover:shadow-lg transition-shadow">
              <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <LineChart className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Performance Insights</h3>
              <p className="text-slate-600">
                Visualize trends and identify performance issues before they impact your users.
              </p>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto bg-blue-600 text-white rounded-2xl p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Perfect for Small to Medium Businesses
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Monitor 5-25 servers with ease. No complex setup, no hidden fees.
            </p>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-blue-500 bg-opacity-50 rounded-lg p-6">
                <Shield className="h-8 w-8 mx-auto mb-2" />
                <p className="font-semibold">Secure & Reliable</p>
              </div>
              <div className="bg-blue-500 bg-opacity-50 rounded-lg p-6">
                <Zap className="h-8 w-8 mx-auto mb-2" />
                <p className="font-semibold">Lightning Fast</p>
              </div>
              <div className="bg-blue-500 bg-opacity-50 rounded-lg p-6">
                <Activity className="h-8 w-8 mx-auto mb-2" />
                <p className="font-semibold">Always Available</p>
              </div>
            </div>

            <Link href="/signup">
              <Button size="lg" variant="secondary" className="text-lg px-8">
                Get Started Today
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-slate-600">
          <p>&copy; 2024 Montime.io. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
