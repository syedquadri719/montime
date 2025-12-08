import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserServer } from '@/lib/auth-server';
import { sendNotification, Alert, AlertSettings } from '@/lib/alerts';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserServer();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { settings, channel } = body;

    if (!settings || !channel) {
      return NextResponse.json(
        { error: 'Settings and channel are required' },
        { status: 400 }
      );
    }

    const testAlert: Alert = {
      id: 'test-alert',
      server_id: 'test-server',
      user_id: user.id,
      type: 'cpu_high',
      message: 'This is a test alert from MonTime. Your notification channel is configured correctly!',
      severity: 'warning',
      current_value: 87.5,
      threshold_value: 85,
      acknowledged: false,
      resolved: false,
      created_at: new Date().toISOString(),
      servers: {
        id: 'test-server',
        name: 'Test Server'
      }
    };

    const testSettings: AlertSettings = {
      ...settings,
      notification_channels: [channel]
    };

    try {
      await sendNotification(testAlert, testSettings, 'Test Server');

      return NextResponse.json({
        success: true,
        message: `Test notification sent successfully via ${channel}`
      }, { status: 200 });
    } catch (error: any) {
      console.error('Test notification failed:', error);
      return NextResponse.json({
        success: false,
        error: error.message || 'Failed to send test notification'
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error testing notification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
