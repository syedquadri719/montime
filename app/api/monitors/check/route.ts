import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

async function performHttpCheck(url: string, timeout: number, expectedStatus?: number, expectedKeyword?: string) {
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout * 1000);

    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow'
    });

    clearTimeout(timeoutId);

    const responseTime = Date.now() - startTime;
    const body = await response.text();

    let success = true;
    let message = `HTTP ${response.status}`;

    if (expectedStatus !== undefined && response.status !== expectedStatus) {
      success = false;
      message = `Expected status ${expectedStatus}, got ${response.status}`;
    }

    if (success && expectedKeyword) {
      if (!body.includes(expectedKeyword)) {
        success = false;
        message = `Keyword "${expectedKeyword}" not found in response`;
      }
    }

    return {
      success,
      responseTime,
      statusCode: response.status,
      message
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    return {
      success: false,
      responseTime,
      statusCode: null,
      message: error.name === 'AbortError' ? 'Request timeout' : error.message
    };
  }
}

async function performPingCheck(host: string, timeout: number) {
  const startTime = Date.now();

  try {
    const url = host.startsWith('http') ? host : `http://${host}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout * 1000);

    await fetch(url, {
      method: 'HEAD',
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    return {
      success: true,
      responseTime,
      statusCode: null,
      message: 'Host is reachable'
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    return {
      success: false,
      responseTime,
      statusCode: null,
      message: error.name === 'AbortError' ? 'Request timeout' : 'Host unreachable'
    };
  }
}

async function performTcpCheck(host: string, port: number, timeout: number) {
  const startTime = Date.now();

  try {
    const url = `http://${host}:${port}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout * 1000);

    await fetch(url, {
      method: 'HEAD',
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    return {
      success: true,
      responseTime,
      statusCode: null,
      message: `Port ${port} is open`
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;

    if (error.name === 'AbortError') {
      return {
        success: false,
        responseTime,
        statusCode: null,
        message: 'Connection timeout'
      };
    }

    return {
      success: false,
      responseTime,
      statusCode: null,
      message: `Port ${port} is closed or filtered`
    };
  }
}

async function performSslCheck(url: string, timeout: number) {
  const startTime = Date.now();

  try {
    if (!url.startsWith('https://')) {
      return {
        success: false,
        responseTime: 0,
        statusCode: null,
        message: 'URL must use HTTPS for SSL check'
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout * 1000);

    const response = await fetch(url, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    return {
      success: response.ok,
      responseTime,
      statusCode: response.status,
      message: response.ok ? 'SSL certificate is valid' : 'SSL certificate issue'
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    return {
      success: false,
      responseTime,
      statusCode: null,
      message: error.message || 'SSL certificate error'
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = request.headers.get('x-cron-secret');

    if (!authHeader && cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { monitorId } = body;

    const supabaseAdmin = getSupabaseAdmin();

    try {
      let monitorsToCheck: any[] = [];

      if (monitorId) {
        const { data: monitor } = await supabaseAdmin
          .from('monitors')
          .select('*')
          .eq('id', monitorId)
          .eq('enabled', true)
          .maybeSingle();

        if (monitor) monitorsToCheck = [monitor];
      } else {
        const { data: monitors } = await supabaseAdmin
          .from('monitors')
          .select('*')
          .eq('enabled', true);

        monitorsToCheck = monitors || [];
      }

      const results = [];

      for (const monitor of monitorsToCheck) {
        let checkResult;

        switch (monitor.type) {
          case 'http':
          case 'https':
            checkResult = await performHttpCheck(
              monitor.url,
              monitor.timeout,
              monitor.expected_status,
              monitor.expected_keyword
            );
            break;
          case 'ping':
            checkResult = await performPingCheck(monitor.url, monitor.timeout);
            break;
          case 'tcp':
            checkResult = await performTcpCheck(monitor.url, monitor.port, monitor.timeout);
            break;
          case 'ssl':
            checkResult = await performSslCheck(monitor.url, monitor.timeout);
            break;
          default:
            continue;
        }

        const checkData: any = {
          monitor_id: monitor.id,
          success: checkResult.success,
          response_time: checkResult.responseTime,
          message: checkResult.message
        };

        if (checkResult.statusCode !== null) {
          checkData.status_code = checkResult.statusCode;
        }

        const { error: checkError } = await supabaseAdmin
          .from('monitor_checks')
          .insert(checkData);

        if (checkError && !checkError.message?.includes('does not exist')) {
          console.error('Error saving check:', checkError);
        }

        const newStatus = checkResult.success ? 'up' : 'down';
        const oldStatus = monitor.status;

        await supabaseAdmin
          .from('monitors')
          .update({
            status: newStatus,
            last_checked_at: new Date().toISOString(),
            last_response_time: checkResult.responseTime
          })
          .eq('id', monitor.id);

        if (oldStatus === 'up' && newStatus === 'down') {
          await supabaseAdmin
            .from('monitor_incidents')
            .insert({
              monitor_id: monitor.id,
              user_id: monitor.user_id,
              started_at: new Date().toISOString(),
              status: 'open',
              message: checkResult.message
            });

          await supabaseAdmin
            .from('alerts')
            .insert({
              server_id: null,
              user_id: monitor.user_id,
              type: 'monitor_down',
              severity: 'critical',
              message: `Monitor "${monitor.name}" is DOWN: ${checkResult.message}`,
              acknowledged: false,
              resolved: false
            });
        } else if (oldStatus === 'down' && newStatus === 'up') {
          const { data: openIncident } = await supabaseAdmin
            .from('monitor_incidents')
            .select('*')
            .eq('monitor_id', monitor.id)
            .eq('status', 'open')
            .order('started_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (openIncident) {
            await supabaseAdmin
              .from('monitor_incidents')
              .update({
                resolved_at: new Date().toISOString(),
                status: 'resolved',
                duration: Math.floor((Date.now() - new Date(openIncident.started_at).getTime()) / 1000)
              })
              .eq('id', openIncident.id);
          }

          await supabaseAdmin
            .from('alerts')
            .insert({
              server_id: null,
              user_id: monitor.user_id,
              type: 'monitor_up',
              severity: 'info',
              message: `Monitor "${monitor.name}" is back UP`,
              acknowledged: false,
              resolved: true
            });
        }

        results.push({
          monitorId: monitor.id,
          name: monitor.name,
          status: newStatus,
          checkResult
        });
      }

      return NextResponse.json({
        success: true,
        checked: results.length,
        results
      }, { status: 200 });
    } catch (dbError: any) {
      if (dbError.message?.includes('relation') || dbError.message?.includes('does not exist')) {
        return NextResponse.json({
          error: 'Monitor tables not yet configured'
        }, { status: 503 });
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Error performing monitor check:', error);
    return NextResponse.json({ error: 'Failed to perform check' }, { status: 500 });
  }
}
