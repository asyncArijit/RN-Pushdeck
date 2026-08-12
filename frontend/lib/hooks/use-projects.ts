'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { apiFetch } from '@/lib/api';
import type { Project, ProjectListItem } from '@/lib/types';

export const projectsQueryKey = ['projects'] as const;

export function useProjects() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  return useQuery({
    queryKey: projectsQueryKey,
    enabled: isLoaded && isSignedIn,
    queryFn: () =>
      apiFetch<{ projects: ProjectListItem[] }>('/v1/projects', {
        getToken: () => getToken(),
      }),
  });
}

export function useCreateProject() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      apiFetch<{ project: Project }>('/v1/projects', {
        method: 'POST',
        body: { name },
        getToken: () => getToken(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectsQueryKey });
    },
  });
}

export function useDeleteProject() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) =>
      apiFetch<{ ok: true }>(`/v1/projects/${projectId}`, {
        method: 'DELETE',
        getToken: () => getToken(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectsQueryKey });
    },
  });
}
