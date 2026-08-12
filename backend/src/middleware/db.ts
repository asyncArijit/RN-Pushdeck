import type { MiddlewareHandler } from 'hono';
import { createDb } from '../db/client';
import type { AppEnv } from '../types';

export const dbMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  c.set('db', createDb(c.env.DATABASE_URL));
  await next();
};
