import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUserServer } from '@/lib/auth-server';

export async function GET(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const user = await getCurrentUserServer();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const supabaseAdmin = getSupabaseAdmin();

    try {
      const { data: group, error: groupError } = await supabaseAdmin
        .from('groups')
        .select('id, name')
        .eq('id', params.groupId)
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

      const { data: serverGroups, error: sgError } = await supabaseAdmin
        .from('server_groups')
        .select('server_id')
        .eq('group_id', params.groupId)
        .eq('user_id', user.id);

      if (sgError) {
        if (sgError.message?.includes('relation "public.server_groups" does not exist')) {
          return NextResponse.json({
            data: {
              group,
              servers: [],
              metrics: [],
              aggregated: { avg_cpu: 0, avg_memory: 0, avg_disk: 0 }
            }
          }, { status: 200 });
        }
        throw sgError;
      }

      const serverIds = (serverGroups || []).map(sg => sg.server_id);

      if (serverIds.length === 0) {
        return NextResponse.json({
          data: {
            group,
            servers: [],
            metrics: [],
            aggregated: { avg_cpu: 0, avg_memory: 0, avg_disk: 0 }
          }
        }, { status: 200 });
      }

      const { data: servers } = await supabaseAdmin
        .from('servers')
        .select('id, name, status')
        .in('id', serverIds);

      const metricsPromises = serverIds.map(serverId =>
        supabaseAdmin
          .from('metrics')
          .select('id, server_id, cpu_usage, memory_usage, disk_usage, timestamp, created_at')
          .eq('server_id', serverId)
          .order('created_at', { ascending: false })
          .limit(limit)
      );

      const metricsResults = await Promise.all(metricsPromises);
      const allMetrics = metricsResults.flatMap(result => result.data || []);

      const latestMetrics = serverIds.map(serverId => {
        const serverMetrics = allMetrics.filter(m => m.server_id === serverId);
        return serverMetrics[0] || null;
      }).filter(Boolean);

      const avg_cpu = latestMetrics.length > 0
        ? latestMetrics.reduce((sum, m) => sum + (m.cpu_usage || 0), 0) / latestMetrics.length
        : 0;

      const avg_memory = latestMetrics.length > 0
        ? latestMetrics.reduce((sum, m) => sum + (m.memory_usage || 0), 0) / latestMetrics.length
        : 0;

      const avg_disk = latestMetrics.length > 0
        ? latestMetrics.reduce((sum, m) => sum + (m.disk_usage || 0), 0) / latestMetrics.length
        : 0;

      return NextResponse.json({
        data: {
          group,
          servers: servers || [],
          metrics: allMetrics,
          aggregated: {
            avg_cpu: parseFloat(avg_cpu.toFixed(2)),
            avg_memory: parseFloat(avg_memory.toFixed(2)),
            avg_disk: parseFloat(avg_disk.toFixed(2)),
            server_count: serverIds.length
          }
        }
      }, { status: 200 });
    } catch (dbError: any) {
      if (dbError.message?.includes('relation') || dbError.message?.includes('does not exist')) {
        return NextResponse.json({
          error: 'Groups tables not yet configured.'
        }, { status: 503 });
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Error fetching group metrics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
