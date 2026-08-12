import 'dotenv/config';
import { config as loadEnv } from 'dotenv';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import * as schema from '../src/db/schema';

loadEnv({ path: '.dev.vars' });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL not set');

const sql = neon(databaseUrl);
const db = drizzle(sql, { schema });

const TEST_PROJECT_KEY = 'psh_seed_demo_0001';
const TEST_CLERK_USER = 'user_seed_fake_clerk_id';

async function seed() {
  console.log('Clearing existing seed data...');
  await db.delete(schema.projects).where(eq(schema.projects.projectKey, TEST_PROJECT_KEY));

  console.log('Inserting project...');
  const [project] = await db
    .insert(schema.projects)
    .values({
      clerkUserId: TEST_CLERK_USER,
      name: 'Seed Demo Project',
      projectKey: TEST_PROJECT_KEY,
    })
    .returning();
  console.log('  project.id:', project.id);

  console.log('Inserting bundle v1.0.0...');
  const [bundle] = await db
    .insert(schema.bundles)
    .values({
      projectId: project.id,
      version: '1.0.0',
      storagePath: `${TEST_PROJECT_KEY}/v1.0.0`,
      bundleSize: 3_500_000,
      assetsSize: 1_200_000,
      minNativeVersion: '1.0.0',
      description: 'Initial seed release — used for end-to-end testing.',
      uploadedBy: TEST_CLERK_USER,
    })
    .returning();
  console.log('  bundle.id:', bundle.id);

  console.log('Inserting production channel pointing at bundle...');
  const [channel] = await db
    .insert(schema.channels)
    .values({
      projectId: project.id,
      name: 'production',
      currentBundleId: bundle.id,
    })
    .returning();
  console.log('  channel.id:', channel.id);

  console.log('Inserting deployment audit row...');
  await db.insert(schema.deployments).values({
    projectId: project.id,
    channelId: channel.id,
    bundleId: bundle.id,
    action: 'promote',
    actorClerkUserId: TEST_CLERK_USER,
    notes: 'Initial seed deployment',
  });

  console.log('\n✓ Seed complete.');
  console.log(`  Test URL: GET /v1/manifest/${TEST_PROJECT_KEY}/production`);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
