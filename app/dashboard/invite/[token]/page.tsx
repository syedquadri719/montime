'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Users } from 'lucide-react';
import { toast } from 'sonner';

interface InviteInfo {
  id: string;
  team_name: string;
  role: string;
  email: string | null;
}

export default function InviteAcceptPage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    validateInvite();
  }, [params.token]);

  const validateInvite = async () => {
    try {
      const response = await fetch(`/api/team/invites/${params.token}`);
      const data = await response.json();

      if (response.status === 503) {
        setError('Team feature is not yet available. Database tables need to be created manually.');
        return;
      }

      if (response.ok) {
        setInvite(data.invite);
      } else {
        setError(data.error || 'Invalid invite');
      }
    } catch (err) {
      setError('Failed to validate invite');
    } finally {
      setLoading(false);
    }
  };

  const acceptInvite = async () => {
    setAccepting(true);

    try {
      const response = await fetch(`/api/team/invites/${params.token}`, {
        method: 'POST'
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        toast.success('Successfully joined the team!');
        setTimeout(() => {
          router.push('/dashboard/team');
        }, 2000);
      } else {
        toast.error(data.error || 'Failed to accept invite');
        setError(data.error || 'Failed to accept invite');
      }
    } catch (err) {
      toast.error('Failed to accept invite');
      setError('Failed to accept invite');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Validating invite...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-center">Welcome to the Team!</CardTitle>
            <CardDescription className="text-center">
              You have successfully joined {invite?.team_name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-sm text-slate-600 mb-4">
              Redirecting to team dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-red-100 p-3">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-center">Invalid Invite</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button
              onClick={() => router.push('/dashboard')}
              className="w-full"
              variant="outline"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-6">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-blue-100 p-3">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-center">Join Team</CardTitle>
          <CardDescription className="text-center">
            You've been invited to join <strong>{invite?.team_name}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-slate-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Team:</span>
              <span className="font-medium">{invite?.team_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Role:</span>
              <span className="font-medium capitalize">{invite?.role}</span>
            </div>
            {invite?.email && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">For:</span>
                <span className="font-medium">{invite.email}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm text-slate-600">
              By accepting, you'll gain access to:
            </p>
            <ul className="text-sm text-slate-600 list-disc list-inside space-y-1">
              <li>Team servers and monitoring data</li>
              <li>Shared dashboards and alerts</li>
              <li>Collaboration with team members</li>
            </ul>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={acceptInvite}
              disabled={accepting}
              className="flex-1"
            >
              {accepting ? 'Accepting...' : 'Accept Invite'}
            </Button>
            <Button
              onClick={() => router.push('/dashboard')}
              variant="outline"
              className="flex-1"
            >
              Decline
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
