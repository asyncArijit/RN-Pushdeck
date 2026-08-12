import { eq, and } from 'drizzle-orm';
import { projects } from '../db/schema';
import type { Db } from '../db/client';

export async function findOwnedProject(
  db: Db,
  projectId: string,
  clerkUserId: string
) {
  return db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.clerkUserId, clerkUserId)),
  });
}
