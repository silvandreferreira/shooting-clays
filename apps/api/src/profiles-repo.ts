import { eq } from 'drizzle-orm';
import type { AuthUser } from './auth';
import type { Db } from './db/client';
import { profiles, type ProfileRow } from './db/schema';

export interface Profile {
  displayName: string;
  avatarUrl: string | null;
}

const toProfile = (row: ProfileRow): Profile => ({
  displayName: row.displayName,
  avatarUrl: row.avatarUrl,
});

export function createProfilesRepo(db: Db) {
  return {
    /** Creates the profile on first sign-in; never overwrites what the user changed later. */
    async ensure(user: AuthUser): Promise<void> {
      await db
        .insert(profiles)
        .values({ userId: user.id, displayName: user.name, avatarUrl: user.image })
        .onConflictDoNothing({ target: profiles.userId });
    },

    async get(userId: string): Promise<Profile | undefined> {
      const [row] = await db.select().from(profiles).where(eq(profiles.userId, userId));
      return row && toProfile(row);
    },

    async update(userId: string, data: { displayName: string }): Promise<Profile | undefined> {
      const [row] = await db
        .update(profiles)
        .set(data)
        .where(eq(profiles.userId, userId))
        .returning();
      return row && toProfile(row);
    },
  };
}
