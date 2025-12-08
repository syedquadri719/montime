import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUserServer } from '@/lib/auth-server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUserServer();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    try {
      const { data: group, error } = await supabaseAdmin
        .from('groups')
        .select('*')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        if (error.message?.includes('relation "public.groups" does not exist')) {
          return NextResponse.json({
            error: 'Groups table not yet configured.'
          }, { status: 503 });
        }
        throw error;
      }

      if (!group) {
        return NextResponse.json({ error: 'Group not found' }, { status: 404 });
      }

      return NextResponse.json({ data: group }, { status: 200 });
    } catch (dbError: any) {
      if (dbError.message?.includes('relation') || dbError.message?.includes('does not exist')) {
        return NextResponse.json({
          error: 'Groups table not yet configured.'
        }, { status: 503 });
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Error fetching group:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUserServer();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, color } = body;

    const supabaseAdmin = getSupabaseAdmin();

    try {
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (color !== undefined) updates.color = color;
      updates.updated_at = new Date().toISOString();

      const { data: group, error } = await supabaseAdmin
        .from('groups')
        .update(updates)
        .eq('id', params.id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        if (error.message?.includes('relation "public.groups" does not exist')) {
          return NextResponse.json({
            error: 'Groups table not yet configured.'
          }, { status: 503 });
        }
        throw error;
      }

      return NextResponse.json({ data: group }, { status: 200 });
    } catch (dbError: any) {
      if (dbError.message?.includes('relation') || dbError.message?.includes('does not exist')) {
        return NextResponse.json({
          error: 'Groups table not yet configured.'
        }, { status: 503 });
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Error updating group:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUserServer();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    try {
      const { error } = await supabaseAdmin
        .from('groups')
        .delete()
        .eq('id', params.id)
        .eq('user_id', user.id);

      if (error) {
        if (error.message?.includes('relation "public.groups" does not exist')) {
          return NextResponse.json({
            error: 'Groups table not yet configured.'
          }, { status: 503 });
        }
        throw error;
      }

      return NextResponse.json({ success: true }, { status: 200 });
    } catch (dbError: any) {
      if (dbError.message?.includes('relation') || dbError.message?.includes('does not exist')) {
        return NextResponse.json({
          error: 'Groups table not yet configured.'
        }, { status: 503 });
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Error deleting group:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
