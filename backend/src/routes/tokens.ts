import { Hono } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import { apiTokens } from '../db/schema';
import { generateRawToken, hashToken, tokenPrefixOf } from '../lib/apiTokens';
import type { AppEnv } from '../types';

const router = new Hono<AppEnv>();

const uuidParam = z.string().uuid();
const createBodySchema = z.object({
  name: z.string().trim().min(1).max(100),
});

router.get('/', async (c) => {
  const userId = c.get('clerkUserId');
  const db = c.get('db');

  const list = await db
    .select({
      id: apiTokens.id,
      name: apiTokens.name,
      tokenPrefix: apiTokens.tokenPrefix,
      createdAt: apiTokens.createdAt,
      lastUsedAt: apiTokens.lastUsedAt,
      revokedAt: apiTokens.revokedAt,
    })
    .from(apiTokens)
    .where(eq(apiTokens.clerkUserId, userId))
    .orderBy(desc(apiTokens.createdAt));

  return c.json({ tokens: list });
});

router.post('/', async (c) => {
  const userId = c.get('clerkUserId');
  const db = c.get('db');

  const raw = await c.req.json().catch(() => null);
  const parsed = createBodySchema.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }

  const rawToken = generateRawToken();
  const hash = await hashToken(rawToken);
  const prefix = tokenPrefixOf(rawToken);

  const [row] = await db
    .insert(apiTokens)
    .values({
      clerkUserId: userId,
      name: parsed.data.name,
      tokenHash: hash,
      tokenPrefix: prefix,
    })
    .returning({
      id: apiTokens.id,
      name: apiTokens.name,
      tokenPrefix: apiTokens.tokenPrefix,
      createdAt: apiTokens.createdAt,
    });

  return c.json({ token: row, rawToken }, 201);
});

router.delete('/:id', async (c) => {
  const userId = c.get('clerkUserId');
  const db = c.get('db');

  const idParse = uuidParam.safeParse(c.req.param('id'));
  if (!idParse.success) return c.json({ error: 'not_found' }, 404);

  const [updated] = await db
    .update(apiTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiTokens.id, idParse.data), eq(apiTokens.clerkUserId, userId)))
    .returning({ id: apiTokens.id });

  if (!updated) return c.json({ error: 'not_found' }, 404);
  return c.json({ ok: true });
});

export default router;
