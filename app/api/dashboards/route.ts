import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUserServer } from '@/lib/auth-server';
import { getResourceFilter } from '@/lib/team';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserServer();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const filter = await getResourceFilter(user.id);
    const supabaseAdmin = getSupabaseAdmin();

    try {
      let query = supabaseAdmin
        .from('dashboards')
        .select('*');

      if (filter.useTeam && filter.teamId) {
        query = query.eq('team_id', filter.teamId);
      } else {
        query = query.eq('user_id', user.id);
      }

      const { data: dashboards, error } = await query.order('created_at', { ascending: false });

      if (error) {
        if (error.message?.includes('relation "public.dashboards" does not exist')) {
          return NextResponse.json({
            data: [],
            message: 'Dashboards table not yet configured. Please set up the database schema.'
          }, { status: 200 });
        }
        throw error;
      }

      return NextResponse.json({ data: dashboards || [] }, { status: 200 });
    } catch (dbError: any) {
      if (dbError.message?.includes('relation') || dbError.message?.includes('does not exist')) {
        return NextResponse.json({
          data: [],
          message: 'Dashboards table not yet configured.'
        }, { status: 200 });
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Error fetching dashboards:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserServer();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const filter = await getResourceFilter(user.id);
    const body = await request.json();
    const { name, description, group_id, layout } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    try {
      const insertData: any = {
        user_id: user.id,
        name,
        description: description || null,
        group_id: group_id || null,
        layout: layout || []
      };

      if (filter.useTeam && filter.teamId) {
        insertData.team_id = filter.teamId;
      }

      const { data: dashboard, error } = await supabaseAdmin
        .from('dashboards')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        if (error.message?.includes('relation "public.dashboards" does not exist')) {
          return NextResponse.json({
            error: 'Dashboards table not yet configured. Please set up the database schema.'
          }, { status: 503 });
        }
        throw error;
      }

      return NextResponse.json({ data: dashboard }, { status: 201 });
    } catch (dbError: any) {
      if (dbError.message?.includes('relation') || dbError.message?.includes('does not exist')) {
        return NextResponse.json({
          error: 'Dashboards table not yet configured. Please set up the database schema.'
        }, { status: 503 });
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Error creating dashboard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
