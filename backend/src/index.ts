import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import type { AppEnv } from './types';
import { clerkAuth } from './middleware/auth';
import { dbMiddleware } from './middleware/db';

import manifest from './routes/manifest';
import projects from './routes/projects';
import channels from './routes/channels';
import bundles from './routes/bundles';
import deployments from './routes/deployments';
import webhooks from './routes/webhooks';
import tokens from './routes/tokens';

const app = new Hono<AppEnv>();

app.use('*', logger());
app.use('*', cors());
app.use('*', dbMiddleware);

app.get('/', (c) => c.json({ service: 'rn-pushdeck', status: 'ok' }));
app.get('/health', (c) => c.json({ ok: true }));

app.route('/v1/manifest', manifest);
app.route('/v1/webhooks', webhooks);

const v1 = new Hono<AppEnv>();
v1.use('*', clerkAuth);

v1.route('/projects', projects);
v1.route('/projects', channels);
v1.route('/projects', bundles);
v1.route('/projects', deployments);
v1.route('/tokens', tokens);

app.route('/v1', v1);

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'internal_server_error' }, 500);
});

app.notFound((c) => c.json({ error: 'not_found' }, 404));

export default app;
