import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserServer } from '@/lib/auth-server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getResourceFilter } from '@/lib/team';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserServer();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const filter = await getResourceFilter(user.id);
    const supabaseAdmin = getSupabaseAdmin();

    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const severity = url.searchParams.get('severity');
    const serverId = url.searchParams.get('serverId');

    try {
      let query = supabaseAdmin
        .from('alerts')
        .select(`
          id,
          server_id,
          type,
          message,
          severity,
          current_value,
          threshold_value,
          acknowledged,
          acknowledged_at,
          acknowledged_by,
          resolved,
          resolved_at,
          resolved_by,
          created_at,
          servers (
            id,
            name
          )
        `);

      if (filter.useTeam && filter.teamId) {
        query = query.or(`team_id.eq.${filter.teamId},user_id.eq.${user.id}`);
      } else {
        query = query.eq('user_id', user.id);
      }

      if (status === 'active') {
        query = query.eq('resolved', false);
      } else if (status === 'resolved') {
        query = query.eq('resolved', true);
      }

      if (severity) {
        query = query.eq('severity', severity);
      }

      if (serverId) {
        query = query.eq('server_id', serverId);
      }

      const { data: alerts, error } = await query
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Database error fetching alerts:', error);

        if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
          return NextResponse.json({
            alerts: [],
            message: 'Alerts table not yet configured. Please set up the database schema.'
          }, { status: 200 });
        }

        if (error.message?.includes('column') && error.message?.includes('does not exist')) {
          console.error('Column missing in alerts table. Check schema:', error.message);
          return NextResponse.json({
            alerts: [],
            message: 'Alerts table schema needs updating. Please check the database setup.',
            details: error.message
          }, { status: 200 });
        }

        if (error.code === 'PGRST116') {
          console.error('RLS policy or permission issue:', error);
          return NextResponse.json({
            alerts: [],
            message: 'Unable to access alerts. Check database permissions.'
          }, { status: 200 });
        }

        throw error;
      }

      return NextResponse.json({ alerts: alerts || [] }, { status: 200 });
    } catch (dbError: any) {
      console.error('Caught database error:', dbError);

      if (dbError.message?.includes('relation') || dbError.message?.includes('does not exist')) {
        return NextResponse.json({
          alerts: [],
          message: 'Alerts table not yet configured.'
        }, { status: 200 });
      }

      throw dbError;
    }
  } catch (error: any) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error?.message || 'Unknown error'
    }, { status: 500 });
  }
}
