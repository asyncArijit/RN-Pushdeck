'use client';

import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import { useBundles, useDeleteBundle } from '@/lib/hooks/use-project';

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function BundlesList({ projectId }: { projectId: string }) {
  const { data, isLoading, isError, error } = useBundles(projectId);
  const remove = useDeleteBundle(projectId);

  async function onDelete(bundleId: string, version: string) {
    if (!confirm(`Soft-delete bundle v${version}?\n\nThe file stays in storage; you just won't be able to promote it anymore.`)) return;
    try {
      await remove.mutateAsync(bundleId);
      toast.success('Bundle removed from rotation');
    } catch (err) {
      toast.error('Delete failed', {
        description:
          err instanceof ApiError ? `(${err.status})` : err instanceof Error ? err.message : '',
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bundles</CardTitle>
        <CardDescription>Uploaded JS bundles. Use the CLI to add new ones.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {isError && (
          <p className="text-sm text-destructive">
            Couldn&apos;t load bundles
            {error instanceof ApiError ? ` (${error.status})` : ''}
          </p>
        )}
        {data && data.bundles.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No bundles yet. Run <code className="rounded bg-muted px-1 py-0.5 text-xs">pushdeck deploy</code> from your RN app to upload one.
          </p>
        )}
        {data && data.bundles.length > 0 && (
          <ul className="divide-y divide-border">
            {data.bundles.map((b) => (
              <li
                key={b.id}
                className={`flex items-center justify-between gap-3 py-3 ${
                  b.isActive ? '' : 'opacity-50'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 font-mono text-sm">
                    v{b.version}
                    {!b.isActive && (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-sans uppercase tracking-wider text-muted-foreground">
                        archived
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatWhen(b.uploadedAt)} · min native v{b.minNativeVersion} · {formatSize(b.bundleSize)}
                  </div>
                  {b.description && (
                    <div className="pt-0.5 text-xs italic text-muted-foreground">
                      {b.description}
                    </div>
                  )}
                </div>
                {b.isActive && (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => onDelete(b.id, b.version)}
                    aria-label={`Archive v${b.version}`}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
