import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserServer } from '@/lib/auth-server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getUserTeamContext } from '@/lib/team';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserServer();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teamContext = await getUserTeamContext(user.id);

    return NextResponse.json({
      hasTeam: teamContext.hasTeam,
      team: teamContext.team,
      role: teamContext.role
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching team:', error);
    return NextResponse.json({
      hasTeam: false,
      team: null,
      role: null
    }, { status: 200 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUserServer();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teamContext = await getUserTeamContext(user.id);

    if (!teamContext.hasTeam || teamContext.role !== 'admin') {
      return NextResponse.json(
        { error: 'You must be a team admin to update team settings' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: team, error } = await supabase
      .from('teams')
      .update({
        name,
        updated_at: new Date().toISOString()
      })
      .eq('id', teamContext.teamId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ team }, { status: 200 });
  } catch (error) {
    console.error('Error updating team:', error);
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

    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({
        name,
        owner_id: user.id
      })
      .select()
      .single();

    if (teamError) {
      throw teamError;
    }

    const { error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: team.id,
        user_id: user.id,
        role: 'admin'
      });

    if (memberError) {
      throw memberError;
    }

    return NextResponse.json({ team }, { status: 201 });
  } catch (error) {
    console.error('Error creating team:', error);
    return NextResponse.json(
      { error: 'Team feature not available. Database tables need to be created manually.' },
      { status: 503 }
    );
  }
}
