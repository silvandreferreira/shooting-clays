import type { Me } from '@shooting-clays/shared';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigationType } from 'react-router';
import { useT } from '../i18n';
import { useAdminUsers, useNotifications } from '../lib/queries';
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
  faq: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01',
  signOut: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  clubs:
    'M12 22s7-6.1 7-12a7 7 0 0 0-14 0c0 5.9 7 12 7 12M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5',
  bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0',
};

function Icon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const STAR = 'M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 20.9l1.6-7L2 9.2l7.1-.6z';

/**
 * The Community icon in gold with a small star: it will be the paid part of the app (iteration 9,
 * decision #75). The label keeps the normal text colour for contrast.
 */
function CommunityIcon() {
  return (
    <span className="relative text-gold" data-testid="community-premium">
      <Icon path={ICONS.community} />
      <svg aria-hidden viewBox="0 0 24 24" className="absolute -top-1.5 -right-2 size-3.5">
        <path d={STAR} fill="currentColor" stroke="var(--color-card)" strokeWidth={2} />
      </svg>
    </span>
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
          {showSettings && (
            <Link
              to="/clubs"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex min-h-11 w-full items-center rounded-lg px-3 font-semibold hover:bg-surface"
            >
              {t.nav.clubs}
            </Link>
          )}
          <Link
            to="/faq"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex min-h-11 w-full items-center rounded-lg px-3 font-semibold hover:bg-surface"
          >
            {t.nav.faq}
          </Link>
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
                    <CommunityIcon />
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
              {!pending && (
                <NavLink to="/clubs" onClick={close} className={menuItem}>
                  <Icon path={ICONS.clubs} />
                  {t.nav.clubs}
                </NavLink>
              )}
              <NavLink to="/faq" onClick={close} className={menuItem}>
                <Icon path={ICONS.faq} />
                {t.nav.faq}
              </NavLink>
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

/** The bell: opens the notifications; the badge counts the unread ones. */
function NotificationsBell() {
  const t = useT();
  const { data } = useNotifications();
  const unread = data?.unread ?? 0;
  return (
    <NavLink
      to="/notifications"
      aria-label={
        unread > 0 ? `${t.nav.notifications}, ${t.nav.unreadBadge(unread)}` : t.nav.notifications
      }
      className={({ isActive }) =>
        `relative flex size-11 shrink-0 items-center justify-center rounded-lg border-2 bg-card ${
          isActive ? 'border-accent text-accent' : 'border-line'
        }`
      }
    >
      <Icon path={ICONS.bell} />
      {unread > 0 && (
        <span
          aria-hidden
          data-testid="unread-badge"
          className="absolute -top-1.5 -right-1.5 min-w-5 rounded-full bg-accent px-1.5 text-center text-xs leading-5 font-bold text-accent-ink"
        >
          {unread}
        </span>
      )}
    </NavLink>
  );
}

/** Logging a series is the heart of the app: a round "+" on these pages leads to Add. */
const ADD_BUTTON_PATHS = ['/', '/history', '/community'];

const addButtonClass =
  'fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-10 flex size-14 items-center justify-center rounded-full bg-accent text-accent-ink shadow-lg lg:bottom-[calc(5.5rem+env(safe-area-inset-bottom))]';

function AddButton({ pending, onAddDisabled }: { pending: boolean; onAddDisabled: () => void }) {
  const t = useT();
  const icon = (
    <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path d={ICONS.add} strokeLinecap="round" />
    </svg>
  );
  if (pending) {
    // As in the menus: visible, but a tap explains why it is unavailable.
    return (
      <button
        type="button"
        aria-label={t.nav.addSession}
        aria-disabled="true"
        onClick={onAddDisabled}
        className={`${addButtonClass} opacity-50`}
      >
        {icon}
      </button>
    );
  }
  return (
    <Link to="/add" aria-label={t.nav.addSession} className={addButtonClass}>
      {icon}
    </Link>
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
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

  // A new page opens at the top (the router keeps the scroll of the page before); back and
  // forward, and links to a section (#…), are left alone.
  useEffect(() => {
    if (navigationType !== 'POP' && !hash) window.scrollTo(0, 0);
  }, [pathname, hash, navigationType]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col">
      <header className="flex items-center justify-between gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <Link
          to="/"
          aria-label={t.nav.home}
          className="flex size-11 shrink-0 items-center justify-center"
        >
          <img src="/favicon.svg" alt="" width={36} height={36} className="size-9 rounded-lg" />
        </Link>
        <p className="min-w-0 truncate text-lg font-semibold" data-testid="welcome">
          {t.auth.welcome(firstName(me.displayName || user.name))}
        </p>
        <div className="ml-auto flex items-center gap-3">
          <NotificationsBell />
          <AccountMenu user={user} showSettings={!pending} />
          <MobileMenu
            user={user}
            me={me}
            pendingCount={pendingCount}
            onAddDisabled={() => setNotice(t.account.addDisabled)}
          />
        </div>
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
      <main className="flex-1 px-4 pt-4 pb-24 lg:pb-44">
        <Outlet />
      </main>
      {ADD_BUTTON_PATHS.includes(pathname) && (
        <AddButton pending={pending} onAddDisabled={() => setNotice(t.account.addDisabled)} />
      )}
      <p
        role="status"
        aria-live="polite"
        className={
          notice
            ? 'fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] mx-auto lg:bottom-[calc(10rem+env(safe-area-inset-bottom))] max-w-md rounded-xl bg-ink p-3 text-center text-sm font-medium text-surface shadow-lg'
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
                <CommunityIcon />
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
