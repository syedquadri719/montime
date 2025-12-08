'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, UserPlus, Link as LinkIcon, Copy, Trash2, Settings, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Team {
  id: string;
  name: string;
  owner_id: string;
}

interface TeamMember {
  id: string;
  user_id: string;
  role: 'admin' | 'member' | 'viewer';
  email: string;
  name: string;
  joined_at: string;
}

interface TeamInvite {
  id: string;
  token: string;
  email: string | null;
  role: string;
  expires_at: string | null;
  created_at: string;
}

export default function TeamPage() {
  const [hasTeam, setHasTeam] = useState(false);
  const [team, setTeam] = useState<Team | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [featureAvailable, setFeatureAvailable] = useState(true);
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isEditTeamOpen, setIsEditTeamOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');
  const [inviteExpires, setInviteExpires] = useState('7');

  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = async () => {
    try {
      const response = await fetch('/api/team');
      const data = await response.json();

      if (response.status === 503) {
        setFeatureAvailable(false);
        setLoading(false);
        return;
      }

      if (response.ok) {
        setHasTeam(data.hasTeam);
        setTeam(data.team);
        setUserRole(data.role);
        setTeamName(data.team?.name || '');

        if (data.hasTeam) {
          await Promise.all([fetchMembers(), fetchInvites()]);
        }
      }
    } catch (error) {
      console.error('Error fetching team:', error);
      setFeatureAvailable(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await fetch('/api/team/members');
      const data = await response.json();

      if (response.ok) {
        setMembers(data.members || []);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const fetchInvites = async () => {
    try {
      const response = await fetch('/api/team/invites');
      const data = await response.json();

      if (response.ok) {
        setInvites(data.invites || []);
      }
    } catch (error) {
      console.error('Error fetching invites:', error);
    }
  };

  const createTeam = async () => {
    if (!teamName.trim()) {
      toast.error('Team name is required');
      return;
    }

    try {
      const response = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: teamName })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Team created successfully');
        setIsCreateTeamOpen(false);
        fetchTeamData();
      } else {
        toast.error(data.error || 'Failed to create team');
      }
    } catch (error) {
      toast.error('Failed to create team');
    }
  };

  const updateTeam = async () => {
    if (!teamName.trim()) {
      toast.error('Team name is required');
      return;
    }

    try {
      const response = await fetch('/api/team', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: teamName })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Team updated successfully');
        setIsEditTeamOpen(false);
        fetchTeamData();
      } else {
        toast.error(data.error || 'Failed to update team');
      }
    } catch (error) {
      toast.error('Failed to update team');
    }
  };

  const createInvite = async () => {
    try {
      const response = await fetch('/api/team/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail || null,
          role: inviteRole,
          expiresInDays: parseInt(inviteExpires)
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Invite created successfully');
        setIsInviteOpen(false);
        setInviteEmail('');
        setInviteRole('member');
        setInviteExpires('7');
        fetchInvites();
      } else {
        toast.error(data.error || 'Failed to create invite');
      }
    } catch (error) {
      toast.error('Failed to create invite');
    }
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/dashboard/invite/${token}`;
    navigator.clipboard.writeText(link);
    toast.success('Invite link copied to clipboard');
  };

  const revokeInvite = async (inviteId: string) => {
    if (!confirm('Are you sure you want to revoke this invite?')) return;

    try {
      const response = await fetch(`/api/team/invites?inviteId=${inviteId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Invite revoked successfully');
        fetchInvites();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to revoke invite');
      }
    } catch (error) {
      toast.error('Failed to revoke invite');
    }
  };

  const updateMemberRole = async (memberId: string, newRole: string) => {
    try {
      const response = await fetch('/api/team/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, role: newRole })
      });

      if (response.ok) {
        toast.success('Member role updated successfully');
        fetchMembers();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update member role');
      }
    } catch (error) {
      toast.error('Failed to update member role');
    }
  };

  const removeMember = async (memberId: string, email: string) => {
    if (!confirm(`Are you sure you want to remove ${email} from the team?`)) return;

    try {
      const response = await fetch(`/api/team/members?memberId=${memberId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Member removed successfully');
        fetchMembers();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to remove member');
      }
    } catch (error) {
      toast.error('Failed to remove member');
    }
  };

  const leaveTeam = async () => {
    if (!confirm('Are you sure you want to leave this team? You will lose access to all team resources.')) return;

    try {
      const currentUser = members.find(m => m.role === userRole);
      const response = await fetch(`/api/team/members?userId=${currentUser?.user_id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('You have left the team');
        fetchTeamData();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to leave team');
      }
    } catch (error) {
      toast.error('Failed to leave team');
    }
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      admin: 'bg-red-100 text-red-800',
      member: 'bg-blue-100 text-blue-800',
      viewer: 'bg-slate-100 text-slate-800'
    };

    return (
      <Badge className={colors[role as keyof typeof colors] || ''}>
        {role}
      </Badge>
    );
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!featureAvailable) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Team Management</h1>
          <p className="text-slate-600 mt-1">Collaborate with your team</p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Team feature is not yet available. Database tables need to be created manually.
            Contact your administrator to enable multi-user team access.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!hasTeam) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Team Management</h1>
          <p className="text-slate-600 mt-1">Create a team to collaborate</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>No Team Yet</CardTitle>
            <CardDescription>
              Create a team to invite members and collaborate on server monitoring
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setIsCreateTeamOpen(true)}>
              <Users className="h-4 w-4 mr-2" />
              Create Team
            </Button>
          </CardContent>
        </Card>

        <Dialog open={isCreateTeamOpen} onOpenChange={setIsCreateTeamOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Team</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="team-name">Team Name</Label>
                <Input
                  id="team-name"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="My Team"
                />
              </div>
              <Button onClick={createTeam} className="w-full">
                Create Team
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const isAdmin = userRole === 'admin';

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{team?.name}</h1>
          <p className="text-slate-600 mt-1">Manage your team and members</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <>
              <Button variant="outline" onClick={() => setIsEditTeamOpen(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button onClick={() => setIsInviteOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
            </>
          )}
          <Button variant="destructive" onClick={leaveTeam}>
            Leave Team
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>Manage roles and permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>
                    {isAdmin && member.role !== 'admin' ? (
                      <Select
                        value={member.role}
                        onValueChange={(value) => updateMemberRole(member.id, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      getRoleBadge(member.role)
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {isAdmin && member.role !== 'admin' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMember(member.id, member.email)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {isAdmin && invites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invites</CardTitle>
            <CardDescription>Active invitation links</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell>{invite.email || 'Anyone with link'}</TableCell>
                    <TableCell>{getRoleBadge(invite.role)}</TableCell>
                    <TableCell>
                      {invite.expires_at
                        ? new Date(invite.expires_at).toLocaleDateString()
                        : 'Never'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyInviteLink(invite.token)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => revokeInvite(invite.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={isEditTeamOpen} onOpenChange={setIsEditTeamOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Team Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="edit-team-name">Team Name</Label>
              <Input
                id="edit-team-name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
              />
            </div>
            <Button onClick={updateTeam} className="w-full">
              Update Team
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="invite-email">Email (Optional)</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Leave blank for shareable link"
              />
            </div>
            <div>
              <Label htmlFor="invite-role">Role</Label>
              <Select value={inviteRole} onValueChange={(v: any) => setInviteRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin - Full access</SelectItem>
                  <SelectItem value="member">Member - Edit access</SelectItem>
                  <SelectItem value="viewer">Viewer - Read only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="invite-expires">Expires In</Label>
              <Select value={inviteExpires} onValueChange={setInviteExpires}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 day</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="0">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={createInvite} className="w-full">
              <LinkIcon className="h-4 w-4 mr-2" />
              Generate Invite Link
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
