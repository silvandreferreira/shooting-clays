import { NavLink, Outlet } from 'react-router';
import { t } from '../i18n/en';

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

export function Layout() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col">
      <main className="flex-1 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-28">
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
