import { createInterface } from 'node:readline/promises';
import { saveConfig, defaultApiUrl, configPath } from '../config.js';
import { apiFetch, ApiError } from '../api.js';
import { info, success, fail, dim } from '../ui.js';

export async function loginCommand(opts: { token?: string; apiUrl?: string }) {
  const apiUrl = opts.apiUrl ?? defaultApiUrl();
  let token = opts.token;

  if (!token) {
    info('Paste your API token below. (Create one at https://your-dashboard.local/dashboard/settings/tokens)');
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    token = (await rl.question('Token: ')).trim();
    rl.close();
  }

  if (!token) {
    fail('No token provided.');
    process.exit(1);
  }

  try {
    await apiFetch<{ projects: unknown[] }>({ apiUrl, token }, '/v1/projects');
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      fail('Token rejected. Double-check the value and try again.');
    } else {
      fail(`Could not verify token: ${err instanceof Error ? err.message : String(err)}`);
    }
    process.exit(1);
  }

  saveConfig({ apiUrl, token });
  success(`Signed in. Token saved to ${dim(configPath())}`);
}
