import { Hono } from 'hono';
import { eq, and, desc, ne } from 'drizzle-orm';
import { z } from 'zod';
import { channels, bundles, deployments } from '../db/schema';
import { findOwnedProject } from '../lib/projectOwnership';
import type { AppEnv } from '../types';

const router = new Hono<AppEnv>();

const uuidParam = z.string().uuid();

const promoteBodySchema = z.object({
  bundleId: z.string().uuid(),
  notes: z.string().max(2000).optional(),
});

const rollbackBodySchema = z.object({
  toBundleId: z.string().uuid().optional(),
  notes: z.string().max(2000).optional(),
});

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  channelId: z.string().uuid().optional(),
});

router.post('/:projectId/channels/:channelName/promote', async (c) => {
  const userId = c.get('clerkUserId');
  const db = c.get('db');

  const idParse = uuidParam.safeParse(c.req.param('projectId'));
  if (!idParse.success) return c.json({ error: 'not_found' }, 404);

  const project = await findOwnedProject(db, idParse.data, userId);
  if (!project) return c.json({ error: 'not_found' }, 404);

  const raw = await c.req.json().catch(() => null);
  const parsed = promoteBodySchema.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }

  const channelName = c.req.param('channelName').toLowerCase();
  const channel = await db.query.channels.findFirst({
    where: and(eq(channels.projectId, project.id), eq(channels.name, channelName)),
  });
  if (!channel) return c.json({ error: 'channel_not_found', name: channelName }, 404);

  const bundle = await db.query.bundles.findFirst({
    where: and(
      eq(bundles.id, parsed.data.bundleId),
      eq(bundles.projectId, project.id),
      eq(bundles.isActive, true)
    ),
  });
  if (!bundle) return c.json({ error: 'bundle_not_found' }, 404);

  await db
    .update(channels)
    .set({ currentBundleId: bundle.id })
    .where(eq(channels.id, channel.id));

  await db.insert(deployments).values({
    projectId: project.id,
    channelId: channel.id,
    bundleId: bundle.id,
    action: 'promote',
    actorClerkUserId: userId,
    notes: parsed.data.notes ?? null,
  });

  return c.json({
    ok: true,
    channel: { id: channel.id, name: channel.name, currentBundleId: bundle.id },
    bundle: { id: bundle.id, version: bundle.version },
  });
});

router.post('/:projectId/channels/:channelName/rollback', async (c) => {
  const userId = c.get('clerkUserId');
  const db = c.get('db');

  const idParse = uuidParam.safeParse(c.req.param('projectId'));
  if (!idParse.success) return c.json({ error: 'not_found' }, 404);

  const project = await findOwnedProject(db, idParse.data, userId);
  if (!project) return c.json({ error: 'not_found' }, 404);

  const raw = await c.req.json().catch(() => null);
  const parsed = rollbackBodySchema.safeParse(raw ?? {});
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }

  const channelName = c.req.param('channelName').toLowerCase();
  const channel = await db.query.channels.findFirst({
    where: and(eq(channels.projectId, project.id), eq(channels.name, channelName)),
  });
  if (!channel) return c.json({ error: 'channel_not_found', name: channelName }, 404);

  let targetBundleId = parsed.data.toBundleId;

  if (!targetBundleId) {
    if (!channel.currentBundleId) {
      return c.json({ error: 'no_current_bundle' }, 409);
    }
    const previous = await db.query.deployments.findFirst({
      where: and(
        eq(deployments.channelId, channel.id),
        eq(deployments.action, 'promote'),
        ne(deployments.bundleId, channel.currentBundleId)
      ),
      orderBy: [desc(deployments.createdAt)],
    });
    if (!previous) {
      return c.json({ error: 'no_previous_deployment' }, 409);
    }
    targetBundleId = previous.bundleId;
  }

  const bundle = await db.query.bundles.findFirst({
    where: and(
      eq(bundles.id, targetBundleId),
      eq(bundles.projectId, project.id),
      eq(bundles.isActive, true)
    ),
  });
  if (!bundle) return c.json({ error: 'bundle_not_found' }, 404);

  await db
    .update(channels)
    .set({ currentBundleId: bundle.id })
    .where(eq(channels.id, channel.id));

  await db.insert(deployments).values({
    projectId: project.id,
    channelId: channel.id,
    bundleId: bundle.id,
    action: 'rollback',
    actorClerkUserId: userId,
    notes: parsed.data.notes ?? null,
  });

  return c.json({
    ok: true,
    channel: { id: channel.id, name: channel.name, currentBundleId: bundle.id },
    bundle: { id: bundle.id, version: bundle.version },
  });
});

router.get('/:projectId/deployments', async (c) => {
  const userId = c.get('clerkUserId');
  const db = c.get('db');

  const idParse = uuidParam.safeParse(c.req.param('projectId'));
  if (!idParse.success) return c.json({ error: 'not_found' }, 404);

  const project = await findOwnedProject(db, idParse.data, userId);
  if (!project) return c.json({ error: 'not_found' }, 404);

  const queryParse = listQuerySchema.safeParse({
    limit: c.req.query('limit'),
    channelId: c.req.query('channelId'),
  });
  if (!queryParse.success) {
    return c.json({ error: 'invalid_query', issues: queryParse.error.issues }, 400);
  }

  const whereClauses = [eq(deployments.projectId, project.id)];
  if (queryParse.data.channelId) {
    whereClauses.push(eq(deployments.channelId, queryParse.data.channelId));
  }

  const rows = await db.query.deployments.findMany({
    where: and(...whereClauses),
    with: {
      bundle: { columns: { id: true, version: true } },
      channel: { columns: { id: true, name: true } },
    },
    orderBy: [desc(deployments.createdAt)],
    limit: queryParse.data.limit,
  });

  return c.json({ deployments: rows });
});

export default router;
