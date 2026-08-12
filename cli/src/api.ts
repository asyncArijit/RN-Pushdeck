export class ApiError extends Error {
  constructor(public status: number, public payload: unknown, public path: string) {
    super(`API ${status} on ${path}`);
  }
}

export type ApiClient = {
  apiUrl: string;
  token: string;
};

export async function apiFetch<T = unknown>(
  client: ApiClient,
  path: string,
  options: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown } = {}
): Promise<T> {
  const res = await fetch(`${client.apiUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${client.token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  const json = text ? safeParse(text) : null;
  if (!res.ok) throw new ApiError(res.status, json, path);
  return json as T;
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function putToR2(url: string, body: Uint8Array, contentType: string): Promise<void> {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`R2 upload failed (${res.status}): ${text.slice(0, 200)}`);
  }
}
