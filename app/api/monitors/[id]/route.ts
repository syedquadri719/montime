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

    const supabaseAdmin = getSupabaseAdmin();

    try {
      const { data: monitor, error } = await supabaseAdmin
        .from('monitors')
        .select('*')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        if (error.message?.includes('relation "public.monitors" does not exist')) {
          return NextResponse.json({
            error: 'Monitors table not yet configured'
          }, { status: 503 });
        }
        throw error;
      }

      if (!monitor) {
        return NextResponse.json({ error: 'Monitor not found' }, { status: 404 });
      }

      return NextResponse.json({ monitor }, { status: 200 });
    } catch (dbError: any) {
      if (dbError.message?.includes('relation') || dbError.message?.includes('does not exist')) {
        return NextResponse.json({
          error: 'Monitors table not yet configured'
        }, { status: 503 });
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Error fetching monitor:', error);
    return NextResponse.json({ error: 'Failed to fetch monitor' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const supabaseAdmin = getSupabaseAdmin();

    try {
      const { data: monitor, error } = await supabaseAdmin
        .from('monitors')
        .update(body)
        .eq('id', params.id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        if (error.message?.includes('relation "public.monitors" does not exist')) {
          return NextResponse.json({
            error: 'Monitors table not yet configured'
          }, { status: 503 });
        }
        throw error;
      }

      return NextResponse.json({ monitor }, { status: 200 });
    } catch (dbError: any) {
      if (dbError.message?.includes('relation') || dbError.message?.includes('does not exist')) {
        return NextResponse.json({
          error: 'Monitors table not yet configured'
        }, { status: 503 });
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Error updating monitor:', error);
    return NextResponse.json({ error: 'Failed to update monitor' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    try {
      const { error } = await supabaseAdmin
        .from('monitors')
        .delete()
        .eq('id', params.id)
        .eq('user_id', user.id);

      if (error) {
        if (error.message?.includes('relation "public.monitors" does not exist')) {
          return NextResponse.json({
            error: 'Monitors table not yet configured'
          }, { status: 503 });
        }
        throw error;
      }

      return NextResponse.json({ success: true }, { status: 200 });
    } catch (dbError: any) {
      if (dbError.message?.includes('relation') || dbError.message?.includes('does not exist')) {
        return NextResponse.json({
          error: 'Monitors table not yet configured'
        }, { status: 503 });
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Error deleting monitor:', error);
    return NextResponse.json({ error: 'Failed to delete monitor' }, { status: 500 });
  }
}
