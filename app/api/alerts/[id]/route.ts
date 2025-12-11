import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserServer } from '@/lib/auth-server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getResourceFilter, hasPermission } from '@/lib/team';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUserServer();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const filter = await getResourceFilter(user.id);

    if (!hasPermission(filter.role, 'edit')) {
      return NextResponse.json(
        { error: 'You do not have permission to update alerts' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action } = body;

    if (!action || !['acknowledge', 'resolve'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "acknowledge" or "resolve"' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    try {
      const updateData: any = {};

      if (action === 'acknowledge') {
        updateData.acknowledged = true;
        updateData.acknowledged_at = new Date().toISOString();
        updateData.acknowledged_by = user.id;
      } else if (action === 'resolve') {
        updateData.resolved = true;
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = user.id;
      }

      const { data: alert, error } = await supabaseAdmin
        .from('alerts')
        .update(updateData)
        .eq('id', params.id)
        .or(
          filter.useTeam && filter.teamId
            ? `team_id.eq.${filter.teamId},user_id.eq.${user.id}`
            : `user_id.eq.${user.id}`
        )
        .select()
        .maybeSingle();

      if (error) {
        if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
          return NextResponse.json(
            { error: 'Alerts table not yet configured. Please set up the database schema.' },
            { status: 503 }
          );
        }
        throw error;
      }

      if (!alert) {
        return NextResponse.json(
          { error: 'Alert not found or you do not have permission to update it' },
          { status: 404 }
        );
      }

      return NextResponse.json({ alert }, { status: 200 });
    } catch (dbError: any) {
      if (dbError.message?.includes('relation') || dbError.message?.includes('does not exist')) {
        return NextResponse.json(
          { error: 'Alerts table not yet configured. Please set up the database schema.' },
          { status: 503 }
        );
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Error updating alert:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUserServer();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const filter = await getResourceFilter(user.id);

    if (!hasPermission(filter.role, 'admin')) {
      return NextResponse.json(
        { error: 'You must be an admin to delete alerts' },
        { status: 403 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    try {
      const { error } = await supabaseAdmin
        .from('alerts')
        .delete()
        .eq('id', params.id)
        .or(
          filter.useTeam && filter.teamId
            ? `team_id.eq.${filter.teamId},user_id.eq.${user.id}`
            : `user_id.eq.${user.id}`
        );

      if (error) {
        if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
          return NextResponse.json(
            { error: 'Alerts table not yet configured. Please set up the database schema.' },
            { status: 503 }
          );
        }
        throw error;
      }

      return NextResponse.json({ success: true }, { status: 200 });
    } catch (dbError: any) {
      if (dbError.message?.includes('relation') || dbError.message?.includes('does not exist')) {
        return NextResponse.json(
          { error: 'Alerts table not yet configured. Please set up the database schema.' },
          { status: 503 }
        );
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Error deleting alert:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
