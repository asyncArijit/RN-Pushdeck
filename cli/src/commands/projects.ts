import { resolveClient } from '../client.js';
import { apiFetch } from '../api.js';
import { bold, dim, fail } from '../ui.js';

type Project = {
  id: string;
  name: string;
  projectKey: string;
  channels: {
    name: string;
    currentBundle: { version: string } | null;
  }[];
};

export async function projectsCommand() {
  const client = resolveClient();
  if (!client) {
    fail('Not signed in. Run `pushdeck login` first.');
    process.exit(1);
  }

  const res = await apiFetch<{ projects: Project[] }>(client, '/v1/projects');

  if (res.projects.length === 0) {
    console.log(dim('No projects yet. Create one in the dashboard.'));
    return;
  }

  for (const p of res.projects) {
    console.log(`${bold(p.name)}  ${dim(p.projectKey)}`);
    for (const c of p.channels) {
      const v = c.currentBundle ? `v${c.currentBundle.version}` : dim('empty');
      console.log(`  ${c.name.padEnd(14)} ${v}`);
    }
    console.log();
  }
}
