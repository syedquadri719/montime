import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const supabaseAdmin = getSupabaseAdmin();

    const { data: server, error: serverError } = await supabaseAdmin
      .from('servers')
      .select('id, user_id')
      .eq('api_key', token)
      .maybeSingle();

    if (serverError || !server) {
      return NextResponse.json({ error: 'Invalid server token' }, { status: 401 });
    }

    const body = await request.json();
    const { cpu, memory, disk } = body;

    if (cpu === undefined || memory === undefined || disk === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: cpu, memory, disk' },
        { status: 400 }
      );
    }

    let status = 'online';
    if (cpu > 90 || memory > 90 || disk > 90) {
      status = 'critical';
    } else if (cpu > 75 || memory > 75 || disk > 75) {
      status = 'warning';
    }

    const { error: metricsError } = await supabaseAdmin.from('metrics').insert({ server_id: server.id, cpu: parseFloat(cpu), memory: parseFloat(memory), disk: parseFloat(disk), status });

    if (metricsError) {
      console.error('Error inserting metrics:', metricsError);
      return NextResponse.json({ error: 'Failed to store metrics' }, { status: 500 });
    }

    await supabaseAdmin.from('servers').update({ status, last_seen_at: new Date().toISOString() }).eq('id', server.id);

    if (status === 'critical') {
      let alertType = 'cpu';
      let currentValue = cpu;

      if (memory > cpu && memory > disk) {
        alertType = 'memory';
        currentValue = memory;
      } else if (disk > cpu && disk > memory) {
        alertType = 'disk';
        currentValue = disk;
      }

      await supabaseAdmin.from('alerts').insert({ server_id: server.id, user_id: server.user_id, type: alertType, message: `${alertType.toUpperCase()} usage is critically high at ${currentValue.toFixed(1)}%`, severity: 'critical' });
    }

    return NextResponse.json({
      success: true,
      status,
      message: 'Metrics recorded successfully'
    }, { status: 200 });
  } catch (error) {
    console.error('Error processing metrics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
