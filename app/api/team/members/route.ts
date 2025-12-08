import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserServer } from '@/lib/auth-server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getUserTeamContext, getTeamMembers, hasPermission } from '@/lib/team';

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

    const members = await getTeamMembers(teamContext.teamId!);

    const supabase = getSupabaseAdmin();
    const userIds = members.map(m => m.user_id);

    const { data: users } = await supabase.auth.admin.listUsers();

    const membersWithDetails = members.map(member => {
      const userDetails = users?.users.find(u => u.id === member.user_id);
      return {
        ...member,
        email: userDetails?.email || 'Unknown',
        name: userDetails?.user_metadata?.name || userDetails?.email || 'Unknown'
      };
    });

    return NextResponse.json({ members: membersWithDetails }, { status: 200 });
  } catch (error) {
    console.error('Error fetching team members:', error);
    return NextResponse.json(
      { error: 'Team feature not available. Database tables need to be created manually.' },
      { status: 503 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUserServer();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teamContext = await getUserTeamContext(user.id);

    if (!teamContext.hasTeam || !hasPermission(teamContext.role, 'admin')) {
      return NextResponse.json(
        { error: 'You must be a team admin to update member roles' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { memberId, role } = body;

    if (!memberId || !role) {
      return NextResponse.json(
        { error: 'Member ID and role are required' },
        { status: 400 }
      );
    }

    if (!['admin', 'member', 'viewer'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be admin, member, or viewer' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from('team_members')
      .update({ role })
      .eq('id', memberId)
      .eq('team_id', teamContext.teamId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error updating team member:', error);
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

    if (!teamContext.hasTeam) {
      return NextResponse.json(
        { error: 'You are not part of a team' },
        { status: 404 }
      );
    }

    const url = new URL(request.url);
    const memberId = url.searchParams.get('memberId');
    const userId = url.searchParams.get('userId');

    if (!memberId && !userId) {
      return NextResponse.json(
        { error: 'Member ID or User ID is required' },
        { status: 400 }
      );
    }

    const isRemovingSelf = userId === user.id;

    if (!isRemovingSelf && !hasPermission(teamContext.role, 'admin')) {
      return NextResponse.json(
        { error: 'You must be a team admin to remove members' },
        { status: 403 }
      );
    }

    const supabase = getSupabaseAdmin();

    let query = supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamContext.teamId);

    if (memberId) {
      query = query.eq('id', memberId);
    } else if (userId) {
      query = query.eq('user_id', userId);
    }

    const { error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error removing team member:', error);
    return NextResponse.json(
      { error: 'Team feature not available. Database tables need to be created manually.' },
      { status: 503 }
    );
  }
}
