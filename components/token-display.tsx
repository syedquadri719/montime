'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Key, Copy, Check } from 'lucide-react';

interface TokenDisplayProps {
  token: string;
}

export function TokenDisplay({ token }: TokenDisplayProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Key className="h-4 w-4 mr-2" />
          Show API Token
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>API Token</DialogTitle>
          <DialogDescription>
            Use this token to authenticate your monitoring agent. Keep it secure and do not share it publicly.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-3 bg-slate-100 rounded-lg border border-slate-200">
            <code className="text-sm break-all font-mono text-slate-800">
              {token}
            </code>
          </div>
          <Button
            onClick={copyToClipboard}
            variant="secondary"
            className="w-full"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy to Clipboard
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
