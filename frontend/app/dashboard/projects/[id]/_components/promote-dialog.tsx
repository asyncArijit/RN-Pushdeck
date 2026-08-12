'use client';

import { useState } from 'react';
import { ArrowUpCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ApiError } from '@/lib/api';
import { useBundles, usePromote } from '@/lib/hooks/use-project';

export function PromoteDialog({
  projectId,
  channelName,
  currentBundleId,
}: {
  projectId: string;
  channelName: string;
  currentBundleId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [selectedBundleId, setSelectedBundleId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const { data, isLoading } = useBundles(projectId);
  const promote = usePromote(projectId);

  const activeBundles = data?.bundles.filter((b) => b.isActive) ?? [];

  async function onSubmit() {
    if (!selectedBundleId) return;
    try {
      await promote.mutateAsync({ channelName, bundleId: selectedBundleId, notes: notes.trim() || undefined });
      toast.success(`Promoted to ${channelName}`);
      setOpen(false);
      setSelectedBundleId(null);
      setNotes('');
    } catch (err) {
      toast.error('Promote failed', {
        description:
          err instanceof ApiError ? `(${err.status})` : err instanceof Error ? err.message : '',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={(props) => (
          <Button {...props} size="sm" variant="outline">
            <ArrowUpCircle className="size-4" />
            Promote
          </Button>
        )}
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Promote a bundle to {channelName}</DialogTitle>
          <DialogDescription>
            Phones on this channel will start downloading the new bundle on their next launch.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-72 space-y-1.5 overflow-y-auto py-2">
          {isLoading && <p className="text-sm text-muted-foreground">Loading bundles…</p>}
          {!isLoading && activeBundles.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No bundles yet. Use the CLI to upload one.
            </p>
          )}
          {activeBundles.map((b) => {
            const isCurrent = b.id === currentBundleId;
            const isSelected = b.id === selectedBundleId;
            return (
              <button
                key={b.id}
                type="button"
                disabled={isCurrent}
                onClick={() => setSelectedBundleId(b.id)}
                className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="font-mono text-sm">v{b.version}</div>
                  <div className="text-xs text-muted-foreground">
                    min native v{b.minNativeVersion} · {(b.bundleSize / 1024).toFixed(1)} KB
                  </div>
                </div>
                {isCurrent && <Badge variant="outline">Current</Badge>}
              </button>
            );
          })}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes">Release notes (optional)</Label>
          <Input
            id="notes"
            placeholder="What changed?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={2000}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={!selectedBundleId || promote.isPending}
          >
            {promote.isPending ? 'Promoting…' : 'Promote'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
