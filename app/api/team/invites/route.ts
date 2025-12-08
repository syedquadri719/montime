import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserServer } from '@/lib/auth-server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getUserTeamContext, getTeamInvites, hasPermission } from '@/lib/team';
import { randomBytes } from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserServer();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teamContext = await getUserTeamContext(user.id);

    if (!teamContext.hasTeam) {
      return NextResponse.json(
        { error: 'You are not part of a team' },
        { status: 404 }
      );
    }

    if (!hasPermission(teamContext.role, 'admin')) {
      return NextResponse.json(
        { error: 'You must be a team admin to view invites' },
        { status: 403 }
      );
    }

    const invites = await getTeamInvites(teamContext.teamId!);

    return NextResponse.json({ invites }, { status: 200 });
  } catch (error) {
    console.error('Error fetching team invites:', error);
    return NextResponse.json(
      { error: 'Team feature not available. Database tables need to be created manually.' },
      { status: 503 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserServer();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teamContext = await getUserTeamContext(user.id);

    if (!teamContext.hasTeam || !hasPermission(teamContext.role, 'admin')) {
      return NextResponse.json(
        { error: 'You must be a team admin to create invites' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, role, expiresInDays } = body;

    if (!role || !['admin', 'member', 'viewer'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be admin, member, or viewer' },
        { status: 400 }
      );
    }

    const token = randomBytes(32).toString('hex');

    let expiresAt = null;
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    const supabase = getSupabaseAdmin();

    const { data: invite, error } = await supabase
      .from('team_invites')
      .insert({
        team_id: teamContext.teamId,
        token,
        email: email || null,
        role,
        created_by: user.id,
        expires_at: expiresAt?.toISOString() || null
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ invite }, { status: 201 });
  } catch (error) {
    console.error('Error creating team invite:', error);
    return NextResponse.json(
      { error: 'Team feature not available. Database tables need to be created manually.' },
      { status: 503 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUserServer();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teamContext = await getUserTeamContext(user.id);

    if (!teamContext.hasTeam || !hasPermission(teamContext.role, 'admin')) {
      return NextResponse.json(
        { error: 'You must be a team admin to revoke invites' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const inviteId = url.searchParams.get('inviteId');

    if (!inviteId) {
      return NextResponse.json(
        { error: 'Invite ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from('team_invites')
      .delete()
      .eq('id', inviteId)
      .eq('team_id', teamContext.teamId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error revoking team invite:', error);
    return NextResponse.json(
      { error: 'Team feature not available. Database tables need to be created manually.' },
      { status: 503 }
    );
  }
}
