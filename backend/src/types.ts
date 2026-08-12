import type { ClerkClient } from '@clerk/backend';
import type { Db } from './db/client';

export type Bindings = {
  DATABASE_URL: string;
  CLERK_SECRET_KEY: string;
  CLERK_PUBLISHABLE_KEY: string;
  CLERK_WEBHOOK_SECRET: string;
  R2_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_BUCKET: string;
  R2_PUBLIC_URL: string;
};

export type Variables = {
  clerkUserId: string;
  clerk: ClerkClient;
  db: Db;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: Variables;
};
