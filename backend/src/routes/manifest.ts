import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { bundles, channels, projects } from '../db/schema';
import { publicUrlFor } from '../lib/r2';
import type { AppEnv } from '../types';

const manifest = new Hono<AppEnv>();

manifest.get('/:projectKey/:channel', async (c) => {
  const projectKey = c.req.param('projectKey');
  const channelName = c.req.param('channel');
  const db = c.get('db');

  const rows = await db
    .select({
      version: bundles.version,
      storagePath: bundles.storagePath,
      bundleSize: bundles.bundleSize,
      assetsSize: bundles.assetsSize,
      minNativeVersion: bundles.minNativeVersion,
      description: bundles.description,
      isActive: bundles.isActive,
    })
    .from(projects)
    .innerJoin(
      channels,
      and(eq(channels.projectId, projects.id), eq(channels.name, channelName))
    )
    .innerJoin(bundles, eq(bundles.id, channels.currentBundleId))
    .where(eq(projects.projectKey, projectKey))
    .limit(1);

  const row = rows[0];

  if (!row || !row.isActive) {
    return c.json({ version: null });
  }

  return c.json({
    version: row.version,
    minNativeVersion: row.minNativeVersion,
    force: false,
    bundleUrl: publicUrlFor(c.env, `${row.storagePath}/index.android.bundle`),
    assetsUrl: publicUrlFor(c.env, `${row.storagePath}/assets.zip`),
    size: row.bundleSize,
    assetsSize: row.assetsSize,
    releaseNotes: row.description,
  });
});

manifest.post('/events/:projectKey', (c) => {
  return c.json({ error: 'not_implemented' }, 501);
});

export default manifest;
