import 'dotenv/config';
import { config as loadEnv } from 'dotenv';
import { writeFileSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

loadEnv({ path: '.dev.vars' });

const SECRET_KEYS = [
  'DATABASE_URL',
  'CLERK_SECRET_KEY',
  'CLERK_PUBLISHABLE_KEY',
  'CLERK_WEBHOOK_SECRET',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET',
  'R2_PUBLIC_URL',
];

const out: Record<string, string> = {};
const missing: string[] = [];
for (const key of SECRET_KEYS) {
  const value = process.env[key];
  if (!value || value.includes('xxxx') || value.includes('...')) {
    missing.push(key);
    continue;
  }
  out[key] = value;
}

console.log('Will push these secrets to Cloudflare:');
for (const key of Object.keys(out)) {
  console.log(`  ${key} (length=${out[key].length})`);
}
if (missing.length) {
  console.log('\nSkipping (not set in .dev.vars):');
  for (const key of missing) console.log(`  ${key}`);
}

const TMP_FILE = '.tmp-secrets.json';
writeFileSync(TMP_FILE, JSON.stringify(out));

try {
  const res = spawnSync('npx', ['wrangler', 'secret', 'bulk', TMP_FILE], {
    stdio: 'inherit',
    shell: true,
  });
  if (res.status !== 0) {
    process.exit(res.status ?? 1);
  }
} finally {
  unlinkSync(TMP_FILE);
  console.log('\nDeleted temp secrets file.');
}
