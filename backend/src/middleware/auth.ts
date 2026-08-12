import { createClerkClient, verifyToken } from '@clerk/backend';
import { eq, and, isNull } from 'drizzle-orm';
import type { MiddlewareHandler } from 'hono';
import { apiTokens } from '../db/schema';
import { hashToken, looksLikeApiToken } from '../lib/apiTokens';
import type { AppEnv } from '../types';

export const clerkAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'missing_authorization_header' }, 401);
  }

  const token = authHeader.slice(7);

  if (looksLikeApiToken(token)) {
    const db = c.get('db');
    const hash = await hashToken(token);
    const row = await db.query.apiTokens.findFirst({
      where: and(eq(apiTokens.tokenHash, hash), isNull(apiTokens.revokedAt)),
    });
    if (!row) return c.json({ error: 'invalid_token' }, 401);

    db.update(apiTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiTokens.id, row.id))
      .then(() => undefined)
      .catch(() => undefined);

    c.set('clerkUserId', row.clerkUserId);
    c.set('clerk', createClerkClient({ secretKey: c.env.CLERK_SECRET_KEY }));
    await next();
    return;
  }

  try {
    const payload = await verifyToken(token, {
      secretKey: c.env.CLERK_SECRET_KEY,
    });

    if (!payload.sub) {
      return c.json({ error: 'invalid_token' }, 401);
    }

    c.set('clerkUserId', payload.sub);
    c.set('clerk', createClerkClient({ secretKey: c.env.CLERK_SECRET_KEY }));
    await next();
  } catch {
    return c.json({ error: 'invalid_token' }, 401);
  }
};
