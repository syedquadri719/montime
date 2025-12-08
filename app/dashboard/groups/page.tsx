'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit, Users } from 'lucide-react';
import { toast } from 'sonner';

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
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', color: '#3B82F6' });
  const [assignedServers, setAssignedServers] = useState<Record<string, string[]>>({});

  useEffect(() => {
    fetchGroups();
    fetchServers();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/groups');
      const data = await response.json();

      if (response.ok) {
        setGroups(data.data || []);
        if (data.message) {
          toast.info(data.message);
        }
        fetchAllGroupServers();
      } else {
        toast.error(data.error || 'Failed to fetch groups');
      }
    } catch (error) {
      toast.error('Failed to fetch groups');
    } finally {
      setLoading(false);
    }
  };

  const fetchServers = async () => {
    try {
      const response = await fetch('/api/servers');
      const data = await response.json();

      if (response.ok) {
        setServers(data.servers || []);
      }
    } catch (error) {
      console.error('Failed to fetch servers:', error);
    }
  };

  const fetchAllGroupServers = async () => {
    try {
      const response = await fetch('/api/server-groups');
      const data = await response.json();

      if (response.ok) {
        const serversByGroup: Record<string, string[]> = {};
        (data.data || []).forEach((sg: any) => {
          if (!serversByGroup[sg.group_id]) {
            serversByGroup[sg.group_id] = [];
          }
          serversByGroup[sg.group_id].push(sg.server_id);
        });
        setAssignedServers(serversByGroup);
      }
    } catch (error) {
      console.error('Failed to fetch server groups:', error);
    }
  };

  const fetchGroupServers = async (groupId: string) => {
    try {
      const response = await fetch(`/api/server-groups?group_id=${groupId}`);
      const data = await response.json();

      if (response.ok) {
        const serverIds = (data.data || []).map((sg: any) => sg.server_id);
        setAssignedServers(prev => ({ ...prev, [groupId]: serverIds }));
      }
    } catch (error) {
      console.error('Failed to fetch group servers:', error);
    }
  };

  const createGroup = async () => {
    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Group created successfully');
        fetchGroups();
        setIsCreateOpen(false);
        setFormData({ name: '', description: '', color: '#3B82F6' });
      } else {
        toast.error(data.error || 'Failed to create group');
      }
    } catch (error) {
      toast.error('Failed to create group');
    }
  };

  const updateGroup = async () => {
    if (!selectedGroup) return;

    try {
      const response = await fetch(`/api/groups/${selectedGroup.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Group updated successfully');
        fetchGroups();
        setIsEditOpen(false);
        setSelectedGroup(null);
        setFormData({ name: '', description: '', color: '#3B82F6' });
      } else {
        toast.error(data.error || 'Failed to update group');
      }
    } catch (error) {
      toast.error('Failed to update group');
    }
  };

  const deleteGroup = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this group?')) return;

    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Group deleted successfully');
        fetchGroups();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete group');
      }
    } catch (error) {
      toast.error('Failed to delete group');
    }
  };

  const toggleServerAssignment = async (serverId: string, groupId: string) => {
    const isAssigned = assignedServers[groupId]?.includes(serverId);

    try {
      const response = await fetch('/api/server-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          server_id: serverId,
          group_id: groupId,
          action: isAssigned ? 'remove' : 'assign'
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(isAssigned ? 'Server removed from group' : 'Server assigned to group');
        fetchGroupServers(groupId);
        fetchAllGroupServers();
      } else {
        toast.error(data.error || 'Failed to update assignment');
      }
    } catch (error) {
      toast.error('Failed to update assignment');
    }
  };

  const openEditDialog = (group: Group) => {
    setSelectedGroup(group);
    setFormData({
      name: group.name,
      description: group.description || '',
      color: group.color
    });
    setIsEditOpen(true);
  };

  const openAssignDialog = (group: Group) => {
    setSelectedGroup(group);
    fetchGroupServers(group.id);
    setIsAssignOpen(true);
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Server Groups</h1>
          <p className="text-slate-600 mt-1">Organize your servers into groups</p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Production Servers"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Production environment servers"
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
              <Button onClick={createGroup} className="w-full">Create Group</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 mx-auto text-slate-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No groups yet</h3>
            <p className="text-slate-600 mb-4">Create your first group to organize servers</p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Card key={group.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: group.color }}
                    />
                    <CardTitle>{group.name}</CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openAssignDialog(group)}
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(group)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteGroup(group.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 mb-3">
                  {group.description || 'No description'}
                </p>
                <Badge variant="secondary">
                  {assignedServers[group.id]?.length || 0} servers
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-color">Color</Label>
              <Input
                id="edit-color"
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              />
            </div>
            <Button onClick={updateGroup} className="w-full">Update Group</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Servers - {selectedGroup?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-4 max-h-96 overflow-y-auto">
            {servers.length === 0 ? (
              <p className="text-sm text-slate-600 text-center py-4">No servers available</p>
            ) : (
              servers.map((server) => {
                const isAssigned = selectedGroup
                  ? assignedServers[selectedGroup.id]?.includes(server.id)
                  : false;

                return (
                  <div
                    key={server.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <span className="text-sm font-medium">{server.name}</span>
                    <Button
                      variant={isAssigned ? 'destructive' : 'default'}
                      size="sm"
                      onClick={() =>
                        selectedGroup && toggleServerAssignment(server.id, selectedGroup.id)
                      }
                    >
                      {isAssigned ? 'Remove' : 'Assign'}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
