'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { apiFetch } from '@/lib/api';
import type { Bundle, Channel, Deployment, Project } from '@/lib/types';

type ProjectDetail = Project & {
  channels: (Channel & {
    currentBundle: { id: string; version: string; uploadedAt: string; bundleSize: number } | null;
  })[];
};

export const projectQueryKey = (id: string) => ['project', id] as const;
export const bundlesQueryKey = (id: string) => ['project', id, 'bundles'] as const;
export const deploymentsQueryKey = (id: string) => ['project', id, 'deployments'] as const;

export function useProject(projectId: string) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  return useQuery({
    queryKey: projectQueryKey(projectId),
    enabled: isLoaded && isSignedIn,
    queryFn: () =>
      apiFetch<{ project: ProjectDetail }>(`/v1/projects/${projectId}`, {
        getToken: () => getToken(),
      }),
  });
}

export function useBundles(projectId: string) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  return useQuery({
    queryKey: bundlesQueryKey(projectId),
    enabled: isLoaded && isSignedIn,
    queryFn: () =>
      apiFetch<{ bundles: Bundle[] }>(`/v1/projects/${projectId}/bundles`, {
        getToken: () => getToken(),
      }),
  });
}

export function useDeployments(projectId: string) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  return useQuery({
    queryKey: deploymentsQueryKey(projectId),
    enabled: isLoaded && isSignedIn,
    queryFn: () =>
      apiFetch<{ deployments: Deployment[] }>(`/v1/projects/${projectId}/deployments`, {
        getToken: () => getToken(),
      }),
  });
}

function invalidateProject(qc: ReturnType<typeof useQueryClient>, projectId: string) {
  qc.invalidateQueries({ queryKey: projectQueryKey(projectId) });
  qc.invalidateQueries({ queryKey: deploymentsQueryKey(projectId) });
  qc.invalidateQueries({ queryKey: bundlesQueryKey(projectId) });
}

export function usePromote(projectId: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ channelName, bundleId, notes }: { channelName: string; bundleId: string; notes?: string }) =>
      apiFetch<{ ok: true }>(`/v1/projects/${projectId}/channels/${channelName}/promote`, {
        method: 'POST',
        body: { bundleId, notes },
        getToken: () => getToken(),
      }),
    onSuccess: () => invalidateProject(qc, projectId),
  });
}

export function useRollback(projectId: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ channelName, toBundleId, notes }: { channelName: string; toBundleId?: string; notes?: string }) =>
      apiFetch<{ ok: true }>(`/v1/projects/${projectId}/channels/${channelName}/rollback`, {
        method: 'POST',
        body: toBundleId ? { toBundleId, notes } : { notes },
        getToken: () => getToken(),
      }),
    onSuccess: () => invalidateProject(qc, projectId),
  });
}

export function useDeleteBundle(projectId: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bundleId: string) =>
      apiFetch<{ ok: true }>(`/v1/projects/${projectId}/bundles/${bundleId}`, {
        method: 'DELETE',
        getToken: () => getToken(),
      }),
    onSuccess: () => invalidateProject(qc, projectId),
  });
}
