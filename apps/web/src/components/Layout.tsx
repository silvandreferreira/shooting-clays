import type { Me } from '@shooting-clays/shared';
import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router';
import { t } from '../i18n/en';
import { useAdminUsers } from '../lib/queries';
import { Avatar } from './Avatar';
import { firstName, type CurrentUser } from '../lib/session';
import { useSignOut } from '../lib/sign-out';

const navItem = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-sm font-semibold ${
    isActive ? 'text-accent' : 'text-ink-muted'
  }`;

const ICONS = {
  dashboard: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  add: 'M12 5v14M5 12h14',
  history: 'M4 6h16M4 12h16M4 18h10',
  admin:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
};

function Icon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AccountMenu({ user }: { user: CurrentUser }) {
  const [open, setOpen] = useState(false);
  const signOut = useSignOut();
  return (
    <div className="relative">
      <button
        type="button"
        aria-label={t.auth.accountMenu}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
        className="flex size-11 items-center justify-center overflow-hidden rounded-full bg-accent text-lg font-bold text-accent-ink"
      >
        <Avatar name={user.name} image={user.image} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-10 mt-2 w-64 rounded-xl border border-line bg-card p-2 shadow-lg"
        >
          <p className="truncate px-3 py-2 text-sm text-ink-muted">{user.email}</p>
          <button
            type="button"
            role="menuitem"
            onClick={() => void signOut()}
            className="min-h-11 w-full rounded-lg px-3 text-left font-semibold hover:bg-surface"
          >
            {t.auth.signOut}
          </button>
        </div>
      )}
    </div>
  );
}

function PendingBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="absolute top-1 right-[calc(50%-1.75rem)] min-w-5 rounded-full bg-accent px-1.5 text-xs leading-5 font-bold text-accent-ink">
      <span aria-hidden>{count}</span>
      <span className="sr-only">{t.nav.pendingBadge(count)}</span>
    </span>
  );
}

const NOTICE_MS = 4000;

export function Layout({ user, me }: { user: CurrentUser; me: Me }) {
  const pending = me.status === 'pending';
  const isAdmin = me.role === 'admin';
  const { data: users } = useAdminUsers(isAdmin);
  const pendingCount = users?.filter((u) => u.status === 'pending').length ?? 0;
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col">
      <header className="flex items-center justify-between gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <p className="truncate text-lg font-semibold" data-testid="welcome">
          {t.auth.welcome(firstName(me.displayName || user.name))}
        </p>
        <AccountMenu user={user} />
      </header>
      {pending && (
        <p
          role="status"
          className="mx-4 mt-4 rounded-xl border-2 border-accent bg-card p-4 font-medium"
          data-testid="pending-banner"
        >
          {t.account.pendingBanner}
        </p>
      )}
      <main className="flex-1 px-4 pt-4 pb-28">
        <Outlet />
      </main>
      <p
        role="status"
        aria-live="polite"
        className={
          notice
            ? 'fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] mx-auto max-w-md rounded-xl bg-ink p-3 text-center text-sm font-medium text-surface shadow-lg'
            : 'sr-only'
        }
      >
        {notice}
      </p>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 border-t border-line bg-card pb-[env(safe-area-inset-bottom)]"
      >
        <div className="mx-auto flex max-w-3xl">
          <NavLink to="/" end className={navItem}>
            <Icon path={ICONS.dashboard} />
            {t.nav.dashboard}
          </NavLink>
          {pending ? (
            // Visible but unavailable until approval; tapping explains why.
            <button
              type="button"
              aria-disabled="true"
              onClick={() => setNotice(t.account.addDisabled)}
              className={`${navItem({ isActive: false })} opacity-50`}
            >
              <Icon path={ICONS.add} />
              {t.nav.add}
            </button>
          ) : (
            <>
              <NavLink to="/add" className={navItem}>
                <Icon path={ICONS.add} />
                {t.nav.add}
              </NavLink>
              <NavLink to="/history" className={navItem}>
                <Icon path={ICONS.history} />
                {t.nav.history}
              </NavLink>
            </>
          )}
          {isAdmin && (
            <NavLink to="/admin" className={(s) => `${navItem(s)} relative`}>
              <Icon path={ICONS.admin} />
              {t.nav.admin}
              <PendingBadge count={pendingCount} />
            </NavLink>
          )}
        </div>
      </nav>
    </div>
  );
}
