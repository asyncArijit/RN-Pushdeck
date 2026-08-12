'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function RevealTokenDialog({
  rawToken,
  onClose,
}: {
  rawToken: string | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    if (!rawToken) return;
    try {
      await navigator.clipboard.writeText(rawToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <Dialog open={!!rawToken} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Save your token</DialogTitle>
          <DialogDescription>
            This is the only time you&apos;ll see this token. Copy it now and save it somewhere
            secure. If you lose it, revoke and create a new one.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 p-3">
          <code className="flex-1 break-all font-mono text-xs">{rawToken}</code>
          <Button size="icon-sm" variant="outline" onClick={onCopy} aria-label="Copy token">
            {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Use this token in your CLI: <code className="rounded bg-muted px-1 py-0.5 text-xs">PUSHDECK_TOKEN=&lt;token&gt; npx pushdeck deploy</code>
        </p>

        <DialogFooter>
          <Button onClick={onClose}>I&apos;ve saved it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
