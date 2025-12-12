import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    try {
      const { data: monitor, error } = await supabaseAdmin
        .from('monitors')
        .select('id, name, type, url, status, last_checked_at, last_response_time, created_at')
        .eq('id', params.id)
        .maybeSingle();

      if (error) {
        if (error.message?.includes('relation "public.monitors" does not exist')) {
          return NextResponse.json({
            error: 'Monitors not configured'
          }, { status: 503 });
        }
        throw error;
      }

      if (!monitor) {
        return NextResponse.json({ error: 'Monitor not found' }, { status: 404 });
      }

      const { data: checks } = await supabaseAdmin
        .from('monitor_checks')
        .select('success, response_time, created_at')
        .eq('monitor_id', params.id)
        .order('created_at', { ascending: false })
        .limit(100);

      const { data: incidents } = await supabaseAdmin
        .from('monitor_incidents')
        .select('started_at, resolved_at, duration, status, message')
        .eq('monitor_id', params.id)
        .order('started_at', { ascending: false })
        .limit(30);

      const checksData = checks || [];
      const successfulChecks = checksData.filter(c => c.success).length;
      const uptimePercentage = checksData.length > 0
        ? ((successfulChecks / checksData.length) * 100).toFixed(2)
        : '0.00';

      return NextResponse.json({
        monitor,
        checks: checksData,
        incidents: incidents || [],
        stats: {
          uptimePercentage,
          totalChecks: checksData.length,
          successfulChecks
        }
      }, { status: 200 });
    } catch (dbError: any) {
      if (dbError.message?.includes('relation') || dbError.message?.includes('does not exist')) {
        return NextResponse.json({
          error: 'Monitors not configured'
        }, { status: 503 });
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Error fetching public monitor data:', error);
    return NextResponse.json({ error: 'Failed to fetch monitor' }, { status: 500 });
  }
}
