'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface MonitorFormProps {
  monitor?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function MonitorForm({ monitor, onSuccess, onCancel }: MonitorFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: monitor?.name || '',
    type: monitor?.type || 'http',
    url: monitor?.url || '',
    interval: monitor?.interval || 5,
    timeout: monitor?.timeout || 30,
    expected_status: monitor?.expected_status || 200,
    expected_keyword: monitor?.expected_keyword || '',
    port: monitor?.port || 80,
    enabled: monitor?.enabled !== undefined ? monitor.enabled : true
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = monitor ? `/api/monitors/${monitor.id}` : '/api/monitors';
      const method = monitor ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(monitor ? 'Monitor updated successfully' : 'Monitor created successfully');
        onSuccess();
      } else {
        toast.error(data.error || 'Failed to save monitor');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const showExpectedStatus = ['http', 'https'].includes(formData.type);
  const showExpectedKeyword = ['http', 'https', 'keyword'].includes(formData.type);
  const showPort = formData.type === 'tcp';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Monitor Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="My Website"
          required
        />
      </div>

      <div>
        <Label htmlFor="type">Monitor Type</Label>
        <Select
          value={formData.type}
          onValueChange={(value) => setFormData({ ...formData, type: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="http">HTTP</SelectItem>
            <SelectItem value="https">HTTPS</SelectItem>
            <SelectItem value="ping">Ping</SelectItem>
            <SelectItem value="tcp">TCP Port</SelectItem>
            <SelectItem value="ssl">SSL Certificate</SelectItem>
            <SelectItem value="keyword">Keyword</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="url">URL or IP Address</Label>
        <Input
          id="url"
          value={formData.url}
          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
          placeholder="https://example.com"
          required
        />
      </div>

      {showPort && (
        <div>
          <Label htmlFor="port">Port</Label>
          <Input
            id="port"
            type="number"
            value={formData.port}
            onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
            placeholder="80"
            min="1"
            max="65535"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="interval">Check Interval (minutes)</Label>
          <Input
            id="interval"
            type="number"
            value={formData.interval}
            onChange={(e) => setFormData({ ...formData, interval: parseInt(e.target.value) })}
            min="1"
            max="60"
            required
          />
        </div>

        <div>
          <Label htmlFor="timeout">Timeout (seconds)</Label>
          <Input
            id="timeout"
            type="number"
            value={formData.timeout}
            onChange={(e) => setFormData({ ...formData, timeout: parseInt(e.target.value) })}
            min="5"
            max="120"
            required
          />
        </div>
      </div>

      {showExpectedStatus && (
        <div>
          <Label htmlFor="expected_status">Expected Status Code</Label>
          <Input
            id="expected_status"
            type="number"
            value={formData.expected_status}
            onChange={(e) => setFormData({ ...formData, expected_status: parseInt(e.target.value) })}
            placeholder="200"
          />
        </div>
      )}

      {showExpectedKeyword && (
        <div>
          <Label htmlFor="expected_keyword">Expected Keyword (optional)</Label>
          <Input
            id="expected_keyword"
            value={formData.expected_keyword}
            onChange={(e) => setFormData({ ...formData, expected_keyword: e.target.value })}
            placeholder="Welcome"
          />
        </div>
      )}

      <div className="flex items-center space-x-2">
        <Switch
          id="enabled"
          checked={formData.enabled}
          onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
        />
        <Label htmlFor="enabled">Enable monitoring</Label>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : monitor ? 'Update Monitor' : 'Create Monitor'}
        </Button>
      </div>
    </form>
  );
}
