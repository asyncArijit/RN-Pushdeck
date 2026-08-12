import { getConfig } from './config';
import type { Manifest } from './types';

export async function fetchManifest(): Promise<Manifest> {
  const { apiUrl, projectKey, channel } = getConfig();
  const url = `${apiUrl}/v1/manifest/${projectKey}/${channel}`;

  const res = await fetch(`${url}?t=${Date.now()}`, {
    headers: {
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
  });

  if (!res.ok) {
    throw new Error(`Manifest fetch failed: ${res.status}`);
  }

  const json = (await res.json()) as Manifest;
  return json;
}
