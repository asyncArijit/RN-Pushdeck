import 'dotenv/config';
import { config as loadEnv } from 'dotenv';
import { createClerkClient } from '@clerk/backend';
import { writeFileSync } from 'node:fs';

loadEnv({ path: '.dev.vars' });

const secret = process.env.CLERK_SECRET_KEY;
if (!secret) throw new Error('CLERK_SECRET_KEY not set');

const clerk = createClerkClient({ secretKey: secret });

const TEST_USERS = [
  { id: 'alice', email: 'alice+rn-pushdeck-test@asyncarijit.dev' },
  { id: 'bob', email: 'bob+rn-pushdeck-test@asyncarijit.dev' },
];

async function findOrCreate(email: string) {
  const found = await clerk.users.getUserList({ emailAddress: [email] });
  if (found.data?.[0]) return found.data[0];
  return clerk.users.createUser({
    emailAddress: [email],
    password: `Test_${Math.random().toString(36).slice(2, 12)}!Aa1`,
    skipPasswordChecks: true,
  });
}

async function mintToken(userId: string) {
  const session = await clerk.sessions.createSession({ userId });
  const tokenResp = await clerk.sessions.getToken(session.id, '');
  return { sessionId: session.id, jwt: tokenResp.jwt };
}

async function main() {
  const out: Record<string, { userId: string; email: string; jwt: string }> = {};

  for (const { id, email } of TEST_USERS) {
    console.log(`Provisioning ${id} (${email})...`);
    const user = await findOrCreate(email);
    const { jwt } = await mintToken(user.id);
    out[id] = { userId: user.id, email, jwt };
    console.log(`  userId: ${user.id}`);
    console.log(`  jwt:    ${jwt.slice(0, 30)}...`);
  }

  writeFileSync('.test-tokens.json', JSON.stringify(out, null, 2));
  console.log('\nSaved .test-tokens.json');
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
