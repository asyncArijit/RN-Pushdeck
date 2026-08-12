import { Hono } from 'hono';
import type { AppEnv } from '../types';

const webhooks = new Hono<AppEnv>();

webhooks.post('/clerk', (c) => c.json({ error: 'not_implemented' }, 501));

export default webhooks;
