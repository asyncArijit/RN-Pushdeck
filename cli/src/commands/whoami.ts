import { resolveClient } from '../client.js';
import { apiFetch, ApiError } from '../api.js';
import { fail, info, bold, dim } from '../ui.js';

export async function whoamiCommand() {
  const client = resolveClient();
  if (!client) {
    fail('Not signed in. Run `pushdeck login` first.');
    process.exit(1);
  }

  try {
    const res = await apiFetch<{ projects: { id: string }[] }>(client, '/v1/projects');
    info(`Connected to ${bold(client.apiUrl)}`);
    info(`Token authenticated. You have ${res.projects.length} project${res.projects.length === 1 ? '' : 's'}.`);
    if (process.env.PUSHDECK_TOKEN) {
      info(dim('(Using token from PUSHDECK_TOKEN env var.)'));
    }
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      fail('Token is invalid or has been revoked. Run `pushdeck login` again.');
    } else {
      fail(err instanceof Error ? err.message : String(err));
    }
    process.exit(1);
  }
}
