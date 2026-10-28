import type { AccountStatus, Me, ProfileUpdate, Role } from '@shooting-clays/shared';
import { and, eq, ne, sql } from 'drizzle-orm';
import type { AuthUser } from './auth';
import { rowsOf, type Db } from './db/client';
import { profiles, type ProfileRow } from './db/schema';

export type Profile = Pick<
  ProfileRow,
  | 'userId'
  | 'displayName'
  | 'avatarUrl'
  | 'role'
  | 'status'
  | 'showInCommunity'
  | 'locale'
  | 'homeClubId'
>;

export const toMe = (profile: Profile, email: string): Me => ({
  displayName: profile.displayName,
  avatarUrl: profile.avatarUrl,
  email,
  role: profile.role,
  status: profile.status,
  showInCommunity: profile.showInCommunity,
  locale: profile.locale,
  homeClubId: profile.homeClubId,
});

const columns = {
  userId: profiles.userId,
  displayName: profiles.displayName,
  avatarUrl: profiles.avatarUrl,
  role: profiles.role,
  status: profiles.status,
  showInCommunity: profiles.showInCommunity,
  locale: profiles.locale,
  homeClubId: profiles.homeClubId,
};

export function createProfilesRepo(db: Db) {
  return {
    async get(userId: string): Promise<Profile | undefined> {
      const [row] = await db.select(columns).from(profiles).where(eq(profiles.userId, userId));
      return row;
    },

    /**
     * Whether Neon Auth still knows this user. A removed user's JWT stays valid for up to 15
     * minutes; without this check their next request would create a new profile.
     */
    async authUserExists(userId: string): Promise<boolean> {
      const result = await db.execute(
        sql`select 1 from neon_auth."user" where id::text = ${userId} limit 1`,
      );
      return rowsOf(result).length > 0;
    },

    /** First sign-in: a pending profile with the name and photo from Google. */
    async create(user: AuthUser): Promise<Profile> {
      await db
        .insert(profiles)
        .values({ userId: user.id, displayName: user.name, avatarUrl: user.image })
        .onConflictDoNothing({ target: profiles.userId });
      return (await this.get(user.id))!;
    },

    /** Emails in ADMIN_EMAILS are always active admins. */
    async promoteToAdmin(userId: string): Promise<Profile> {
      const [row] = await db
        .update(profiles)
        .set({ role: 'admin', status: 'active', statusChangedAt: new Date() })
        .where(eq(profiles.userId, userId))
        .returning(columns);
      return row!;
    },

    async update(userId: string, data: ProfileUpdate): Promise<Profile | undefined> {
      const [row] = await db
        .update(profiles)
        .set(data)
        .where(eq(profiles.userId, userId))
        .returning(columns);
      return row;
    },

    /** Changes a non-admin user's status; undefined when there is no such user. */
    async setStatus(userId: string, status: AccountStatus): Promise<Profile | undefined> {
      const [row] = await db
        .update(profiles)
        .set({ status, statusChangedAt: new Date() })
        .where(and(eq(profiles.userId, userId), ne(profiles.role, 'admin' satisfies Role)))
        .returning(columns);
      return row;
    },
  };
}
