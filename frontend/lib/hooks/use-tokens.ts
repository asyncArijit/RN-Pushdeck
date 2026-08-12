'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { apiFetch } from '@/lib/api';
import type { ApiTokenListItem } from '@/lib/types';

export const tokensQueryKey = ['tokens'] as const;

export function useTokens() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  return useQuery({
    queryKey: tokensQueryKey,
    enabled: isLoaded && isSignedIn,
    queryFn: () =>
      apiFetch<{ tokens: ApiTokenListItem[] }>('/v1/tokens', {
        getToken: () => getToken(),
      }),
  });
}

export function useCreateToken() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      apiFetch<{ token: ApiTokenListItem; rawToken: string }>('/v1/tokens', {
        method: 'POST',
        body: { name },
        getToken: () => getToken(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tokensQueryKey });
    },
  });
}

export function useRevokeToken() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ ok: true }>(`/v1/tokens/${id}`, {
        method: 'DELETE',
        getToken: () => getToken(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tokensQueryKey });
    },
  });
}
