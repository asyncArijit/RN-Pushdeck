'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import { useTokens, useRevokeToken } from '@/lib/hooks/use-tokens';
import { CreateTokenDialog } from './create-token-dialog';
import { RevealTokenDialog } from './reveal-token-dialog';

function formatWhen(iso: string | null) {
  if (!iso) return 'Never';
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function TokensPage() {
  const { data, isLoading, isError, error } = useTokens();
  const revoke = useRevokeToken();
  const [newlyCreatedToken, setNewlyCreatedToken] = useState<string | null>(null);

  async function onRevoke(id: string, name: string) {
    if (!confirm(`Revoke "${name}"? Anyone using this token will lose access immediately.`)) return;
    try {
      await revoke.mutateAsync(id);
      toast.success('Token revoked');
    } catch (err) {
      toast.error('Revoke failed', {
        description:
          err instanceof ApiError ? `(${err.status})` : err instanceof Error ? err.message : '',
      });
    }
  }

  const tokens = data?.tokens ?? [];
  const active = tokens.filter((t) => !t.revokedAt);
  const revoked = tokens.filter((t) => t.revokedAt);

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">API tokens</h1>
            <p className="text-sm text-muted-foreground">
              Use these tokens with the <code className="rounded bg-muted px-1 py-0.5 text-xs">pushdeck</code> CLI to deploy bundles.
            </p>
          </div>
          <CreateTokenDialog onCreated={setNewlyCreatedToken} />
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {isError && (
          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle>Couldn&apos;t load tokens</CardTitle>
              <CardDescription>
                {error instanceof ApiError
                  ? `API returned ${error.status}`
                  : (error as Error)?.message ?? 'Unknown error'}
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {!isLoading && !isError && (
          <>
            {active.length === 0 && revoked.length === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>No tokens yet</CardTitle>
                  <CardDescription>
                    Create your first token to use with the CLI. You&apos;ll see the full value
                    once on creation; copy it then.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

            {active.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Active</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y divide-border">
                    {active.map((t) => (
                      <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 truncate text-sm font-medium">
                            {t.name}
                            <span className="font-mono text-xs text-muted-foreground">
                              {t.tokenPrefix}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Created {formatWhen(t.createdAt)} · Last used {formatWhen(t.lastUsedAt)}
                          </div>
                        </div>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => onRevoke(t.id, t.name)}
                          aria-label={`Revoke ${t.name}`}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {revoked.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base text-muted-foreground">Revoked</CardTitle>
                  <CardDescription>Kept for audit. These can&apos;t be reactivated.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y divide-border">
                    {revoked.map((t) => (
                      <li key={t.id} className="py-3 opacity-60">
                        <div className="flex items-center gap-2 truncate text-sm">
                          {t.name}
                          <span className="font-mono text-xs text-muted-foreground">
                            {t.tokenPrefix}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Revoked {formatWhen(t.revokedAt)}
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      <RevealTokenDialog
        rawToken={newlyCreatedToken}
        onClose={() => setNewlyCreatedToken(null)}
      />
    </>
  );
}
