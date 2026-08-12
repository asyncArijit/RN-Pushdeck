import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const KEYS = [
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY',
  'NEXT_PUBLIC_CLERK_SIGN_IN_URL',
  'NEXT_PUBLIC_CLERK_SIGN_UP_URL',
  'NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL',
  'NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL',
  'NEXT_PUBLIC_API_URL',
];

const raw = readFileSync('.env.local', 'utf8');
const parsed = {};
for (const line of raw.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq === -1) continue;
  const k = trimmed.slice(0, eq).trim();
  let v = trimmed.slice(eq + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  parsed[k] = v;
}

function tryAdd(key, value, env) {
  const res = spawnSync(
    'npx',
    ['vercel', 'env', 'add', key, env, '--value', value, '--yes'],
    { stdio: ['ignore', 'pipe', 'pipe'], shell: true, encoding: 'utf8' }
  );
  const out = (res.stdout || '') + (res.stderr || '');
  if (out.includes('already exists') || out.toLowerCase().includes('exists')) return 'exists';
  if (res.status === 0 || out.includes('Added') || out.includes('Created')) return 'added';
  return { error: out.slice(0, 400) };
}

for (const key of KEYS) {
  const value = parsed[key];
  if (!value) {
    console.log(`SKIP ${key} (not set in .env.local)`);
    continue;
  }
  for (const env of ['production', 'development']) {
    process.stdout.write(`  ${env}: ${key}... `);
    const result = tryAdd(key, value, env);
    if (typeof result === 'string') {
      console.log(result);
    } else {
      console.log('FAILED');
      console.log('  ', result.error.replace(/\n/g, '\n   '));
    }
  }
}

console.log('\nDone.');
