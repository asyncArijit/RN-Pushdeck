import {
  pgTable,
  text,
  uuid,
  timestamp,
  integer,
  boolean,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clerkUserId: text('clerk_user_id').notNull(),
    name: text('name').notNull(),
    projectKey: text('project_key').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    projectKeyUnique: uniqueIndex('projects_project_key_unique').on(t.projectKey),
    clerkUserIdx: index('projects_clerk_user_idx').on(t.clerkUserId),
  })
);

export const channels = pgTable(
  'channels',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    currentBundleId: uuid('current_bundle_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    projectChannelUnique: uniqueIndex('channels_project_name_unique').on(t.projectId, t.name),
  })
);

export const bundles = pgTable(
  'bundles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    version: text('version').notNull(),
    storagePath: text('storage_path').notNull(),
    bundleSize: integer('bundle_size').notNull(),
    assetsSize: integer('assets_size').notNull().default(0),
    minNativeVersion: text('min_native_version').notNull(),
    description: text('description'),
    uploadedBy: text('uploaded_by').notNull(),
    uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow(),
    isActive: boolean('is_active').notNull().default(true),
  },
  (t) => ({
    projectVersionUnique: uniqueIndex('bundles_project_version_unique').on(t.projectId, t.version),
    projectIdx: index('bundles_project_idx').on(t.projectId),
  })
);

export const deployments = pgTable(
  'deployments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    channelId: uuid('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    bundleId: uuid('bundle_id')
      .notNull()
      .references(() => bundles.id, { onDelete: 'restrict' }),
    action: text('action', { enum: ['promote', 'rollback'] }).notNull(),
    actorClerkUserId: text('actor_clerk_user_id').notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    projectIdx: index('deployments_project_idx').on(t.projectId),
    channelIdx: index('deployments_channel_idx').on(t.channelId),
  })
);

export const projectsRelations = relations(projects, ({ many }) => ({
  channels: many(channels),
  bundles: many(bundles),
  deployments: many(deployments),
}));

export const channelsRelations = relations(channels, ({ one, many }) => ({
  project: one(projects, { fields: [channels.projectId], references: [projects.id] }),
  currentBundle: one(bundles, {
    fields: [channels.currentBundleId],
    references: [bundles.id],
  }),
  deployments: many(deployments),
}));

export const bundlesRelations = relations(bundles, ({ one, many }) => ({
  project: one(projects, { fields: [bundles.projectId], references: [projects.id] }),
  deployments: many(deployments),
}));

export const deploymentsRelations = relations(deployments, ({ one }) => ({
  project: one(projects, { fields: [deployments.projectId], references: [projects.id] }),
  channel: one(channels, { fields: [deployments.channelId], references: [channels.id] }),
  bundle: one(bundles, { fields: [deployments.bundleId], references: [bundles.id] }),
}));

export const apiTokens = pgTable(
  'api_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clerkUserId: text('clerk_user_id').notNull(),
    name: text('name').notNull(),
    tokenHash: text('token_hash').notNull(),
    tokenPrefix: text('token_prefix').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (t) => ({
    tokenHashUnique: uniqueIndex('api_tokens_token_hash_unique').on(t.tokenHash),
    clerkUserIdx: index('api_tokens_clerk_user_idx').on(t.clerkUserId),
  })
);

export type ApiToken = typeof apiTokens.$inferSelect;
export type NewApiToken = typeof apiTokens.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Channel = typeof channels.$inferSelect;
export type NewChannel = typeof channels.$inferInsert;
export type Bundle = typeof bundles.$inferSelect;
export type NewBundle = typeof bundles.$inferInsert;
export type Deployment = typeof deployments.$inferSelect;
export type NewDeployment = typeof deployments.$inferInsert;
