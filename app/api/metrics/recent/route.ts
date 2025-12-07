import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const serverId = url.searchParams.get('serverId');
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    if (!serverId) {
      return NextResponse.json({ error: 'serverId is required' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: server } = await supabaseAdmin
      .from('servers')
      .select('id')
      .eq('id', serverId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }

    const { data: metrics, error } = await supabaseAdmin
      .from('metrics')
      .select('id, cpu_usage, memory_usage, disk_usage, timestamp, created_at')
      .eq('server_id', serverId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return NextResponse.json({ metrics: metrics || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}
