import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const supabaseAdmin = getSupabaseAdmin();

    try {
      const { data: monitor } = await supabaseAdmin
        .from('monitors')
        .select('id')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!monitor) {
        return NextResponse.json({ error: 'Monitor not found' }, { status: 404 });
      }

      const { data: incidents, error } = await supabaseAdmin
        .from('monitor_incidents')
        .select('*')
        .eq('monitor_id', params.id)
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error) {
        if (error.message?.includes('relation "public.monitor_incidents" does not exist')) {
          return NextResponse.json({
            incidents: [],
            message: 'Monitor incidents table not yet configured'
          }, { status: 200 });
        }
        throw error;
      }

      return NextResponse.json({ incidents: incidents || [] }, { status: 200 });
    } catch (dbError: any) {
      if (dbError.message?.includes('relation') || dbError.message?.includes('does not exist')) {
        return NextResponse.json({
          incidents: [],
          message: 'Monitor incidents table not yet configured'
        }, { status: 200 });
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Error fetching monitor incidents:', error);
    return NextResponse.json({ error: 'Failed to fetch incidents' }, { status: 500 });
  }
}
