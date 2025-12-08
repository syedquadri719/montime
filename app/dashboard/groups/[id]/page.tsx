'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Edit2, Trash2, Plus, Activity, HardDrive, Cpu, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Group {
  id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
}

interface Server {
  id: string;
  name: string;
  status: string;
  last_seen_at: string | null;
  latestMetric?: {
    cpu_usage: number | null;
    memory_usage: number | null;
    disk_usage: number | null;
    created_at: string;
  };
}

interface AggregatedMetrics {
  avgCpu: number;
  avgMemory: number;
  avgDisk: number;
  onlineCount: number;
  totalCount: number;
}

export default function GroupDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [group, setGroup] = useState<Group | null>(null);
  const [servers, setServers] = useState<Server[]>([]);
  const [allServers, setAllServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddServerOpen, setIsAddServerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ name: '', description: '', color: '#3B82F6' });

  useEffect(() => {
    fetchGroupData();
    fetchAllServers();
  }, [params.id]);

  const fetchGroupData = async () => {
    try {
      const [groupRes, serversRes] = await Promise.all([
        fetch(`/api/groups/${params.id}`),
        fetch(`/api/server-groups?group_id=${params.id}`)
      ]);

      const groupData = await groupRes.json();
      const serversData = await serversRes.json();

      if (groupRes.ok && groupData.data) {
        setGroup(groupData.data);
        setFormData({
          name: groupData.data.name,
          description: groupData.data.description || '',
          color: groupData.data.color
        });
      } else {
        toast.error('Failed to load group');
        router.push('/dashboard/groups');
        return;
      }

      if (serversRes.ok && serversData.data) {
        const serverIds = serversData.data.map((sg: any) => sg.server_id);
        if (serverIds.length > 0) {
          await fetchServersDetails(serverIds);
        } else {
          setServers([]);
        }
      }
    } catch (error) {
      toast.error('Failed to load group data');
    } finally {
      setLoading(false);
    }
  };

  const fetchServersDetails = async (serverIds: string[]) => {
    try {
      const response = await fetch('/api/servers');
      const data = await response.json();

      if (response.ok) {
        const groupServers = (data.servers || []).filter((s: Server) =>
          serverIds.includes(s.id)
        );
        setServers(groupServers);
      }
    } catch (error) {
      console.error('Failed to fetch servers:', error);
    }
  };

  const fetchAllServers = async () => {
    try {
      const response = await fetch('/api/servers');
      const data = await response.json();

      if (response.ok) {
        setAllServers(data.servers || []);
      }
    } catch (error) {
      console.error('Failed to fetch all servers:', error);
    }
  };

  const calculateAggregatedMetrics = (): AggregatedMetrics => {
    const onlineServers = servers.filter(s => s.status === 'online');
    const serversWithMetrics = servers.filter(s => s.latestMetric);

    if (serversWithMetrics.length === 0) {
      return {
        avgCpu: 0,
        avgMemory: 0,
        avgDisk: 0,
        onlineCount: onlineServers.length,
        totalCount: servers.length
      };
    }

    const sumCpu = serversWithMetrics.reduce((acc, s) =>
      acc + (s.latestMetric?.cpu_usage || 0), 0);
    const sumMemory = serversWithMetrics.reduce((acc, s) =>
      acc + (s.latestMetric?.memory_usage || 0), 0);
    const sumDisk = serversWithMetrics.reduce((acc, s) =>
      acc + (s.latestMetric?.disk_usage || 0), 0);

    return {
      avgCpu: sumCpu / serversWithMetrics.length,
      avgMemory: sumMemory / serversWithMetrics.length,
      avgDisk: sumDisk / serversWithMetrics.length,
      onlineCount: onlineServers.length,
      totalCount: servers.length
    };
  };

  const updateGroup = async () => {
    try {
      const response = await fetch(`/api/groups/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Group updated successfully');
        setGroup(data.data);
        setIsEditOpen(false);
      } else {
        toast.error(data.error || 'Failed to update group');
      }
    } catch (error) {
      toast.error('Failed to update group');
    }
  };

  const deleteGroup = async () => {
    if (!confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/groups/${params.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Group deleted successfully');
        router.push('/dashboard/groups');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete group');
      }
    } catch (error) {
      toast.error('Failed to delete group');
    }
  };

  const removeServerFromGroup = async (serverId: string) => {
    try {
      const response = await fetch('/api/server-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          server_id: serverId,
          group_id: params.id,
          action: 'remove'
        })
      });

      if (response.ok) {
        toast.success('Server removed from group');
        fetchGroupData();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to remove server');
      }
    } catch (error) {
      toast.error('Failed to remove server');
    }
  };

  const addServerToGroup = async (serverId: string) => {
    try {
      const response = await fetch('/api/server-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          server_id: serverId,
          group_id: params.id,
          action: 'assign'
        })
      });

      if (response.ok) {
        toast.success('Server added to group');
        setIsAddServerOpen(false);
        setSearchTerm('');
        fetchGroupData();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to add server');
      }
    } catch (error) {
      toast.error('Failed to add server');
    }
  };

  const getStatusBadge = (status: string) => {
    const variant = status === 'online' ? 'default' : 'secondary';
    const color = status === 'online' ? 'bg-green-500' : 'bg-slate-400';

    return (
      <Badge variant={variant}>
        <div className="flex items-center gap-1.5">
          <div className={`h-2 w-2 rounded-full ${color}`} />
          {status}
        </div>
      </Badge>
    );
  };

  const formatMetric = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return 'N/A';
    return `${value.toFixed(1)}%`;
  };

  const availableServers = allServers.filter(server =>
    !servers.some(s => s.id === server.id) &&
    server.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!group) {
    return <div className="p-6">Group not found</div>;
  }

  const metrics = calculateAggregatedMetrics();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 text-sm text-slate-600">
        <Link href="/dashboard" className="hover:text-slate-900 transition-colors">
          Dashboard
        </Link>
        <span>/</span>
        <Link href="/dashboard/groups" className="hover:text-slate-900 transition-colors">
          Groups
        </Link>
        <span>/</span>
        <span className="text-slate-900 font-medium">{group.name}</span>
      </div>

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/groups')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div
              className="h-6 w-6 rounded-full"
              style={{ backgroundColor: group.color }}
            />
            <div>
              <h1 className="text-3xl font-bold">{group.name}</h1>
              {group.description && (
                <p className="text-slate-600 mt-1">{group.description}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsEditOpen(true)}>
            <Edit2 className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="destructive" onClick={deleteGroup}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Average CPU</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">{formatMetric(metrics.avgCpu)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Average Memory</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">{formatMetric(metrics.avgMemory)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Average Disk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-orange-600" />
              <span className="text-2xl font-bold">{formatMetric(metrics.avgDisk)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Server Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-2xl font-bold">
                {metrics.onlineCount}/{metrics.totalCount}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Servers in Group</CardTitle>
            <Button onClick={() => setIsAddServerOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Server
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {servers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-600 mb-4">No servers in this group yet</p>
              <Button onClick={() => setIsAddServerOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Server
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Server Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>CPU</TableHead>
                  <TableHead>Memory</TableHead>
                  <TableHead>Disk</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {servers.map((server) => (
                  <TableRow key={server.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/server/${server.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {server.name}
                      </Link>
                    </TableCell>
                    <TableCell>{getStatusBadge(server.status)}</TableCell>
                    <TableCell>{formatMetric(server.latestMetric?.cpu_usage)}</TableCell>
                    <TableCell>{formatMetric(server.latestMetric?.memory_usage)}</TableCell>
                    <TableCell>{formatMetric(server.latestMetric?.disk_usage)}</TableCell>
                    <TableCell>
                      {server.last_seen_at
                        ? formatDistanceToNow(new Date(server.last_seen_at), { addSuffix: true })
                        : 'Never'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeServerFromGroup(server.id)}
                      >
                        <X className="h-4 w-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              />
            </div>
            <Button onClick={updateGroup} className="w-full">Update Group</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddServerOpen} onOpenChange={setIsAddServerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Server to Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="search">Search Servers</Label>
              <Input
                id="search"
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {availableServers.length === 0 ? (
                <p className="text-sm text-slate-600 text-center py-4">
                  {searchTerm ? 'No servers match your search' : 'All servers are already in this group'}
                </p>
              ) : (
                availableServers.map((server) => (
                  <div
                    key={server.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <span className="text-sm font-medium">{server.name}</span>
                      <div className="mt-1">{getStatusBadge(server.status)}</div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => addServerToGroup(server.id)}
                    >
                      Add
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
