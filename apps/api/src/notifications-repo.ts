import type {
  AppNotification,
  NotificationKind,
  NotificationList,
  NotificationParams,
} from '@shooting-clays/shared';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import type { Db } from './db/client';
import { notifications, profiles } from './db/schema';

/** The newest notifications a user sees; older ones stay in the table but are not listed. */
export const NOTIFICATIONS_SHOWN = 50;

export function createNotificationsRepo(db: Db) {
  return {
    async list(userId: string): Promise<NotificationList> {
      const rows = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt), desc(notifications.id))
        .limit(NOTIFICATIONS_SHOWN);
      const [{ unread } = { unread: 0 }] = await db
        .select({ unread: sql<number>`count(*)::int` })
        .from(notifications)
        .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
      return {
        items: rows.map(
          (r) =>
            ({
              id: r.id,
              kind: r.kind,
              params: r.params,
              createdAt: r.createdAt.toISOString(),
              readAt: r.readAt?.toISOString() ?? null,
            }) as AppNotification,
        ),
        unread: Number(unread),
      };
    },

    async get(userId: string, id: string) {
      const [row] = await db
        .select()
        .from(notifications)
        .where(and(eq(notifications.userId, userId), eq(notifications.id, id)));
      return row;
    },

    /** Marks the user's notification as read (once: the first time is kept). */
    async markRead(userId: string, id: string, at: Date) {
      await db
        .update(notifications)
        .set({ readAt: at })
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.id, id),
            isNull(notifications.readAt),
          ),
        );
    },

    async notify<K extends NotificationKind>(
      userId: string,
      kind: K,
      params: NotificationParams[K],
    ) {
      await db.insert(notifications).values({ userId, kind, params });
    },

    /** One notification for every admin; returns how many were created. */
    async notifyAdmins<K extends NotificationKind>(
      kind: K,
      params: NotificationParams[K],
    ): Promise<number> {
      const admins = await db
        .select({ userId: profiles.userId })
        .from(profiles)
        .where(eq(profiles.role, 'admin'));
      if (admins.length === 0) return 0;
      await db.insert(notifications).values(admins.map(({ userId }) => ({ userId, kind, params })));
      return admins.length;
    },
  };
}
