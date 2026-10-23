import { useState } from 'react';
import { NavLink, Outlet } from 'react-router';
import { t } from '../i18n/en';
import { useProfile } from '../lib/queries';
import { firstName, type CurrentUser } from '../lib/session';
import { useSignOut } from '../lib/sign-out';

const navItem = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-sm font-semibold ${
    isActive ? 'text-accent' : 'text-ink-muted'
  }`;

function Icon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Google photo when available; the name's initial if there is none or it fails to load. */
function Avatar({ name, image }: { name: string; image: string | null }) {
  const [failed, setFailed] = useState(false);
  if (image && !failed) {
    return (
      <img
        src={image}
        alt=""
        // Google photo URLs can refuse requests that carry a referrer.
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="size-11 rounded-full object-cover"
      />
    );
  }
  return <>{name.trim().charAt(0).toUpperCase() || '?'}</>;
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

export function Layout({ user }: { user: CurrentUser }) {
  // The profile name can be edited later; until it loads, use the name from the session.
  const { data: profile } = useProfile();
  const name = firstName(profile?.displayName ?? user.name);
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col">
      <header className="flex items-center justify-between gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <p className="truncate text-lg font-semibold" data-testid="welcome">
          {t.auth.welcome(name)}
        </p>
        <AccountMenu user={user} />
      </header>
      <main className="flex-1 px-4 pt-4 pb-28">
        <Outlet />
      </main>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 border-t border-line bg-card pb-[env(safe-area-inset-bottom)]"
      >
        <div className="mx-auto flex max-w-3xl">
          <NavLink to="/" end className={navItem}>
            <Icon path="M4 20V10M10 20V4M16 20v-7M22 20H2" />
            {t.nav.dashboard}
          </NavLink>
          <NavLink to="/add" className={navItem}>
            <Icon path="M12 5v14M5 12h14" />
            {t.nav.add}
          </NavLink>
          <NavLink to="/history" className={navItem}>
            <Icon path="M4 6h16M4 12h16M4 18h10" />
            {t.nav.history}
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
