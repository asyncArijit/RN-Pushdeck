'use client';

import { ArrowUpCircle, Undo2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDeployments } from '@/lib/hooks/use-project';
import { ApiError } from '@/lib/api';

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

export function DeploymentsTimeline({ projectId }: { projectId: string }) {
  const { data, isLoading, isError, error } = useDeployments(projectId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deployment history</CardTitle>
        <CardDescription>Every promote and rollback on this project.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {isError && (
          <p className="text-sm text-destructive">
            Couldn&apos;t load history
            {error instanceof ApiError ? ` (${error.status})` : ''}
          </p>
        )}
        {data && data.deployments.length === 0 && (
          <p className="text-sm text-muted-foreground">No deployments yet.</p>
        )}
        {data && data.deployments.length > 0 && (
          <ol className="space-y-3">
            {data.deployments.map((d) => {
              const isRollback = d.action === 'rollback';
              const Icon = isRollback ? Undo2 : ArrowUpCircle;
              return (
                <li key={d.id} className="flex gap-3">
                  <div
                    className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${
                      isRollback
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    <Icon className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="text-sm">
                      <span className="font-medium capitalize">{d.action}</span>
                      <span className="text-muted-foreground"> v{d.bundle.version} on </span>
                      <span className="font-medium">{d.channel.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatWhen(d.createdAt)}
                    </div>
                    {d.notes && (
                      <div className="pt-0.5 text-xs italic text-muted-foreground">
                        {d.notes}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
