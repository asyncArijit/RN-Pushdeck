import 'dotenv/config';
import { config as loadEnv } from 'dotenv';
import { readFileSync } from 'node:fs';

loadEnv({ path: '.dev.vars' });

const API = process.env.API_URL ?? 'http://localhost:8787';
const tokens = JSON.parse(readFileSync('.test-tokens.json', 'utf8'));
const ALICE = tokens.alice.jwt;

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

async function req(method: string, path: string, body?: unknown, expectStatus = 200) {
  const r = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${ALICE}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (r.status !== expectStatus) {
    throw new Error(`${method} ${path}: expected ${expectStatus}, got ${r.status}: ${await r.text()}`);
  }
  return r.json();
}

async function pubReq(path: string) {
  const r = await fetch(`${API}${path}`);
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json() as any;
}

async function registerBundle(projectId: string, version: string) {
  await req('POST', `/v1/projects/${projectId}/bundles/upload-url`, { version });
  // skip actual R2 upload; we only need the DB row for promotion tests
  return req('POST', `/v1/projects/${projectId}/bundles`, {
    version,
    bundleSize: 100,
    assetsSize: 50,
    minNativeVersion: '1.0.0',
    description: `Test bundle ${version}`,
  }, 201);
}

async function main() {
  // 1. Setup: create project (auto-creates production channel)
  const { project }: any = await step('Creating project', () =>
    req('POST', '/v1/projects', { name: 'Promotion Flow Test' }, 201)
  );
  console.log(`   projectId: ${project.id}`);
  console.log(`   projectKey: ${project.projectKey}`);

  // 2. List channels (should be just production)
  const channelsList: any = await step('Listing channels', () =>
    req('GET', `/v1/projects/${project.id}/channels`)
  );
  console.log(`   channels: ${channelsList.channels.map((c: any) => c.name).join(', ')}`);
  if (channelsList.channels.length !== 1 || channelsList.channels[0].name !== 'production') {
    throw new Error('expected exactly one production channel');
  }

  // 3. Create additional channel "preview"
  const previewRes: any = await step('Creating preview channel', () =>
    req('POST', `/v1/projects/${project.id}/channels`, { name: 'preview' }, 201)
  );
  console.log(`   previewChannelId: ${previewRes.channel.id}`);

  // 4. Reject duplicate channel name
  await step('Rejecting duplicate channel (must 409)', () =>
    req('POST', `/v1/projects/${project.id}/channels`, { name: 'preview' }, 409)
  );

  // 5. Reject invalid channel name format
  await step('Rejecting bad channel name (must 400)', () =>
    req('POST', `/v1/projects/${project.id}/channels`, { name: 'Has Spaces' }, 400)
  );

  // 6. Register 3 bundles
  const b1: any = await step('Registering bundle 1.0.0', () => registerBundle(project.id, '1.0.0'));
  const b2: any = await step('Registering bundle 1.0.1', () => registerBundle(project.id, '1.0.1'));
  const b3: any = await step('Registering bundle 1.0.2', () => registerBundle(project.id, '1.0.2'));

  // 7. Promote b1 to production
  await step('Promoting 1.0.0 to production', () =>
    req('POST', `/v1/projects/${project.id}/channels/production/promote`, {
      bundleId: b1.bundle.id,
      notes: 'Initial release',
    })
  );

  // 8. Verify manifest now returns 1.0.0
  const m1 = await step('Manifest returns 1.0.0', () =>
    pubReq(`/v1/manifest/${project.projectKey}/production`)
  ) as any;
  if (m1.version !== '1.0.0') throw new Error(`manifest version mismatch: ${m1.version}`);
  console.log(`   manifest version: ${m1.version}`);

  // 9. Promote b2 to production
  await step('Promoting 1.0.1 to production', () =>
    req('POST', `/v1/projects/${project.id}/channels/production/promote`, {
      bundleId: b2.bundle.id,
    })
  );

  // 10. Verify manifest updated
  const m2 = await step('Manifest returns 1.0.1', () =>
    pubReq(`/v1/manifest/${project.projectKey}/production`)
  ) as any;
  if (m2.version !== '1.0.1') throw new Error(`manifest version mismatch: ${m2.version}`);

  // 11. Promote b3 to production
  await step('Promoting 1.0.2 to production', () =>
    req('POST', `/v1/projects/${project.id}/channels/production/promote`, {
      bundleId: b3.bundle.id,
    })
  );

  // 12. Promote b2 to preview channel
  await step('Promoting 1.0.1 to preview', () =>
    req('POST', `/v1/projects/${project.id}/channels/preview/promote`, {
      bundleId: b2.bundle.id,
    })
  );

  // 13. Two channels now have different versions
  const mPreview = (await pubReq(`/v1/manifest/${project.projectKey}/preview`)) as any;
  const mProd = (await pubReq(`/v1/manifest/${project.projectKey}/production`)) as any;
  console.log(`   production manifest: ${mProd.version}`);
  console.log(`   preview manifest:    ${mPreview.version}`);
  if (mProd.version !== '1.0.2' || mPreview.version !== '1.0.1') {
    throw new Error('channels diverged incorrectly');
  }

  // 14. Rollback production → should go back to 1.0.1 (previous deployment)
  const rollbackRes: any = await step('Rollback production (no target → previous)', () =>
    req('POST', `/v1/projects/${project.id}/channels/production/rollback`, {})
  );
  console.log(`   rolled back to: ${rollbackRes.bundle.version}`);
  if (rollbackRes.bundle.version !== '1.0.1') {
    throw new Error(`rollback went to wrong version: ${rollbackRes.bundle.version}`);
  }

  // 15. Manifest reflects rollback
  const mRollback = (await pubReq(`/v1/manifest/${project.projectKey}/production`)) as any;
  if (mRollback.version !== '1.0.1') throw new Error('manifest did not reflect rollback');

  // 16. Targeted rollback to 1.0.0
  await step('Targeted rollback to 1.0.0', () =>
    req('POST', `/v1/projects/${project.id}/channels/production/rollback`, {
      toBundleId: b1.bundle.id,
      notes: 'Manual rollback',
    })
  );
  const mTargeted = (await pubReq(`/v1/manifest/${project.projectKey}/production`)) as any;
  if (mTargeted.version !== '1.0.0') throw new Error('targeted rollback failed');

  // 17. Audit log
  const auditRes: any = await step('Reading audit log', () =>
    req('GET', `/v1/projects/${project.id}/deployments`)
  );
  console.log(`   audit entries: ${auditRes.deployments.length}`);
  console.log('   actions:', auditRes.deployments.map((d: any) => `${d.action}/${d.bundle.version}@${d.channel.name}`).join(', '));
  if (auditRes.deployments.length !== 6) {
    throw new Error(`expected 6 audit entries (4 promotes + 2 rollbacks), got ${auditRes.deployments.length}`);
  }

  // 18. Filter audit log by channel
  const auditPreview: any = await step('Audit log filtered by preview channel', () =>
    req('GET', `/v1/projects/${project.id}/deployments?channelId=${previewRes.channel.id}`)
  );
  if (auditPreview.deployments.length !== 1) {
    throw new Error(`expected 1 preview audit entry, got ${auditPreview.deployments.length}`);
  }

  // 19. Delete preview channel
  await step('Deleting preview channel', () =>
    req('DELETE', `/v1/projects/${project.id}/channels/${previewRes.channel.id}`)
  );

  // 20. Cleanup
  await step('Cleanup (delete project)', () =>
    req('DELETE', `/v1/projects/${project.id}`)
  );

  console.log('\n✓ Promotion flow end-to-end test passed.');
}

main().catch((err) => {
  console.error('\n✗ Test failed:', err);
  process.exit(1);
});
