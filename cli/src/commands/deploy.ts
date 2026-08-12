import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { resolveClient } from '../client.js';
import { apiFetch, putToR2, ApiError } from '../api.js';
import { info, step, stepDone, stepFail, fail, success, bold, dim, formatSize, warn } from '../ui.js';
import { compileBundleIfNeeded, cleanupCompiled } from '../hermes.js';
import { detectAndroidVersionName } from '../androidVersion.js';

type DeployOptions = {
  project: string;
  version: string;
  bundle: string;
  assets?: string;
  minNative?: string;
  notes?: string;
  promote?: string;
};

type Project = { id: string; projectKey: string; name: string };
type PresignResponse = {
  storagePath: string;
  uploads: {
    bundle: { url: string; key: string; contentType: string };
    assets: { url: string; key: string; contentType: string };
  };
  expiresInSeconds: number;
};

async function findProject(client: ReturnType<typeof resolveClient>, ref: string): Promise<Project> {
  if (!client) throw new Error('not_signed_in');
  const res = await apiFetch<{ projects: (Project & { id: string })[] }>(client, '/v1/projects');
  const match = res.projects.find((p) => p.id === ref || p.projectKey === ref);
  if (!match) {
    throw new Error(
      `No project matching "${ref}". Run \`pushdeck projects\` to see what's available.`
    );
  }
  return match;
}

export async function deployCommand(opts: DeployOptions) {
  const client = resolveClient();
  if (!client) {
    fail('Not signed in. Run `pushdeck login` first.');
    process.exit(1);
  }

  const originalBundlePath = resolve(opts.bundle);
  if (!existsSync(originalBundlePath)) {
    fail(`Bundle file not found: ${originalBundlePath}`);
    process.exit(1);
  }

  step('Detecting bundle format');
  let compileResult;
  try {
    compileResult = compileBundleIfNeeded(originalBundlePath);
    if (compileResult.kind === 'already-bytecode') {
      stepDone(dim('Hermes bytecode'));
    } else if (compileResult.kind === 'compiled') {
      stepDone(dim('compiled JS → Hermes bytecode'));
    } else if (compileResult.kind === 'skipped-jsc-project') {
      stepDone(dim('JSC project — uploading plain JS'));
    } else {
      stepDone();
      warn('hermesc not found in node_modules — uploading plain JS. Apps using Hermes may fail to load this bundle.');
    }
  } catch (err) {
    stepFail();
    fail(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  const bundlePath = compileResult.path;
  const bundleBytes = readFileSync(bundlePath);
  const bundleStat = statSync(bundlePath);

  let assetsBytes: Buffer | null = null;
  let assetsStat = { size: 0 };
  if (opts.assets) {
    const assetsPath = resolve(opts.assets);
    if (!existsSync(assetsPath)) {
      fail(`Assets file not found: ${assetsPath}`);
      cleanupCompiled(compileResult);
      process.exit(1);
    }
    assetsBytes = readFileSync(assetsPath);
    assetsStat = statSync(assetsPath);
  }

  let effectiveMinNative = opts.minNative;
  if (!effectiveMinNative) {
    const detected = detectAndroidVersionName(dirname(originalBundlePath));
    if (detected) {
      effectiveMinNative = detected;
      info(`Auto-detected min native version from android/app/build.gradle: ${bold(detected)}`);
    } else {
      effectiveMinNative = opts.version;
    }
  }

  info(`Deploying ${bold(`v${opts.version}`)} (${formatSize(bundleStat.size)} bundle${assetsBytes ? ` + ${formatSize(assetsStat.size)} assets` : ''})`);

  step('Resolving project');
  let project: Project;
  try {
    project = await findProject(client, opts.project);
    stepDone(dim(`${project.name} (${project.projectKey})`));
  } catch (err) {
    stepFail();
    fail(err instanceof Error ? err.message : String(err));
    cleanupCompiled(compileResult);
    process.exit(1);
  }

  step('Requesting upload URLs');
  let presign: PresignResponse;
  try {
    presign = await apiFetch<PresignResponse>(client, `/v1/projects/${project.id}/bundles/upload-url`, {
      method: 'POST',
      body: { version: opts.version },
    });
    stepDone();
  } catch (err) {
    stepFail();
    if (err instanceof ApiError && err.status === 409) {
      fail(`Version ${opts.version} already exists. Bump it and try again.`);
    } else {
      fail(err instanceof Error ? err.message : String(err));
    }
    cleanupCompiled(compileResult);
    process.exit(1);
  }

  step('Uploading bundle');
  try {
    await putToR2(presign.uploads.bundle.url, new Uint8Array(bundleBytes), presign.uploads.bundle.contentType);
    stepDone();
  } catch (err) {
    stepFail();
    fail(err instanceof Error ? err.message : String(err));
    cleanupCompiled(compileResult);
    process.exit(1);
  }

  if (assetsBytes) {
    step('Uploading assets');
    try {
      await putToR2(presign.uploads.assets.url, new Uint8Array(assetsBytes), presign.uploads.assets.contentType);
      stepDone();
    } catch (err) {
      stepFail();
      fail(err instanceof Error ? err.message : String(err));
      cleanupCompiled(compileResult);
      process.exit(1);
    }
  }

  step('Registering bundle');
  let bundleId: string;
  try {
    const res = await apiFetch<{ bundle: { id: string; version: string } }>(client, `/v1/projects/${project.id}/bundles`, {
      method: 'POST',
      body: {
        version: opts.version,
        bundleSize: bundleStat.size,
        assetsSize: assetsStat.size,
        minNativeVersion: effectiveMinNative,
        description: opts.notes ?? null,
      },
    });
    bundleId = res.bundle.id;
    stepDone(dim(bundleId));
  } catch (err) {
    stepFail();
    fail(err instanceof Error ? err.message : String(err));
    cleanupCompiled(compileResult);
    process.exit(1);
  }

  if (opts.promote) {
    step(`Promoting to ${opts.promote}`);
    try {
      await apiFetch<{ ok: true }>(client, `/v1/projects/${project.id}/channels/${opts.promote}/promote`, {
        method: 'POST',
        body: { bundleId, notes: opts.notes },
      });
      stepDone();
    } catch (err) {
      stepFail();
      fail(err instanceof Error ? err.message : String(err));
      cleanupCompiled(compileResult);
      process.exit(1);
    }
  }

  cleanupCompiled(compileResult);
  console.log();
  success(`Shipped v${opts.version}${opts.promote ? ` to ${bold(opts.promote)}` : ''}`);
}
