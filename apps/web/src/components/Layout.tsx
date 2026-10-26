import type { Me } from '@shooting-clays/shared';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { useT } from '../i18n';
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
  community:
    'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3',
  admin:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  menu: 'M4 6h16M4 12h16M4 18h16',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  signOut: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
};

function Icon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AccountMenu({ user, showSettings }: { user: CurrentUser; showSettings: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const signOut = useSignOut();
  return (
    <div className="relative hidden lg:block">
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
          {showSettings && (
            <Link
              to="/settings"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex min-h-11 w-full items-center rounded-lg px-3 font-semibold hover:bg-surface"
            >
              {t.auth.settings}
            </Link>
          )}
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

const menuItem = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-12 w-full items-center gap-3 rounded-lg px-3 text-left font-semibold hover:bg-surface ${
    isActive ? 'text-accent' : ''
  }`;

/**
 * Phones and tablets (below `lg`): one menu button in the header instead of the bottom bar and
 * the account menu. It holds every destination, Settings and Sign out.
 */
function MobileMenu({
  user,
  me,
  pendingCount,
  onAddDisabled,
}: {
  user: CurrentUser;
  me: Me;
  pendingCount: number;
  onAddDisabled: () => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const signOut = useSignOut();
  const pending = me.status === 'pending';
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label={
          pendingCount > 0 ? `${t.nav.menu}, ${t.nav.pendingBadge(pendingCount)}` : t.nav.menu
        }
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="relative flex size-11 items-center justify-center rounded-lg border-2 border-line bg-card"
      >
        <Icon path={ICONS.menu} />
        {pendingCount > 0 && (
          <span
            aria-hidden
            className="absolute -top-1.5 -right-1.5 min-w-5 rounded-full bg-accent px-1.5 text-xs leading-5 font-bold text-accent-ink"
          >
            {pendingCount}
          </span>
        )}
      </button>
      {open && (
        <>
          {/* Tapping outside the menu closes it. */}
          <div aria-hidden className="fixed inset-0 z-10 bg-black/40" onClick={close} />
          <div className="fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-20 max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-2xl border border-line bg-card p-2 shadow-lg">
            <div className="flex items-center gap-3 border-b border-line px-3 pt-1 pb-3">
              <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-lg font-bold text-accent-ink">
                <Avatar name={user.name} image={user.image} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{me.displayName || user.name}</span>
                <span className="block truncate text-sm text-ink-muted">{user.email}</span>
              </span>
              <button
                type="button"
                aria-label={t.nav.closeMenu}
                onClick={close}
                className="flex size-11 shrink-0 items-center justify-center rounded-lg text-2xl"
              >
                ×
              </button>
            </div>
            <nav aria-label="Main" className="border-b border-line py-2">
              <NavLink to="/" end onClick={close} className={menuItem}>
                <Icon path={ICONS.dashboard} />
                {t.nav.dashboard}
              </NavLink>
              {pending ? (
                <button
                  type="button"
                  aria-disabled="true"
                  onClick={() => {
                    close();
                    onAddDisabled();
                  }}
                  className={`${menuItem({ isActive: false })} opacity-50`}
                >
                  <Icon path={ICONS.add} />
                  {t.nav.add}
                </button>
              ) : (
                <>
                  <NavLink to="/add" onClick={close} className={menuItem}>
                    <Icon path={ICONS.add} />
                    {t.nav.add}
                  </NavLink>
                  <NavLink to="/history" onClick={close} className={menuItem}>
                    <Icon path={ICONS.history} />
                    {t.nav.history}
                  </NavLink>
                  <NavLink to="/community" onClick={close} className={menuItem}>
                    <Icon path={ICONS.community} />
                    {t.nav.community}
                  </NavLink>
                </>
              )}
              {me.role === 'admin' && (
                <NavLink to="/admin" onClick={close} className={menuItem}>
                  <Icon path={ICONS.admin} />
                  <span className="flex-1">{t.nav.admin}</span>
                  {pendingCount > 0 && (
                    <span className="min-w-5 rounded-full bg-accent px-1.5 text-center text-xs leading-5 font-bold text-accent-ink">
                      <span aria-hidden>{pendingCount}</span>
                      <span className="sr-only">{t.nav.pendingBadge(pendingCount)}</span>
                    </span>
                  )}
                </NavLink>
              )}
            </nav>
            <div className="pt-2">
              {!pending && (
                <NavLink to="/settings" onClick={close} className={menuItem}>
                  <Icon path={ICONS.settings} />
                  {t.auth.settings}
                </NavLink>
              )}
              <button
                type="button"
                onClick={() => void signOut()}
                className={menuItem({ isActive: false })}
              >
                <Icon path={ICONS.signOut} />
                {t.auth.signOut}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PendingBadge({ count }: { count: number }) {
  const t = useT();
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
  const t = useT();
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
        <AccountMenu user={user} showSettings={!pending} />
        <MobileMenu
          user={user}
          me={me}
          pendingCount={pendingCount}
          onAddDisabled={() => setNotice(t.account.addDisabled)}
        />
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
      <main className="flex-1 px-4 pt-4 pb-8 lg:pb-28">
        <Outlet />
      </main>
      <p
        role="status"
        aria-live="polite"
        className={
          notice
            ? 'fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] mx-auto lg:bottom-[calc(5rem+env(safe-area-inset-bottom))] max-w-md rounded-xl bg-ink p-3 text-center text-sm font-medium text-surface shadow-lg'
            : 'sr-only'
        }
      >
        {notice}
      </p>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 hidden border-t border-line bg-card pb-[env(safe-area-inset-bottom)] lg:block"
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
              <NavLink to="/community" className={navItem}>
                <Icon path={ICONS.community} />
                {t.nav.community}
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
