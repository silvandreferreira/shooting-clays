import type { AppNotification } from '@shooting-clays/shared';
import { Link } from 'react-router';
import { useT } from '../i18n';
import { formatDay } from '../lib/format';
import { useNotifications, useReadNotification } from '../lib/queries';

function Content({ notification }: { notification: AppNotification }) {
  const t = useT();
  const n = t.notifications;
  switch (notification.kind) {
    case 'registered':
    case 'approved':
      return (
        <>
          <h2 className="font-bold">{n[notification.kind].title}</h2>
          <p className="text-ink-muted">{n[notification.kind].text}</p>
        </>
      );
    case 'revoked':
      return (
        <>
          <h2 className="font-bold">{n.revoked.title}</h2>
          <p className="whitespace-pre-line text-ink-muted">{notification.params.message}</p>
        </>
      );
    case 'signup':
      return (
        <>
          <h2 className="font-bold">{n.signup.title(notification.params.displayName)}</h2>
          <p className="text-ink-muted">{n.signup.text}</p>
          <Link to="/admin?status=pending" className="font-semibold text-accent underline">
            {n.signup.link}
          </Link>
        </>
      );
    case 'contact': {
      const { name, email, message } = notification.params;
      return (
        <>
          <h2 className="font-bold">{n.contact.title(name)}</h2>
          <p className="text-sm break-all text-ink-muted">{email}</p>
          <p className="whitespace-pre-line">{message}</p>
          <a href={`mailto:${email}`} className="font-semibold text-accent underline">
            {n.contact.reply}
          </a>
        </>
      );
    }
  }
}

export function NotificationCard({
  notification,
  onRead,
  reading,
}: {
  notification: AppNotification;
  onRead: () => void;
  reading: boolean;
}) {
  const t = useT();
  const unread = notification.readAt === null;
  return (
    <li
      data-testid="notification"
      className={`space-y-2 rounded-2xl border bg-card p-4 ${
        unread ? 'border-2 border-accent' : 'border-line'
      }`}
    >
      <p className="flex items-center gap-2 text-sm text-ink-muted">
        {unread && (
          <span className="rounded-full bg-accent px-2 text-xs leading-5 font-bold text-accent-ink">
            {t.notifications.unread}
          </span>
        )}
        {formatDay(notification.createdAt)}
      </p>
      <Content notification={notification} />
      {unread && (
        <button
          type="button"
          onClick={onRead}
          disabled={reading}
          className="min-h-11 rounded-lg border-2 border-line px-4 font-semibold disabled:opacity-50"
        >
          {t.notifications.markRead}
        </button>
      )}
    </li>
  );
}

/** `/app/notifications`: newest first; "Read" marks one as read. */
export function NotificationsPage() {
  const t = useT();
  const { data, isPending, isError } = useNotifications();
  const read = useReadNotification();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t.notifications.title}</h1>
      {read.isError && (
        <p role="alert" className="rounded-xl border border-danger p-3 font-medium text-danger">
          {t.notifications.readError}
        </p>
      )}
      {isPending ? (
        <p className="py-8 text-center text-ink-muted">{t.notifications.loading}</p>
      ) : isError && !data ? (
        <p role="alert" className="py-8 text-center">
          {t.notifications.loadError}
        </p>
      ) : data.items.length === 0 ? (
        <p className="py-8 text-center text-ink-muted">{t.notifications.empty}</p>
      ) : (
        <ul className="space-y-3">
          {data.items.map((n) => (
            <NotificationCard
              key={n.id}
              notification={n}
              onRead={() => read.mutate(n.id)}
              reading={read.isPending && read.variables === n.id}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
