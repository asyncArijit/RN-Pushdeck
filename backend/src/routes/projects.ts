import { Hono } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import { projects, channels } from '../db/schema';
import { generateProjectKey } from '../lib/projectKey';
import type { AppEnv } from '../types';

const router = new Hono<AppEnv>();

const uuidParam = z.string().uuid();

const createBodySchema = z.object({
  name: z.string().trim().min(1).max(100),
});

const patchBodySchema = z.object({
  name: z.string().trim().min(1).max(100),
});
.
router.get('/', async (c) => {
  const userId = c.get('clerkUserId');
  const db = c.get('db');

  const list = await db.query.projects.findMany({
    where: eq(projects.clerkUserId, userId),
    with: {
      channels: {
        columns: { id: true, name: true, currentBundleId: true, createdAt: true },
        with: {
          currentBundle: { columns: { version: true } },
        },
      },
    },
    orderBy: [desc(projects.createdAt)],
  });

  return c.json({ projects: list });
});

router.post('/', async (c) => {
  const userId = c.get('clerkUserId');
  const db = c.get('db');

  const raw = await c.req.json().catch(() => null);
  const parsed = createBodySchema.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }

  let inserted: typeof projects.$inferSelect | undefined;
  let lastError: unknown;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      [inserted] = await db
        .insert(projects)
        .values({
          clerkUserId: userId,
          name: parsed.data.name,
          projectKey: generateProjectKey(),
        })
        .returning();
      break;
    } catch (err) {
      lastError = err;
    }
  }
  if (!inserted) throw lastError ?? new Error('failed_to_create_project');

  await db.insert(channels).values({
    projectId: inserted.id,
    name: 'production',
  });

  return c.json({ project: inserted }, 201);
});

router.get('/:id', async (c) => {
  const userId = c.get('clerkUserId');
  const db = c.get('db');

  const idParse = uuidParam.safeParse(c.req.param('id'));
  if (!idParse.success) return c.json({ error: 'not_found' }, 404);

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, idParse.data), eq(projects.clerkUserId, userId)),
    with: {
      channels: {
        with: {
          currentBundle: {
            columns: { version: true, uploadedAt: true, bundleSize: true },
          },
        },
      },
    },
  });

  if (!project) return c.json({ error: 'not_found' }, 404);
  return c.json({ project });
});

router.patch('/:id', async (c) => {
  const userId = c.get('clerkUserId');
  const db = c.get('db');

  const idParse = uuidParam.safeParse(c.req.param('id'));
  if (!idParse.success) return c.json({ error: 'not_found' }, 404);

  const raw = await c.req.json().catch(() => null);
  const parsed = patchBodySchema.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }

  const [updated] = await db
    .update(projects)
    .set({ name: parsed.data.name, updatedAt: new Date() })
    .where(and(eq(projects.id, idParse.data), eq(projects.clerkUserId, userId)))
    .returning();

  if (!updated) return c.json({ error: 'not_found' }, 404);
  return c.json({ project: updated });
});

router.delete('/:id', async (c) => {
  const userId = c.get('clerkUserId');
  const db = c.get('db');

  const idParse = uuidParam.safeParse(c.req.param('id'));
  if (!idParse.success) return c.json({ error: 'not_found' }, 404);

  const [deleted] = await db
    .delete(projects)
    .where(and(eq(projects.id, idParse.data), eq(projects.clerkUserId, userId)))
    .returning({ id: projects.id });

  if (!deleted) return c.json({ error: 'not_found' }, 404);
  return c.json({ ok: true });
});

export default router;
