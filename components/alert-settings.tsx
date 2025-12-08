'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bell, Mail, MessageSquare, Webhook, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AlertSettingsProps {
  serverId?: string;
  groupId?: string;
}

interface Settings {
  id?: string;
  enabled: boolean;
  cpu_threshold: number;
  memory_threshold: number;
  disk_threshold: number;
  down_threshold_seconds: number;
  notification_channels: string[];
  email_recipients: string[];
  slack_webhook_url: string;
  webhook_url: string;
  webhook_headers: Record<string, string>;
}

export function AlertSettings({ serverId, groupId }: AlertSettingsProps) {
  const [settings, setSettings] = useState<Settings>({
    enabled: true,
    cpu_threshold: 85,
    memory_threshold: 80,
    disk_threshold: 90,
    down_threshold_seconds: 120,
    notification_channels: ['email'],
    email_recipients: [],
    slack_webhook_url: '',
    webhook_url: '',
    webhook_headers: {}
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [featureAvailable, setFeatureAvailable] = useState(true);
  const [emailInput, setEmailInput] = useState('');
  const [testingChannel, setTestingChannel] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, [serverId, groupId]);

  const fetchSettings = async () => {
    try {
      const params = new URLSearchParams();
      if (serverId) params.append('serverId', serverId);
      if (groupId) params.append('groupId', groupId);

      const response = await fetch(`/api/alert-settings?${params}`);
      const data = await response.json();

      if (response.status === 503 || data.message?.includes('not yet configured')) {
        setFeatureAvailable(false);
        setLoading(false);
        return;
      }

      if (response.ok && data.settings) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error fetching alert settings:', error);
      setFeatureAvailable(false);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);

    try {
      const method = settings.id ? 'PUT' : 'POST';
      const body: any = {
        ...settings,
        server_id: serverId,
        group_id: groupId
      };

      const response = await fetch('/api/alert-settings', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Alert settings saved successfully');
        setSettings(data.settings);
      } else {
        toast.error(data.error || 'Failed to save alert settings');
      }
    } catch (error) {
      toast.error('Failed to save alert settings');
    } finally {
      setSaving(false);
    }
  };

  const testNotification = async (channel: string) => {
    setTestingChannel(channel);

    try {
      const response = await fetch('/api/alert-settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings, channel })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || 'Test notification sent');
      } else {
        toast.error(data.error || 'Test notification failed');
      }
    } catch (error) {
      toast.error('Failed to send test notification');
    } finally {
      setTestingChannel(null);
    }
  };

  const toggleChannel = (channel: string) => {
    const channels = settings.notification_channels || [];
    const newChannels = channels.includes(channel)
      ? channels.filter(c => c !== channel)
      : [...channels, channel];

    setSettings({ ...settings, notification_channels: newChannels });
  };

  const addEmail = () => {
    if (emailInput && emailInput.includes('@')) {
      const emails = settings.email_recipients || [];
      if (!emails.includes(emailInput)) {
        setSettings({
          ...settings,
          email_recipients: [...emails, emailInput]
        });
        setEmailInput('');
      }
    }
  };

  const removeEmail = (email: string) => {
    setSettings({
      ...settings,
      email_recipients: (settings.email_recipients || []).filter(e => e !== email)
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!featureAvailable) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alert Settings</CardTitle>
          <CardDescription>Configure alerts and notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Alert settings are not yet available. Database tables need to be created manually.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Alert Settings
        </CardTitle>
        <CardDescription>
          Configure alert thresholds and notification channels
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="enabled" className="text-base">
              Enable Alerts
            </Label>
            <p className="text-sm text-slate-500">
              Turn on/off all alerts for this {serverId ? 'server' : 'group'}
            </p>
          </div>
          <Switch
            id="enabled"
            checked={settings.enabled}
            onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
          />
        </div>

        {settings.enabled && (
          <>
            <Separator />

            <div className="space-y-4">
              <h4 className="font-semibold">Alert Thresholds</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cpu">CPU Threshold (%)</Label>
                  <Input
                    id="cpu"
                    type="number"
                    min="0"
                    max="100"
                    value={settings.cpu_threshold}
                    onChange={(e) => setSettings({ ...settings, cpu_threshold: parseInt(e.target.value) })}
                  />
                </div>

                <div>
                  <Label htmlFor="memory">Memory Threshold (%)</Label>
                  <Input
                    id="memory"
                    type="number"
                    min="0"
                    max="100"
                    value={settings.memory_threshold}
                    onChange={(e) => setSettings({ ...settings, memory_threshold: parseInt(e.target.value) })}
                  />
                </div>

                <div>
                  <Label htmlFor="disk">Disk Threshold (%)</Label>
                  <Input
                    id="disk"
                    type="number"
                    min="0"
                    max="100"
                    value={settings.disk_threshold}
                    onChange={(e) => setSettings({ ...settings, disk_threshold: parseInt(e.target.value) })}
                  />
                </div>

                <div>
                  <Label htmlFor="down">Down Threshold (seconds)</Label>
                  <Input
                    id="down"
                    type="number"
                    min="30"
                    value={settings.down_threshold_seconds}
                    onChange={(e) => setSettings({ ...settings, down_threshold_seconds: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-semibold">Notification Channels</h4>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="font-medium">Email</div>
                      <div className="text-sm text-slate-500">
                        Send alerts via email
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={(settings.notification_channels || []).includes('email')}
                    onCheckedChange={() => toggleChannel('email')}
                  />
                </div>

                {(settings.notification_channels || []).includes('email') && (
                  <div className="ml-11 space-y-2">
                    <Label>Email Recipients</Label>
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        placeholder="email@example.com"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addEmail()}
                      />
                      <Button onClick={addEmail}>Add</Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(settings.email_recipients || []).map((email) => (
                        <div
                          key={email}
                          className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full text-sm"
                        >
                          {email}
                          <button
                            onClick={() => removeEmail(email)}
                            className="text-slate-500 hover:text-slate-700"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-purple-600" />
                    <div>
                      <div className="font-medium">Slack</div>
                      <div className="text-sm text-slate-500">
                        Send alerts to Slack channel
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(settings.notification_channels || []).includes('slack') && settings.slack_webhook_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => testNotification('slack')}
                        disabled={testingChannel === 'slack'}
                      >
                        {testingChannel === 'slack' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Test'
                        )}
                      </Button>
                    )}
                    <Switch
                      checked={(settings.notification_channels || []).includes('slack')}
                      onCheckedChange={() => toggleChannel('slack')}
                    />
                  </div>
                </div>

                {(settings.notification_channels || []).includes('slack') && (
                  <div className="ml-11">
                    <Label>Slack Webhook URL</Label>
                    <Input
                      type="url"
                      placeholder="https://hooks.slack.com/services/..."
                      value={settings.slack_webhook_url}
                      onChange={(e) => setSettings({ ...settings, slack_webhook_url: e.target.value })}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Webhook className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-medium">Webhook</div>
                      <div className="text-sm text-slate-500">
                        Send alerts to custom webhook
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(settings.notification_channels || []).includes('webhook') && settings.webhook_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => testNotification('webhook')}
                        disabled={testingChannel === 'webhook'}
                      >
                        {testingChannel === 'webhook' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Test'
                        )}
                      </Button>
                    )}
                    <Switch
                      checked={(settings.notification_channels || []).includes('webhook')}
                      onCheckedChange={() => toggleChannel('webhook')}
                    />
                  </div>
                </div>

                {(settings.notification_channels || []).includes('webhook') && (
                  <div className="ml-11">
                    <Label>Webhook URL</Label>
                    <Input
                      type="url"
                      placeholder="https://your-webhook-url.com/alerts"
                      value={settings.webhook_url}
                      onChange={(e) => setSettings({ ...settings, webhook_url: e.target.value })}
                    />
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div className="flex justify-end">
              <Button onClick={saveSettings} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Settings'
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
