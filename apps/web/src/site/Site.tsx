import { DISCIPLINE_KEYS, type DisciplineKey } from '@shooting-clays/shared/disciplines';
import { LOCALES } from '@shooting-clays/shared/locales';
import { useSyncExternalStore, type ReactNode } from 'react';
import { rememberLocale, useLocale, useT } from '../i18n';
import { FaqList, type FaqId } from '../components/FaqList';
import { ContactPage } from './ContactPage';
import { APP_PATH, SITE_PATHS, type SitePage, type SiteRoute } from './routes';

/** The FAQ questions shown on the home page; the rest are on the FAQ page. */
const HOME_FAQ: FaqId[] = ['ranking', 'community', 'install'];

function Logo() {
  const t = useT();
  const { locale } = useLocale();
  return (
    <a href={SITE_PATHS[locale].home} className="flex min-h-11 items-center gap-2 font-bold">
      <img src="/favicon.svg" alt="" width={32} height={32} className="size-8 rounded-lg" />
      {t.appName}
    </a>
  );
}

/** Links to the same page in the other language; the choice is also kept for the app. */
function LanguageLinks({ page }: { page: SitePage | null }) {
  const t = useT();
  const { locale } = useLocale();
  return (
    <ul aria-label={t.site.languageLabel} className="flex gap-3 text-sm">
      {LOCALES.map((l) => (
        <li key={l}>
          <a
            href={SITE_PATHS[l][page ?? 'home']}
            hrefLang={l}
            lang={l}
            aria-current={l === locale ? 'true' : undefined}
            onClick={() => rememberLocale(l)}
            className={`inline-flex min-h-11 items-center font-semibold ${
              l === locale ? 'text-ink' : 'text-ink-muted underline'
            }`}
          >
            {t.languages[l]}
          </a>
        </li>
      ))}
    </ul>
  );
}

function SignInButton({ large = false, children }: { large?: boolean; children: ReactNode }) {
  return (
    <a
      href={APP_PATH}
      className={`inline-flex items-center justify-center rounded-xl bg-accent font-semibold text-accent-ink ${
        large ? 'min-h-14 px-8 text-lg' : 'min-h-11 px-4'
      }`}
    >
      {children}
    </a>
  );
}

function Header({ page }: { page: SitePage | null }) {
  const t = useT();
  const { locale } = useLocale();
  const links: [SitePage, string][] = [
    ['disciplines', t.site.nav.disciplines],
    ['faq', t.site.nav.faq],
    ['contact', t.site.nav.contact],
  ];
  return (
    <header className="border-b border-line bg-card">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2">
        <Logo />
        <nav aria-label={t.site.siteNav} className="order-last w-full sm:order-none sm:w-auto">
          <ul className="flex flex-wrap gap-x-5">
            {links.map(([id, label]) => (
              <li key={id}>
                <a
                  href={SITE_PATHS[locale][id]}
                  aria-current={id === page ? 'page' : undefined}
                  className={`inline-flex min-h-11 items-center font-semibold ${
                    id === page ? 'text-accent' : 'text-ink-muted'
                  }`}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto">
          <SignInButton>{t.site.nav.signIn}</SignInButton>
        </div>
      </div>
    </header>
  );
}

function Footer({ page }: { page: SitePage | null }) {
  const t = useT();
  const { locale } = useLocale();
  return (
    <footer className="mt-16 border-t border-line bg-card">
      <div className="mx-auto grid max-w-5xl gap-4 px-4 py-8 text-sm text-ink-muted sm:grid-cols-2">
        <div className="space-y-1">
          <p className="font-bold text-ink">{t.appName}</p>
          <p>{t.site.footer.tagline}</p>
          <p>{t.site.footer.unofficial}</p>
        </div>
        <div className="space-y-2 sm:justify-self-end">
          <ul className="flex flex-wrap gap-x-5">
            <li>
              <a href={SITE_PATHS[locale].home} className="inline-flex min-h-11 items-center">
                {t.site.nav.home}
              </a>
            </li>
            <li>
              <a
                href={SITE_PATHS[locale].disciplines}
                className="inline-flex min-h-11 items-center"
              >
                {t.site.nav.disciplines}
              </a>
            </li>
            <li>
              <a href={SITE_PATHS[locale].faq} className="inline-flex min-h-11 items-center">
                {t.site.nav.faq}
              </a>
            </li>
            <li>
              <a href={SITE_PATHS[locale].contact} className="inline-flex min-h-11 items-center">
                {t.site.nav.contact}
              </a>
            </li>
          </ul>
          <LanguageLinks page={page} />
        </div>
      </div>
    </footer>
  );
}

function DisciplineFacts({ id }: { id: DisciplineKey }) {
  const t = useT();
  const facts = t.site.disciplines.items[id].facts;
  const labels = t.site.disciplines.facts;
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {(Object.keys(labels) as (keyof typeof labels)[]).map((k) => (
        <div key={k} className="rounded-xl bg-surface p-3">
          <dt className="text-sm text-ink-muted">{labels[k]}</dt>
          <dd className="font-bold">{facts[k]}</dd>
        </div>
      ))}
    </dl>
  );
}

function HomePage() {
  const t = useT();
  const { locale } = useLocale();
  const home = t.site.home;
  return (
    <>
      <section className="mx-auto grid max-w-5xl items-center gap-10 px-4 pt-10 md:grid-cols-[1fr_auto]">
        <div className="space-y-5">
          <p className="font-semibold text-accent">{home.eyebrow}</p>
          <h1 className="text-4xl leading-tight font-bold sm:text-5xl">{home.title}</h1>
          <p className="text-lg text-ink-muted">{home.lead}</p>
          <div className="space-y-2">
            <SignInButton large>{home.cta}</SignInButton>
            <p className="text-sm text-ink-muted">{home.ctaNote}</p>
          </div>
        </div>
        <img
          src={`/images/dashboard-${locale}.png`}
          alt={home.screenshotAlt}
          width={412}
          height={700}
          className="mx-auto h-auto w-full max-w-80 rounded-3xl border-4 border-ink/80 shadow-xl md:w-80"
        />
      </section>

      <section aria-labelledby="how" className="mx-auto max-w-5xl px-4 pt-16">
        <h2 id="how" className="text-2xl font-bold">
          {home.how.title}
        </h2>
        <ol className="mt-4 grid gap-4 md:grid-cols-3">
          {home.how.steps.map((step, i) => (
            <li key={i} className="rounded-2xl border border-line bg-card p-5">
              <span
                aria-hidden
                className="flex size-9 items-center justify-center rounded-full bg-accent font-bold text-accent-ink"
              >
                {i + 1}
              </span>
              <h3 className="mt-3 text-lg font-bold">{step.title}</h3>
              <p className="mt-1 text-ink-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="spirit" className="mx-auto max-w-5xl px-4 pt-16">
        <div className="grid gap-6 rounded-3xl border border-line bg-card p-6 md:grid-cols-2 md:p-8">
          <div className="space-y-3">
            <h2 id="spirit" className="text-2xl font-bold">
              {home.spirit.title}
            </h2>
            {home.spirit.paragraphs.map((p, i) => (
              <p key={i} className="text-ink-muted">
                {p}
              </p>
            ))}
          </div>
          <ul className="space-y-3 self-center">
            {home.spirit.points.map((point, i) => (
              <li key={i} className="flex gap-3 font-semibold">
                <span aria-hidden className="text-accent">
                  ●
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="disciplines" className="mx-auto max-w-5xl px-4 pt-16">
        <h2 id="disciplines" className="text-2xl font-bold">
          {home.disciplines.title}
        </h2>
        <p className="mt-1 text-ink-muted">{home.disciplines.text}</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {DISCIPLINE_KEYS.map((id) => (
            <li key={id}>
              <a
                href={`${SITE_PATHS[locale].disciplines}#${id}`}
                className="flex h-full flex-col gap-1 rounded-2xl border border-line bg-card p-4"
              >
                <span className="flex items-center gap-2 font-bold">
                  <span
                    aria-hidden
                    className="size-3 rounded-full"
                    style={{ background: `var(--series-${id})` }}
                  />
                  {t.disciplines[id]}
                </span>
                <span className="text-sm text-ink-muted">
                  {t.site.disciplines.items[id].summary}
                </span>
              </a>
            </li>
          ))}
        </ul>
        <a
          href={SITE_PATHS[locale].disciplines}
          className="mt-3 inline-flex min-h-11 items-center font-semibold text-accent underline"
        >
          {home.disciplines.more}
        </a>
      </section>

      <section aria-labelledby="questions" className="mx-auto max-w-5xl px-4 pt-16">
        <h2 id="questions" className="mb-4 text-2xl font-bold">
          {home.faq.title}
        </h2>
        <FaqList ids={HOME_FAQ} />
        <a
          href={SITE_PATHS[locale].faq}
          className="mt-3 inline-flex min-h-11 items-center font-semibold text-accent underline"
        >
          {home.faq.more}
        </a>
      </section>

      <section className="mx-auto max-w-5xl px-4 pt-16 text-center">
        <SignInButton large>{home.cta}</SignInButton>
      </section>
    </>
  );
}

function DisciplinesPage() {
  const t = useT();
  const page = t.site.disciplines;
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 pt-8">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold">{page.title}</h1>
        <p className="text-lg text-ink-muted">{page.intro}</p>
      </div>
      {DISCIPLINE_KEYS.map((id) => {
        const item = page.items[id];
        return (
          <section
            key={id}
            id={id}
            aria-labelledby={`${id}-title`}
            className="scroll-mt-4 space-y-3 rounded-3xl border border-line bg-card p-5"
          >
            <h2 id={`${id}-title`} className="flex items-center gap-2 text-2xl font-bold">
              <span
                aria-hidden
                className="size-4 rounded-full"
                style={{ background: `var(--series-${id})` }}
              />
              {t.disciplines[id]}
            </h2>
            <p className="font-semibold">{item.summary}</p>
            {item.paragraphs.map((p, i) => (
              <p key={i} className="text-ink-muted">
                {p}
              </p>
            ))}
            <DisciplineFacts id={id} />
            <p className="rounded-xl border-l-4 border-accent bg-surface p-3">
              <strong>{page.tip}:</strong> {item.tip}
            </p>
          </section>
        );
      })}

      <section aria-labelledby="compare" className="space-y-3">
        <h2 id="compare" className="text-2xl font-bold">
          {page.compareTitle}
        </h2>
        {/* Focusable so that the table can be scrolled with the keyboard on narrow screens. */}
        <div
          role="region"
          aria-labelledby="compare"
          tabIndex={0}
          className="overflow-x-auto rounded-2xl border border-line bg-card"
        >
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="p-3">
                  {page.discipline}
                </th>
                {Object.values(page.facts).map((label) => (
                  <th key={label} scope="col" className="p-3">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DISCIPLINE_KEYS.map((id) => (
                <tr key={id} className="border-b border-line last:border-0">
                  <th scope="row" className="p-3 font-semibold">
                    {t.disciplines[id]}
                  </th>
                  {Object.values(page.items[id].facts).map((value, i) => (
                    <td key={i} className="p-3">
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-center">
        <SignInButton large>{page.cta}</SignInButton>
      </p>
    </div>
  );
}

function FaqSitePage() {
  const t = useT();
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 pt-8">
      <h1 className="text-3xl font-bold">{t.faq.title}</h1>
      <FaqList target={useHashTarget()} />
    </div>
  );
}

const subscribeToHash = (onChange: () => void) => {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
};

/** `#ranking` on the FAQ page; none while prerendering, so hydration matches the HTML. */
function useHashTarget() {
  return useSyncExternalStore(
    subscribeToHash,
    () => window.location.hash.slice(1) || undefined,
    () => undefined,
  );
}

function NotFoundPage() {
  const t = useT();
  const { locale } = useLocale();
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 pt-16 text-center">
      <h1 className="text-3xl font-bold">{t.site.notFound.title}</h1>
      <p className="text-ink-muted">{t.site.notFound.text}</p>
      <a href={SITE_PATHS[locale].home} className="font-semibold text-accent underline">
        {t.site.notFound.back}
      </a>
    </div>
  );
}

const PAGES: Record<SitePage, () => ReactNode> = {
  home: HomePage,
  disciplines: DisciplinesPage,
  faq: FaqSitePage,
  contact: ContactPage,
};

/** A public page (or the 404 page when `route` is null), with the site header and footer. */
export function Site({ route }: { route: SiteRoute | null }) {
  const t = useT();
  const Page = route ? PAGES[route.page] : NotFoundPage;
  const page = route?.page ?? null;
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:rounded-lg focus:bg-card focus:p-3"
      >
        {t.site.skipToContent}
      </a>
      <Header page={page} />
      <main id="main" className="flex-1">
        <Page />
      </main>
      <Footer page={page} />
    </div>
  );
}
