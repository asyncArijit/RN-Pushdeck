import { Hono } from 'hono';
import { eq, and, asc } from 'drizzle-orm';
import { z } from 'zod';
import { channels } from '../db/schema';
import { findOwnedProject } from '../lib/projectOwnership';
import { isUniqueViolation } from '../lib/pgErrors';
import type { AppEnv } from '../types';

const router = new Hono<AppEnv>();

const uuidParam = z.string().uuid();
const channelNameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(50)
  .regex(/^[a-z0-9][a-z0-9-]*$/, 'must be lowercase alphanumeric / hyphens');

const createBodySchema = z.object({ name: channelNameSchema });

router.get('/:projectId/channels', async (c) => {
  const userId = c.get('clerkUserId');
  const db = c.get('db');

  const idParse = uuidParam.safeParse(c.req.param('projectId'));
  if (!idParse.success) return c.json({ error: 'not_found' }, 404);

  const project = await findOwnedProject(db, idParse.data, userId);
  if (!project) return c.json({ error: 'not_found' }, 404);

  const list = await db.query.channels.findMany({
    where: eq(channels.projectId, project.id),
    with: {
      currentBundle: {
        columns: { id: true, version: true, uploadedAt: true },
      },
    },
    orderBy: [asc(channels.createdAt)],
  });

  return c.json({ channels: list });
});

router.post('/:projectId/channels', async (c) => {
  const userId = c.get('clerkUserId');
  const db = c.get('db');

  const idParse = uuidParam.safeParse(c.req.param('projectId'));
  if (!idParse.success) return c.json({ error: 'not_found' }, 404);

  const project = await findOwnedProject(db, idParse.data, userId);
  if (!project) return c.json({ error: 'not_found' }, 404);

  const raw = await c.req.json().catch(() => null);
  const parsed = createBodySchema.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }

  try {
    const [channel] = await db
      .insert(channels)
      .values({ projectId: project.id, name: parsed.data.name })
      .returning();
    return c.json({ channel }, 201);
  } catch (err) {
    if (isUniqueViolation(err, 'channels_project_name_unique')) {
      return c.json({ error: 'channel_exists', name: parsed.data.name }, 409);
    }
    throw err;
  }
});

router.delete('/:projectId/channels/:channelId', async (c) => {
  const userId = c.get('clerkUserId');
  const db = c.get('db');

  const projectIdParse = uuidParam.safeParse(c.req.param('projectId'));
  const channelIdParse = uuidParam.safeParse(c.req.param('channelId'));
  if (!projectIdParse.success || !channelIdParse.success) {
    return c.json({ error: 'not_found' }, 404);
  }

  const project = await findOwnedProject(db, projectIdParse.data, userId);
  if (!project) return c.json({ error: 'not_found' }, 404);

  const [deleted] = await db
    .delete(channels)
    .where(and(eq(channels.id, channelIdParse.data), eq(channels.projectId, project.id)))
    .returning({ id: channels.id });

  if (!deleted) return c.json({ error: 'not_found' }, 404);
  return c.json({ ok: true });
});

export default router;
