'use client';

import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useProjects, useDeleteProject } from '@/lib/hooks/use-projects';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import { CopyKey } from './copy-key';
import { CreateProjectDialog } from './create-project-dialog';

export function ProjectsList() {
  const { data, isLoading, isError, error } = useProjects();
  const remove = useDeleteProject();

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-5 w-32 rounded bg-muted" />
              <div className="h-3 w-44 rounded bg-muted/60" />
            </CardHeader>
            <CardContent>
              <div className="h-3 w-24 rounded bg-muted/60" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle>Couldn&apos;t load projects</CardTitle>
          <CardDescription>
            {error instanceof ApiError
              ? `API returned ${error.status}`
              : (error as Error)?.message ?? 'Unknown error'}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const projects = data?.projects ?? [];

  if (projects.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No projects yet</CardTitle>
          <CardDescription>
            Create your first project. You&apos;ll get a public key to drop into your React Native
            app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateProjectDialog />
        </CardContent>
      </Card>
    );
  }

  async function onDelete(projectId: string, name: string) {
    if (!confirm(`Delete "${name}"? Bundles, channels, and history will be removed.`)) return;
    try {
      await remove.mutateAsync(projectId);
      toast.success('Project deleted');
    } catch (err) {
      toast.error('Delete failed', {
        description:
          err instanceof ApiError ? `(${err.status})` : (err as Error)?.message ?? '',
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{projects.length} project{projects.length === 1 ? '' : 's'}</p>
        <CreateProjectDialog />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <Card key={p.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <Link href={`/dashboard/projects/${p.id}`} className="hover:underline">
                  <CardTitle className="text-base">{p.name}</CardTitle>
                </Link>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => onDelete(p.id, p.name)}
                  aria-label={`Delete ${p.name}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
              <CardDescription className="pt-1">
                <CopyKey value={p.projectKey} />
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto flex flex-wrap gap-1.5">
              {p.channels.length === 0 ? (
                <span className="text-xs text-muted-foreground">No channels</span>
              ) : (
                p.channels.map((c) => (
                  <Badge key={c.id} variant={c.currentBundle ? 'default' : 'outline'}>
                    {c.name}
                    {c.currentBundle ? ` · v${c.currentBundle.version}` : ' · empty'}
                  </Badge>
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
