import type { AccountStatus, AdminUser, Role } from '@shooting-clays/shared';
import { sql } from 'drizzle-orm';
import { rowsOf, type Db } from './db/client';

interface AdminUserRow {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  email: string | null;
  role: Role;
  status: AccountStatus;
  signed_up_at: string | Date;
  session_count: number | string;
  last_activity_at: string | Date | null;
}

const iso = (value: string | Date) => new Date(value).toISOString();

export function createAdminRepo(db: Db) {
  return {
    /**
     * Every user with a profile, pending first, then newest sign-up first. Email and sign-up date
     * come from Neon Auth (`neon_auth."user"`); the email is never stored in our tables.
     */
    async listUsers(): Promise<AdminUser[]> {
      const result = await db.execute(sql`
        select p.user_id, p.display_name, coalesce(u.image, p.avatar_url) as avatar_url, p.role, p.status, u.email,
          coalesce(u."createdAt", p.created_at) as signed_up_at,
          count(s.id) as session_count,
          max(s.updated_at) as last_activity_at
        from profiles p
        left join neon_auth."user" u on u.id::text = p.user_id
        left join sessions s on s.user_id = p.user_id
        group by p.user_id, u.email, u.image, u."createdAt"
        order by (p.status = 'pending') desc, signed_up_at desc, p.user_id`);
      return rowsOf<AdminUserRow>(result).map((r) => ({
        userId: r.user_id,
        displayName: r.display_name,
        avatarUrl: r.avatar_url,
        email: r.email,
        role: r.role,
        status: r.status,
        signedUpAt: iso(r.signed_up_at),
        sessionCount: Number(r.session_count),
        lastActivityAt: r.last_activity_at === null ? null : iso(r.last_activity_at),
      }));
    },

    /**
     * Revokes a non-admin user's access in one statement: their sessions and earlier
     * notifications are deleted, the status becomes `revoked` and the admin's message is their
     * only notification. The account itself goes when they read it (or an admin removes it).
     * Returns whether a user was revoked.
     */
    async revokeUser(userId: string, message: string): Promise<boolean> {
      const result = await db.execute(sql`
        with target as (
          update profiles set status = 'revoked', status_changed_at = now()
          where user_id = ${userId} and role <> 'admin' returning user_id
        ), removed_sessions as (
          delete from sessions where user_id in (select user_id from target)
        ), removed_notifications as (
          delete from notifications where user_id in (select user_id from target)
        ), message as (
          insert into notifications (user_id, kind, params)
          select user_id, 'revoked', jsonb_build_object('message', ${message}::text) from target
        )
        select user_id from target`);
      return rowsOf(result).length > 0;
    },

    /**
     * Deletes the user completely in one statement (one transaction): their profile, their
     * sessions (foreign key cascade) and their Neon Auth user, whose sessions and linked Google
     * account Neon Auth deletes in turn. Admins are never removed. Returns whether a profile
     * was deleted.
     */
    async removeUser(userId: string): Promise<boolean> {
      const result = await db.execute(sql`
        with removed as (
          delete from profiles where user_id = ${userId} and role <> 'admin' returning user_id
        ), auth_user as (
          delete from neon_auth."user" where id::text in (select user_id from removed)
        )
        select user_id from removed`);
      return rowsOf(result).length > 0;
    },
  };
}
