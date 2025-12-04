import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUser } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: servers, error } = await supabaseAdmin
      .from('servers')
      .select('id, name, api_key, status, last_seen_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

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
          token: server.api_key,
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

    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: 'Server name is required' }, { status: 400 });
    }

    console.log('POST /api/servers - Creating server with name:', name);

    const supabaseAdmin = getSupabaseAdmin();
    const { data: server, error } = await supabaseAdmin
      .from('servers')
      .insert({
        user_id: user.id,
        name,
        hostname: name,
        status: 'offline'
      })
      .select('id, name, api_key, status, created_at')
      .single();

    if (error) {
      console.error('Error creating server in database:', error);
      return NextResponse.json({
        error: `Failed to create server: ${error.message}`
      }, { status: 500 });
    }

    console.log('POST /api/servers - Server created successfully:', server.id);

    return NextResponse.json({
      server: {
        ...(server as any),
        token: (server as any).api_key
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/servers:', error);
    return NextResponse.json({
      error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}
