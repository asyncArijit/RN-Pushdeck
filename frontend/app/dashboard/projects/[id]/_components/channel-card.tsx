'use client';

import { Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ApiError } from '@/lib/api';
import { useRollback } from '@/lib/hooks/use-project';
import { PromoteDialog } from './promote-dialog';

type ChannelCardProps = {
  projectId: string;
  channelName: string;
  currentBundle: { id: string; version: string; uploadedAt: string } | null;
};

export function ChannelCard({ projectId, channelName, currentBundle }: ChannelCardProps) {
  const rollback = useRollback(projectId);

  async function onRollback() {
    if (!confirm(`Roll back ${channelName} to the previous bundle?`)) return;
    try {
      await rollback.mutateAsync({ channelName });
      toast.success(`Rolled back ${channelName}`);
    } catch (err) {
      const payload = err instanceof ApiError ? err.payload : null;
      const errorCode =
        payload && typeof payload === 'object' && 'error' in payload
          ? String((payload as { error: unknown }).error)
          : null;
      let description = '';
      if (errorCode === 'no_previous_deployment') description = 'No previous deployment to roll back to.';
      else if (errorCode === 'no_current_bundle') description = 'Nothing is deployed on this channel yet.';
      else if (err instanceof ApiError) description = `(${err.status})`;
      else if (err instanceof Error) description = err.message;
      toast.error('Rollback failed', { description });
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="capitalize">{channelName}</CardTitle>
            <CardDescription>
              {currentBundle ? `Live: v${currentBundle.version}` : 'No bundle deployed'}
            </CardDescription>
          </div>
          <Badge variant={currentBundle ? 'default' : 'outline'}>
            {currentBundle ? 'Active' : 'Empty'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <PromoteDialog
          projectId={projectId}
          channelName={channelName}
          currentBundleId={currentBundle?.id ?? null}
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={onRollback}
          disabled={!currentBundle || rollback.isPending}
        >
          <Undo2 className="size-4" />
          {rollback.isPending ? 'Rolling back…' : 'Rollback'}
        </Button>
      </CardContent>
    </Card>
  );
}
