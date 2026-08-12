export type Project = {
  id: string;
  clerkUserId: string;
  name: string;
  projectKey: string;
  createdAt: string;
  updatedAt: string;
};

export type Channel = {
  id: string;
  name: string;
  currentBundleId: string | null;
  createdAt: string;
  currentBundle: { id: string; version: string; uploadedAt?: string } | null;
};

export type ProjectListItem = Project & {
  channels: Channel[];
};

export type Bundle = {
  id: string;
  projectId: string;
  version: string;
  storagePath: string;
  bundleSize: number;
  assetsSize: number;
  minNativeVersion: string;
  description: string | null;
  uploadedBy: string;
  uploadedAt: string;
  isActive: boolean;
};

export type ApiTokenListItem = {
  id: string;
  name: string;
  tokenPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

export type Deployment = {
  id: string;
  projectId: string;
  channelId: string;
  bundleId: string;
  action: 'promote' | 'rollback';
  actorClerkUserId: string;
  notes: string | null;
  createdAt: string;
  bundle: { id: string; version: string };
  channel: { id: string; name: string };
};
