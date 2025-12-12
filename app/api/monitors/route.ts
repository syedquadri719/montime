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

    const supabaseAdmin = getSupabaseAdmin();

    try {
      const { data: monitors, error } = await supabaseAdmin
        .from('monitors')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.message?.includes('relation "public.monitors" does not exist')) {
          return NextResponse.json({
            monitors: [],
            message: 'Monitors table not yet configured'
          }, { status: 200 });
        }
        throw error;
      }

      return NextResponse.json({ monitors: monitors || [] }, { status: 200 });
    } catch (dbError: any) {
      if (dbError.message?.includes('relation') || dbError.message?.includes('does not exist')) {
        return NextResponse.json({
          monitors: [],
          message: 'Monitors table not yet configured'
        }, { status: 200 });
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Error fetching monitors:', error);
    return NextResponse.json({ error: 'Failed to fetch monitors' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, url, interval, timeout, expected_status, expected_keyword, port, enabled } = body;

    if (!name || !type || !url || !interval) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    try {
      const monitorData: any = {
        user_id: user.id,
        name,
        type,
        url,
        interval,
        timeout: timeout || 30,
        enabled: enabled !== undefined ? enabled : true,
        status: 'unknown'
      };

      if (expected_status !== undefined) monitorData.expected_status = expected_status;
      if (expected_keyword) monitorData.expected_keyword = expected_keyword;
      if (port !== undefined) monitorData.port = port;

      const { data: monitor, error } = await supabaseAdmin
        .from('monitors')
        .insert(monitorData)
        .select()
        .single();

      if (error) {
        if (error.message?.includes('relation "public.monitors" does not exist')) {
          return NextResponse.json({
            error: 'Monitors table not yet configured. Please create the database tables first.'
          }, { status: 503 });
        }
        throw error;
      }

      return NextResponse.json({ monitor }, { status: 201 });
    } catch (dbError: any) {
      if (dbError.message?.includes('relation') || dbError.message?.includes('does not exist')) {
        return NextResponse.json({
          error: 'Monitors table not yet configured. Please create the database tables first.'
        }, { status: 503 });
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Error creating monitor:', error);
    return NextResponse.json({ error: 'Failed to create monitor' }, { status: 500 });
  }
}
