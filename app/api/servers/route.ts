import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUser } from '@/lib/auth-server';
import { getResourceFilter, hasPermission } from '@/lib/team';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const filter = await getResourceFilter(user.id);
    const supabaseAdmin = getSupabaseAdmin();

    let query = supabaseAdmin
      .from('servers')
      .select('id, name, api_key, status, last_seen_at, created_at');

    if (filter.useTeam && filter.teamId) {
      query = query.eq('team_id', filter.teamId);
    } else {
      query = query.eq('user_id', user.id);
    }

    const { data: servers, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching servers:', error);
      return NextResponse.json({ error: 'Failed to fetch servers' }, { status: 500 });
    }

    const serversWithLatestMetric = await Promise.all(
      (servers || []).map(async (server: any) => {
        const { data: latestMetric } = await supabaseAdmin
          .from('metrics')
          .select('cpu, memory, disk, status, created_at')
          .eq('server_id', server.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        return {
          ...server,
          latestMetric
        };
      })
    );

    return NextResponse.json({ servers: serversWithLatestMetric }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/servers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      console.error('POST /api/servers - No user found in session');
      return NextResponse.json({ error: 'Unauthorized - Please log in again' }, { status: 401 });
    }

    console.log('POST /api/servers - User authenticated:', user.id);

    const filter = await getResourceFilter(user.id);

    if (!hasPermission(filter.role, 'edit')) {
      return NextResponse.json(
        { error: 'You do not have permission to create servers' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: 'Server name is required' }, { status: 400 });
    }

    console.log('POST /api/servers - Creating server with name:', name);

    const supabaseAdmin = getSupabaseAdmin();

    console.log('POST /api/servers - Supabase admin client initialized');

    const { data: testData, error: testError } = await supabaseAdmin
      .from('servers')
      .select('id')
      .limit(1);

    console.log('POST /api/servers - Test query result:', {
      hasData: !!testData,
      hasError: !!testError,
      error: testError
    });

    if (testError) {
      console.error('POST /api/servers - Connection test failed:', testError);
    }

    const insertData: any = {
      user_id: user.id,
      name,
      hostname: name,
      status: 'offline'
    };

    if (filter.useTeam && filter.teamId) {
      insertData.team_id = filter.teamId;
    }

    const { data: insertedServer, error: insertError } = await supabaseAdmin
      .from('servers')
      .insert(insertData)
      .select('id')
      .single();

    if (insertError) {
      console.error('Error creating server in database:', {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code,
        fullError: JSON.stringify(insertError, null, 2)
      });
      return NextResponse.json({
        error: `Failed to create server: ${insertError.message}`,
        details: insertError.details,
        code: insertError.code
      }, { status: 500 });
    }

    const { data: server, error } = await supabaseAdmin
      .from('servers')
      .select('id, name, api_key, status, created_at')
      .eq('id', insertedServer.id)
      .single();

    if (error) {
      console.error('Error fetching created server:', error);
      return NextResponse.json({
        error: `Server created but failed to fetch details: ${error.message}`
      }, { status: 500 });
    }

    console.log('POST /api/servers - Server created successfully:', server.id);

    return NextResponse.json({
      server: server as any
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/servers:', error);
    return NextResponse.json({
      error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}
