import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUserServer } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserServer();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    try {
      const { data: groups, error } = await supabaseAdmin
        .from('groups')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.message?.includes('relation "public.groups" does not exist')) {
          return NextResponse.json({
            data: [],
            message: 'Groups table not yet configured. Please set up the database schema.'
          }, { status: 200 });
        }
        throw error;
      }

      return NextResponse.json({ data: groups || [] }, { status: 200 });
    } catch (dbError: any) {
      if (dbError.message?.includes('relation') || dbError.message?.includes('does not exist')) {
        return NextResponse.json({
          data: [],
          message: 'Groups table not yet configured.'
        }, { status: 200 });
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Error fetching groups:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserServer();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, color } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    try {
      const { data: group, error } = await supabaseAdmin
        .from('groups')
        .insert({
          user_id: user.id,
          name,
          description: description || null,
          color: color || '#3B82F6'
        })
        .select()
        .single();

      if (error) {
        if (error.message?.includes('relation "public.groups" does not exist')) {
          return NextResponse.json({
            error: 'Groups table not yet configured. Please set up the database schema.'
          }, { status: 503 });
        }
        throw error;
      }

      return NextResponse.json({ data: group }, { status: 201 });
    } catch (dbError: any) {
      if (dbError.message?.includes('relation') || dbError.message?.includes('does not exist')) {
        return NextResponse.json({
          error: 'Groups table not yet configured. Please set up the database schema.'
        }, { status: 503 });
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Error creating group:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
