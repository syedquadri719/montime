import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserServer } from '@/lib/auth-server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getResourceFilter, hasPermission } from '@/lib/team';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserServer();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const filter = await getResourceFilter(user.id);
    const supabaseAdmin = getSupabaseAdmin();

    const url = new URL(request.url);
    const serverId = url.searchParams.get('serverId');
    const groupId = url.searchParams.get('groupId');

    try {
      let query = supabaseAdmin
        .from('alert_settings')
        .select('*');

      if (serverId) {
        query = query.eq('server_id', serverId);
      } else if (groupId) {
        query = query.eq('group_id', groupId);
      }

      if (filter.useTeam && filter.teamId) {
        query = query.eq('team_id', filter.teamId);
      } else {
        query = query.eq('user_id', user.id);
      }

      const { data: settings, error } = await query.maybeSingle();

      if (error) {
        if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
          return NextResponse.json({
            settings: null,
            message: 'Alert settings table not yet configured. Please set up the database schema.'
          }, { status: 200 });
        }
        throw error;
      }

      return NextResponse.json({ settings: settings || null }, { status: 200 });
    } catch (dbError: any) {
      if (dbError.message?.includes('relation') || dbError.message?.includes('does not exist')) {
        return NextResponse.json({
          settings: null,
          message: 'Alert settings table not yet configured.'
        }, { status: 200 });
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Error fetching alert settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserServer();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const filter = await getResourceFilter(user.id);

    if (!hasPermission(filter.role, 'edit')) {
      return NextResponse.json(
        { error: 'You do not have permission to create alert settings' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      server_id,
      group_id,
      enabled,
      cpu_threshold,
      memory_threshold,
      disk_threshold,
      down_threshold_seconds,
      notification_channels,
      email_recipients,
      slack_webhook_url,
      webhook_url,
      webhook_headers
    } = body;

    if (!server_id && !group_id) {
      return NextResponse.json(
        { error: 'Either server_id or group_id is required' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    try {
      const insertData: any = {
        user_id: user.id,
        enabled: enabled !== undefined ? enabled : true,
        cpu_threshold: cpu_threshold || 85,
        memory_threshold: memory_threshold || 80,
        disk_threshold: disk_threshold || 90,
        down_threshold_seconds: down_threshold_seconds || 120,
        notification_channels: notification_channels || ['email']
      };

      if (server_id) {
        insertData.server_id = server_id;
      } else if (group_id) {
        insertData.group_id = group_id;
      }

      if (filter.useTeam && filter.teamId) {
        insertData.team_id = filter.teamId;
      }

      if (email_recipients) {
        insertData.email_recipients = email_recipients;
      }

      if (slack_webhook_url) {
        insertData.slack_webhook_url = slack_webhook_url;
      }

      if (webhook_url) {
        insertData.webhook_url = webhook_url;
      }

      if (webhook_headers) {
        insertData.webhook_headers = webhook_headers;
      }

      const { data: settings, error } = await supabaseAdmin
        .from('alert_settings')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
          return NextResponse.json({
            error: 'Alert settings table not yet configured. Please set up the database schema.'
          }, { status: 503 });
        }
        throw error;
      }

      return NextResponse.json({ settings }, { status: 201 });
    } catch (dbError: any) {
      if (dbError.message?.includes('relation') || dbError.message?.includes('does not exist')) {
        return NextResponse.json({
          error: 'Alert settings table not yet configured. Please set up the database schema.'
        }, { status: 503 });
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Error creating alert settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUserServer();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const filter = await getResourceFilter(user.id);

    if (!hasPermission(filter.role, 'edit')) {
      return NextResponse.json(
        { error: 'You do not have permission to update alert settings' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      id,
      enabled,
      cpu_threshold,
      memory_threshold,
      disk_threshold,
      down_threshold_seconds,
      notification_channels,
      email_recipients,
      slack_webhook_url,
      webhook_url,
      webhook_headers
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Settings ID is required' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (enabled !== undefined) updateData.enabled = enabled;
      if (cpu_threshold !== undefined) updateData.cpu_threshold = cpu_threshold;
      if (memory_threshold !== undefined) updateData.memory_threshold = memory_threshold;
      if (disk_threshold !== undefined) updateData.disk_threshold = disk_threshold;
      if (down_threshold_seconds !== undefined) updateData.down_threshold_seconds = down_threshold_seconds;
      if (notification_channels !== undefined) updateData.notification_channels = notification_channels;
      if (email_recipients !== undefined) updateData.email_recipients = email_recipients;
      if (slack_webhook_url !== undefined) updateData.slack_webhook_url = slack_webhook_url;
      if (webhook_url !== undefined) updateData.webhook_url = webhook_url;
      if (webhook_headers !== undefined) updateData.webhook_headers = webhook_headers;

      let query = supabaseAdmin
        .from('alert_settings')
        .update(updateData)
        .eq('id', id);

      if (filter.useTeam && filter.teamId) {
        query = query.eq('team_id', filter.teamId);
      } else {
        query = query.eq('user_id', user.id);
      }

      const { data: settings, error } = await query.select().maybeSingle();

      if (error) {
        if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
          return NextResponse.json({
            error: 'Alert settings table not yet configured. Please set up the database schema.'
          }, { status: 503 });
        }
        throw error;
      }

      if (!settings) {
        return NextResponse.json(
          { error: 'Settings not found or you do not have permission to update them' },
          { status: 404 }
        );
      }

      return NextResponse.json({ settings }, { status: 200 });
    } catch (dbError: any) {
      if (dbError.message?.includes('relation') || dbError.message?.includes('does not exist')) {
        return NextResponse.json({
          error: 'Alert settings table not yet configured. Please set up the database schema.'
        }, { status: 503 });
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Error updating alert settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
