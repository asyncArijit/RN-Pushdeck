'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiError } from '@/lib/api';
import { useProject } from '@/lib/hooks/use-project';
import { useDeleteProject } from '@/lib/hooks/use-projects';
import { CopyKey } from '../../../_components/copy-key';
import { ChannelCard } from './channel-card';
import { BundlesList } from './bundles-list';
import { DeploymentsTimeline } from './deployments-timeline';

export function ProjectDetailView({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { data, isLoading, isError, error } = useProject(projectId);
  const remove = useDeleteProject();

  async function onDeleteProject() {
    const name = data?.project.name ?? 'this project';
    if (!confirm(`Delete "${name}"? Bundles, channels, and deployment history are removed.`)) return;
    try {
      await remove.mutateAsync(projectId);
      toast.success('Project deleted');
      router.push('/dashboard');
    } catch (err) {
      toast.error('Delete failed', {
        description:
          err instanceof ApiError ? `(${err.status})` : err instanceof Error ? err.message : '',
      });
    }
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading project…</p>;
  }

  if (isError || !data) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <Card>
        <CardHeader>
          <CardTitle>{notFound ? 'Project not found' : "Couldn't load project"}</CardTitle>
          <CardDescription>
            {notFound
              ? "It may have been deleted, or you don't have access."
              : error instanceof ApiError
              ? `API returned ${error.status}`
              : (error as Error)?.message ?? 'Unknown error'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <ChevronLeft className="size-4" />
            Back to projects
          </Link>
        </CardContent>
      </Card>
    );
  }

  const project = data.project;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          All projects
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
            <CopyKey value={project.projectKey} />
          </div>
          <Button
            variant="outline"
            onClick={onDeleteProject}
            disabled={remove.isPending}
          >
            <Trash2 className="size-4" />
            {remove.isPending ? 'Deleting…' : 'Delete project'}
          </Button>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Channels
        </h2>
        {project.channels.length === 0 ? (
          <Card>
            <CardHeader>
              <CardDescription>No channels yet. (Channel CRUD UI coming next.)</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {project.channels.map((c) => (
              <ChannelCard
                key={c.id}
                projectId={projectId}
                channelName={c.name}
                currentBundle={c.currentBundle}
              />
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <BundlesList projectId={projectId} />
        <DeploymentsTimeline projectId={projectId} />
      </div>
    </div>
  );
}
