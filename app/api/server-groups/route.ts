import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUserServer } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserServer();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { server_id, group_id, action } = body;

    if (!server_id || !action) {
      return NextResponse.json(
        { error: 'server_id and action are required' },
        { status: 400 }
      );
    }

    if (action !== 'assign' && action !== 'remove') {
      return NextResponse.json(
        { error: 'action must be "assign" or "remove"' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: server, error: serverError } = await supabaseAdmin
      .from('servers')
      .select('id, user_id')
      .eq('id', server_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (serverError || !server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }

    try {
      if (action === 'assign') {
        if (!group_id) {
          return NextResponse.json(
            { error: 'group_id is required for assign action' },
            { status: 400 }
          );
        }

        const { data: group, error: groupError } = await supabaseAdmin
          .from('groups')
          .select('id, user_id')
          .eq('id', group_id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (groupError) {
          if (groupError.message?.includes('relation "public.groups" does not exist')) {
            return NextResponse.json({
              error: 'Groups table not yet configured.'
            }, { status: 503 });
          }
          throw groupError;
        }

        if (!group) {
          return NextResponse.json({ error: 'Group not found' }, { status: 404 });
        }

        const { data: assignment, error: assignError } = await supabaseAdmin
          .from('server_groups')
          .upsert({
            server_id,
            group_id,
            user_id: user.id
          })
          .select()
          .single();

        if (assignError) {
          if (assignError.message?.includes('relation "public.server_groups" does not exist')) {
            return NextResponse.json({
              error: 'Server groups table not yet configured.'
            }, { status: 503 });
          }
          throw assignError;
        }

        return NextResponse.json({ data: assignment }, { status: 200 });
      } else {
        const { error: removeError } = await supabaseAdmin
          .from('server_groups')
          .delete()
          .eq('server_id', server_id)
          .eq('user_id', user.id);

        if (removeError) {
          if (removeError.message?.includes('relation "public.server_groups" does not exist')) {
            return NextResponse.json({
              error: 'Server groups table not yet configured.'
            }, { status: 503 });
          }
          throw removeError;
        }

        return NextResponse.json({ success: true }, { status: 200 });
      }
    } catch (dbError: any) {
      if (dbError.message?.includes('relation') || dbError.message?.includes('does not exist')) {
        return NextResponse.json({
          error: 'Groups tables not yet configured.'
        }, { status: 503 });
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Error managing server-group assignment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserServer();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const serverId = searchParams.get('server_id');
    const groupId = searchParams.get('group_id');

    const supabaseAdmin = getSupabaseAdmin();

    try {
      let query = supabaseAdmin
        .from('server_groups')
        .select('*, servers(*), groups(*)')
        .eq('user_id', user.id);

      if (serverId) {
        query = query.eq('server_id', serverId);
      }

      if (groupId) {
        query = query.eq('group_id', groupId);
      }

      const { data: assignments, error } = await query;

      if (error) {
        if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
          return NextResponse.json({
            data: [],
            message: 'Server groups table not yet configured.'
          }, { status: 200 });
        }
        throw error;
      }

      return NextResponse.json({ data: assignments || [] }, { status: 200 });
    } catch (dbError: any) {
      if (dbError.message?.includes('relation') || dbError.message?.includes('does not exist')) {
        return NextResponse.json({
          data: [],
          message: 'Server groups table not yet configured.'
        }, { status: 200 });
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Error fetching server-group assignments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
