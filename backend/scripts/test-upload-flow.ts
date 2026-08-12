import 'dotenv/config';
import { config as loadEnv } from 'dotenv';
import { readFileSync } from 'node:fs';

loadEnv({ path: '.dev.vars' });

const API = process.env.API_URL ?? 'http://localhost:8787';
const tokens = JSON.parse(readFileSync('.test-tokens.json', 'utf8'));
const ALICE = tokens.alice.jwt;

const FAKE_BUNDLE = Buffer.from(
  '// Fake bundle for end-to-end test\nconsole.log("hello from rn-pushdeck v1.0.0");\n'.repeat(20)
);
const FAKE_ASSETS = Buffer.from('PK\x03\x04 fake zip content for testing');

async function step(label: string, fn: () => Promise<unknown>) {
  process.stdout.write(`${label}... `);
  try {
    const result = await fn();
    console.log('OK');
    return result;
  } catch (err) {
    console.log('FAILED');
    throw err;
  }
}

async function main() {
  // 1. Create a project for Alice
  const projectRes: any = await step('Creating project', async () => {
    const r = await fetch(`${API}/v1/projects`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ALICE}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Upload Flow Test' }),
    });
    if (!r.ok) throw new Error(`status ${r.status}: ${await r.text()}`);
    return r.json();
  });
  const project = projectRes.project;
  console.log(`   projectId:  ${project.id}`);
  console.log(`   projectKey: ${project.projectKey}`);

  // 2. Request presigned upload URLs for v1.0.0
  const presignRes: any = await step('Requesting presigned URLs', async () => {
    const r = await fetch(`${API}/v1/projects/${project.id}/bundles/upload-url`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ALICE}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: '1.0.0' }),
    });
    if (!r.ok) throw new Error(`status ${r.status}: ${await r.text()}`);
    return r.json();
  });
  console.log(`   bundle URL host: ${new URL(presignRes.uploads.bundle.url).host}`);
  console.log(`   storagePath:     ${presignRes.storagePath}`);

  // 3. PUT the fake bundle to R2 directly
  await step('Uploading bundle to R2', async () => {
    const r = await fetch(presignRes.uploads.bundle.url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: FAKE_BUNDLE,
    });
    if (!r.ok) throw new Error(`status ${r.status}: ${await r.text()}`);
  });

  // 4. PUT the fake assets zip to R2 directly
  await step('Uploading assets to R2', async () => {
    const r = await fetch(presignRes.uploads.assets.url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/zip' },
      body: FAKE_ASSETS,
    });
    if (!r.ok) throw new Error(`status ${r.status}: ${await r.text()}`);
  });

  // 5. Register the bundle row in our DB
  const registerRes: any = await step('Registering bundle in DB', async () => {
    const r = await fetch(`${API}/v1/projects/${project.id}/bundles`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ALICE}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version: '1.0.0',
        bundleSize: FAKE_BUNDLE.length,
        assetsSize: FAKE_ASSETS.length,
        minNativeVersion: '1.0.0',
        description: 'End-to-end test bundle',
      }),
    });
    if (!r.ok) throw new Error(`status ${r.status}: ${await r.text()}`);
    return r.json();
  });
  console.log(`   bundleId: ${registerRes.bundle.id}`);

  // 6. List bundles for the project
  const listRes: any = await step('Listing bundles', async () => {
    const r = await fetch(`${API}/v1/projects/${project.id}/bundles`, {
      headers: { Authorization: `Bearer ${ALICE}` },
    });
    if (!r.ok) throw new Error(`status ${r.status}: ${await r.text()}`);
    return r.json();
  });
  console.log(`   bundles returned: ${listRes.bundles.length}`);

  // 7. Verify the bundle is publicly downloadable from R2
  const publicBundleUrl = `${process.env.R2_PUBLIC_URL?.replace(/\/$/, '')}/${presignRes.uploads.bundle.key}`;
  console.log(`\n   Public bundle URL: ${publicBundleUrl}`);
  await step('Verifying public R2 download', async () => {
    const r = await fetch(publicBundleUrl);
    if (!r.ok) throw new Error(`status ${r.status}`);
    const bytes = await r.arrayBuffer();
    if (bytes.byteLength !== FAKE_BUNDLE.length) {
      throw new Error(`size mismatch: got ${bytes.byteLength}, expected ${FAKE_BUNDLE.length}`);
    }
  });

  // 8. Reject duplicate version
  await step('Rejecting duplicate version (must 409)', async () => {
    const r = await fetch(`${API}/v1/projects/${project.id}/bundles/upload-url`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ALICE}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: '1.0.0' }),
    });
    if (r.status !== 409) throw new Error(`expected 409, got ${r.status}`);
  });

  // 9. Cleanup — delete the test project
  await step('Cleaning up (deleting project)', async () => {
    const r = await fetch(`${API}/v1/projects/${project.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ALICE}` },
    });
    if (!r.ok) throw new Error(`status ${r.status}`);
  });

  console.log('\n✓ Upload flow end-to-end test passed.');
}

main().catch((err) => {
  console.error('\n✗ Test failed:', err);
  process.exit(1);
});
