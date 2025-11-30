'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Check, Server } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface AddServerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onServerCreated?: () => void;
}

interface CreatedServer {
  id: string;
  name: string;
  token: string;
}

export function AddServerModal({ open, onOpenChange, onServerCreated }: AddServerModalProps) {
  const [serverName, setServerName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdServer, setCreatedServer] = useState<CreatedServer | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedInstructions, setCopiedInstructions] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const response = await fetch('/api/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: serverName }),
      });

      if (response.ok) {
        const data = await response.json();
        setCreatedServer(data.server);
        setServerName('');
        if (onServerCreated) {
          onServerCreated();
        }
      }
    } catch (error) {
      console.error('Error creating server:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setCreatedServer(null);
    setServerName('');
    setCopiedToken(false);
    setCopiedInstructions(false);
    onOpenChange(false);
  };

  const copyToken = () => {
    if (createdServer) {
      navigator.clipboard.writeText(createdServer.token);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  const getBashInstructions = () => {
    if (!createdServer) return '';
    return `# Download and install Montime Agent (Bash)
wget https://raw.githubusercontent.com/yourusername/montime/main/agents/agent.sh
chmod +x agent.sh

# Set your server token
export SERVER_TOKEN="${createdServer.token}"

# Run the agent
./agent.sh

# Or run as systemd service:
sudo mkdir -p /opt/montime
sudo mv agent.sh /opt/montime/
sudo wget https://raw.githubusercontent.com/yourusername/montime/main/agents/systemd/montime-agent-bash.service -O /etc/systemd/system/montime-agent.service

# Edit the service file to add your token
sudo nano /etc/systemd/system/montime-agent.service
# Replace YOUR_SERVER_TOKEN_HERE with: ${createdServer.token}

sudo systemctl daemon-reload
sudo systemctl enable montime-agent
sudo systemctl start montime-agent`;
  };

  const getPythonInstructions = () => {
    if (!createdServer) return '';
    return `# Download and install Montime Agent (Python)
wget https://raw.githubusercontent.com/yourusername/montime/main/agents/agent.py
chmod +x agent.py

# Set your server token
export SERVER_TOKEN="${createdServer.token}"

# Run the agent (will auto-install dependencies)
python3 agent.py

# Or run as systemd service:
sudo mkdir -p /opt/montime
sudo mv agent.py /opt/montime/
sudo pip3 install psutil requests
sudo wget https://raw.githubusercontent.com/yourusername/montime/main/agents/systemd/montime-agent.service -O /etc/systemd/system/montime-agent.service

# Edit the service file to add your token
sudo nano /etc/systemd/system/montime-agent.service
# Replace YOUR_SERVER_TOKEN_HERE with: ${createdServer.token}

sudo systemctl daemon-reload
sudo systemctl enable montime-agent
sudo systemctl start montime-agent`;
  };

  const copyInstructions = (instructions: string) => {
    navigator.clipboard.writeText(instructions);
    setCopiedInstructions(true);
    setTimeout(() => setCopiedInstructions(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {!createdServer ? (
          <>
            <DialogHeader>
              <DialogTitle>Add New Server</DialogTitle>
              <DialogDescription>
                Create a new server to start monitoring its metrics
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="serverName">Server Name</Label>
                <Input
                  id="serverName"
                  placeholder="e.g., Production Web Server"
                  value={serverName}
                  onChange={(e) => setServerName(e.target.value)}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Server'}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Server className="h-5 w-5 text-green-600" />
                Server Created Successfully!
              </DialogTitle>
              <DialogDescription>
                Follow the instructions below to install the monitoring agent
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <Label className="text-sm font-medium">Server Name</Label>
                  <p className="text-lg font-semibold mt-1">{createdServer.name}</p>
                </CardContent>
              </Card>

              <div>
                <Label className="text-sm font-medium">Server Token</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={createdServer.token}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={copyToken}
                  >
                    {copiedToken ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Keep this token secure. You'll need it to configure the agent.
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Installation Instructions</Label>
                <Tabs defaultValue="bash">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="bash">Bash Agent</TabsTrigger>
                    <TabsTrigger value="python">Python Agent</TabsTrigger>
                  </TabsList>
                  <TabsContent value="bash" className="space-y-2">
                    <pre className="bg-slate-950 text-slate-50 p-4 rounded-lg text-xs overflow-x-auto">
                      {getBashInstructions()}
                    </pre>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => copyInstructions(getBashInstructions())}
                    >
                      {copiedInstructions ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy All Instructions
                        </>
                      )}
                    </Button>
                  </TabsContent>
                  <TabsContent value="python" className="space-y-2">
                    <pre className="bg-slate-950 text-slate-50 p-4 rounded-lg text-xs overflow-x-auto">
                      {getPythonInstructions()}
                    </pre>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => copyInstructions(getPythonInstructions())}
                    >
                      {copiedInstructions ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy All Instructions
                        </>
                      )}
                    </Button>
                  </TabsContent>
                </Tabs>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleClose}>Done</Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
