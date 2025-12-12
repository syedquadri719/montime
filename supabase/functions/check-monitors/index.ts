import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: monitors, error: monitorsError } = await supabase
      .from('monitors')
      .select('*')
      .eq('enabled', true);

    if (monitorsError) {
      if (monitorsError.message?.includes('does not exist')) {
        return new Response(
          JSON.stringify({ error: 'Monitors table not configured' }),
          {
            status: 503,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            }
          }
        );
      }
      throw monitorsError;
    }

    const results = [];

    for (const monitor of monitors || []) {
      const now = Date.now();
      const lastChecked = monitor.last_checked_at ? new Date(monitor.last_checked_at).getTime() : 0;
      const minutesSinceLastCheck = (now - lastChecked) / 1000 / 60;

      if (minutesSinceLastCheck < monitor.interval) {
        continue;
      }

      let checkResult;

      switch (monitor.type) {
        case 'http':
        case 'https':
        case 'keyword':
        case 'ssl':
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

      await supabase
        .from('monitor_checks')
        .insert(checkData);

      const newStatus = checkResult.success ? 'up' : 'down';
      const oldStatus = monitor.status;

      await supabase
        .from('monitors')
        .update({
          status: newStatus,
          last_checked_at: new Date().toISOString(),
          last_response_time: checkResult.responseTime
        })
        .eq('id', monitor.id);

      if (oldStatus === 'up' && newStatus === 'down') {
        await supabase
          .from('monitor_incidents')
          .insert({
            monitor_id: monitor.id,
            user_id: monitor.user_id,
            started_at: new Date().toISOString(),
            status: 'open',
            message: checkResult.message
          });

        await supabase
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
        const { data: openIncident } = await supabase
          .from('monitor_incidents')
          .select('*')
          .eq('monitor_id', monitor.id)
          .eq('status', 'open')
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (openIncident) {
          const duration = Math.floor((Date.now() - new Date(openIncident.started_at).getTime()) / 1000);
          await supabase
            .from('monitor_incidents')
            .update({
              resolved_at: new Date().toISOString(),
              status: 'resolved',
              duration
            })
            .eq('id', openIncident.id);
        }

        await supabase
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

    const result = {
      success: true,
      checked: results.length,
      results,
      timestamp: new Date().toISOString()
    };

    console.log('Monitor checks complete:', result);

    return new Response(
      JSON.stringify(result),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        }
      }
    );
  } catch (error) {
    console.error('Error checking monitors:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        }
      }
    );
  }
});
