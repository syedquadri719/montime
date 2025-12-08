import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserServer } from '@/lib/auth-server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = getSupabaseAdmin();

    const { data: invite, error } = await supabase
      .from('team_invites')
      .select('*, teams(name)')
      .eq('token', params.token)
      .is('used_at', null)
      .maybeSingle();

    if (error) {
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return NextResponse.json(
          { error: 'Team feature not available. Database tables need to be created manually.' },
          { status: 503 }
        );
      }
      throw error;
    }

    if (!invite) {
      return NextResponse.json(
        { error: 'Invalid or expired invite' },
        { status: 404 }
      );
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This invite has expired' },
        { status: 410 }
      );
    }

    return NextResponse.json({
      invite: {
        id: invite.id,
        team_name: invite.teams?.name,
        role: invite.role,
        email: invite.email
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error validating invite:', error);
    return NextResponse.json(
      { error: 'Team feature not available. Database tables need to be created manually.' },
      { status: 503 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const user = await getCurrentUserServer();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    const { data: invite, error: fetchError } = await supabase
      .from('team_invites')
      .select('*')
      .eq('token', params.token)
      .is('used_at', null)
      .maybeSingle();

    if (fetchError) {
      throw fetchError;
    }

    if (!invite) {
      return NextResponse.json(
        { error: 'Invalid or already used invite' },
        { status: 404 }
      );
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This invite has expired' },
        { status: 410 }
      );
    }

    if (invite.email && invite.email !== user.email) {
      return NextResponse.json(
        { error: 'This invite is for a different email address' },
        { status: 403 }
      );
    }

    const { data: existingMember } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', invite.team_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingMember) {
      return NextResponse.json(
        { error: 'You are already a member of this team' },
        { status: 409 }
      );
    }

    const { error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: invite.team_id,
        user_id: user.id,
        role: invite.role
      });

    if (memberError) {
      throw memberError;
    }

    const { error: updateError } = await supabase
      .from('team_invites')
      .update({ used_at: new Date().toISOString() })
      .eq('id', invite.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error accepting invite:', error);
    return NextResponse.json(
      { error: 'Team feature not available. Database tables need to be created manually.' },
      { status: 503 }
    );
  }
}
