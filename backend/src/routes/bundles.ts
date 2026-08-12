import { Hono } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import { bundles } from '../db/schema';
import { getPresignedUploadUrl, bundleStorageKey } from '../lib/r2';
import { findOwnedProject } from '../lib/projectOwnership';
import { isUniqueViolation } from '../lib/pgErrors';
import type { AppEnv } from '../types';

const router = new Hono<AppEnv>();

const uuidParam = z.string().uuid();
const semverString = z
  .string()
  .regex(/^\d+\.\d+\.\d+(?:[-+][a-zA-Z0-9.-]+)?$/, 'must be valid semver (e.g. 1.0.0)');

const PRESIGN_TTL_SECONDS = 60 * 15;

const presignBodySchema = z.object({
  version: semverString,
});

const registerBodySchema = z.object({
  version: semverString,
  bundleSize: z.number().int().positive(),
  assetsSize: z.number().int().nonnegative().default(0),
  minNativeVersion: semverString,
  description: z.string().max(2000).optional().nullable(),
});

router.post('/:projectId/bundles/upload-url', async (c) => {
  const userId = c.get('clerkUserId');
  const db = c.get('db');
  // Guard 1: is the project ID a valid UUID format?

  const idParse = uuidParam.safeParse(c.req.param('projectId'));
  if (!idParse.success) return c.json({ error: 'not_found' }, 404);
  // Guard 2: does THIS project belong to THIS user?

  const project = await findOwnedProject(db, idParse.data, userId);
  if (!project) return c.json({ error: 'not_found' }, 404);
  // Guard 3: is the body shape valid? (must have a semver version)

  const raw = await c.req.json().catch(() => null);
  const parsed = presignBodySchema.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }
  // Guard 4: has someone already uploaded this version?

  const existing = await db.query.bundles.findFirst({
    where: and(eq(bundles.projectId, project.id), eq(bundles.version, parsed.data.version)),
  });
  if (existing) {
    return c.json({ error: 'version_exists', version: parsed.data.version }, 409);
  }

  const bundleKey = bundleStorageKey(project.projectKey, parsed.data.version, 'index.android.bundle');
  const assetsKey = bundleStorageKey(project.projectKey, parsed.data.version, 'assets.zip');

  const [bundleUploadUrl, assetsUploadUrl] = await Promise.all([
    getPresignedUploadUrl(c.env, bundleKey, 'application/octet-stream'),
    getPresignedUploadUrl(c.env, assetsKey, 'application/zip'),
  ]);

  return c.json({
    storagePath: `${project.projectKey}/${parsed.data.version}`,
    uploads: {
      bundle: { url: bundleUploadUrl, key: bundleKey, contentType: 'application/octet-stream' },
      assets: { url: assetsUploadUrl, key: assetsKey, contentType: 'application/zip' },
    },
    expiresInSeconds: PRESIGN_TTL_SECONDS,
  });
});

router.post('/:projectId/bundles', async (c) => {
  const userId = c.get('clerkUserId');
  const db = c.get('db');

  const idParse = uuidParam.safeParse(c.req.param('projectId'));
  if (!idParse.success) return c.json({ error: 'not_found' }, 404);

  const project = await findOwnedProject(db, idParse.data, userId);
  if (!project) return c.json({ error: 'not_found' }, 404);

  const raw = await c.req.json().catch(() => null);
  const parsed = registerBodySchema.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }

  try {
    const [bundle] = await db
      .insert(bundles)
      .values({
        projectId: project.id,
        version: parsed.data.version,
        storagePath: `${project.projectKey}/${parsed.data.version}`,
        bundleSize: parsed.data.bundleSize,
        assetsSize: parsed.data.assetsSize,
        minNativeVersion: parsed.data.minNativeVersion,
        description: parsed.data.description ?? null,
        uploadedBy: userId,
      })
      .returning();

    return c.json({ bundle }, 201);
  } catch (err) {
    if (isUniqueViolation(err, 'bundles_project_version_unique')) {
      return c.json({ error: 'version_exists', version: parsed.data.version }, 409);
    }
    throw err;
  }
});

router.get('/:projectId/bundles', async (c) => {
  const userId = c.get('clerkUserId');
  const db = c.get('db');

  const idParse = uuidParam.safeParse(c.req.param('projectId'));
  if (!idParse.success) return c.json({ error: 'not_found' }, 404);

  const project = await findOwnedProject(db, idParse.data, userId);
  if (!project) return c.json({ error: 'not_found' }, 404);

  const list = await db.query.bundles.findMany({
    where: eq(bundles.projectId, project.id),
    orderBy: [desc(bundles.uploadedAt)],
  });

  return c.json({ bundles: list });
});

router.delete('/:projectId/bundles/:bundleId', async (c) => {
  const userId = c.get('clerkUserId');
  const db = c.get('db');

  const projectIdParse = uuidParam.safeParse(c.req.param('projectId'));
  const bundleIdParse = uuidParam.safeParse(c.req.param('bundleId'));
  if (!projectIdParse.success || !bundleIdParse.success) {
    return c.json({ error: 'not_found' }, 404);
  }

  const project = await findOwnedProject(db, projectIdParse.data, userId);
  if (!project) return c.json({ error: 'not_found' }, 404);

  const [updated] = await db
    .update(bundles)
    .set({ isActive: false })
    .where(
      and(
        eq(bundles.id, bundleIdParse.data),
        eq(bundles.projectId, project.id),
        eq(bundles.isActive, true)
      )
    )
    .returning({ id: bundles.id });

  if (!updated) return c.json({ error: 'not_found' }, 404);
  return c.json({ ok: true });
});

export default router;
