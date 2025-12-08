'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, LayoutDashboard, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface Dashboard {
  id: string;
  name: string;
  description: string | null;
  group_id: string | null;
  created_at: string;
}

interface Group {
  id: string;
  name: string;
}

export default function DashboardsPage() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', group_id: 'none' });

  useEffect(() => {
    fetchDashboards();
    fetchGroups();
  }, []);

  const fetchDashboards = async () => {
    try {
      const response = await fetch('/api/dashboards');
      const data = await response.json();

      if (response.ok) {
        setDashboards(data.data || []);
        if (data.message) {
          toast.info(data.message);
        }
      } else {
        toast.error(data.error || 'Failed to fetch dashboards');
      }
    } catch (error) {
      toast.error('Failed to fetch dashboards');
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/groups');
      const data = await response.json();

      if (response.ok) {
        setGroups(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    }
  };

  const createDashboard = async () => {
    try {
      const response = await fetch('/api/dashboards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          group_id: formData.group_id === 'none' ? null : formData.group_id
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Dashboard created successfully');
        fetchDashboards();
        setIsCreateOpen(false);
        setFormData({ name: '', description: '', group_id: 'none' });
      } else {
        toast.error(data.error || 'Failed to create dashboard');
      }
    } catch (error) {
      toast.error('Failed to create dashboard');
    }
  };

  const deleteDashboard = async (dashboardId: string) => {
    if (!confirm('Are you sure you want to delete this dashboard?')) return;

    try {
      const response = await fetch(`/api/dashboards/${dashboardId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Dashboard deleted successfully');
        fetchDashboards();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete dashboard');
      }
    } catch (error) {
      toast.error('Failed to delete dashboard');
    }
  };

  const getGroupName = (groupId: string | null) => {
    if (!groupId) return 'Global';
    const group = groups.find(g => g.id === groupId);
    return group?.name || 'Unknown Group';
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboards</h1>
          <p className="text-slate-600 mt-1">Create and manage custom dashboards</p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Dashboard
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Dashboard</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Production Overview"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Dashboard for production servers"
                />
              </div>
              <div>
                <Label htmlFor="group">Group (Optional)</Label>
                <Select
                  value={formData.group_id}
                  onValueChange={(value) => setFormData({ ...formData, group_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Global)</SelectItem>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={createDashboard} className="w-full">Create Dashboard</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {dashboards.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <LayoutDashboard className="h-12 w-12 mx-auto text-slate-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No dashboards yet</h3>
            <p className="text-slate-600 mb-4">Create your first custom dashboard</p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Dashboard
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {dashboards.map((dashboard) => (
            <Card key={dashboard.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="flex items-center gap-2">
                    <LayoutDashboard className="h-5 w-5" />
                    {dashboard.name}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteDashboard(dashboard.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-600">
                  {dashboard.description || 'No description'}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    {getGroupName(dashboard.group_id)}
                  </span>
                  <Link href={`/dashboard/dashboard/${dashboard.id}`}>
                    <Button size="sm" variant="outline">
                      Open
                      <ExternalLink className="h-3 w-3 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
