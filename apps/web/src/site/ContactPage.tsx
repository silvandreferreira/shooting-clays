import { CONTACT_LIMITS } from '@shooting-clays/shared/contact';
import { useState, useSyncExternalStore, type FormEvent } from 'react';
import { useLocale, useT } from '../i18n';

type Field = 'name' | 'email' | 'message';
type Status = 'idle' | 'sending' | 'sent' | 'rateLimited' | 'failed';

const fieldLabel = 'block font-semibold';
const input = 'mt-1 min-h-12 w-full rounded-xl border-2 border-line bg-card px-3 text-base';
const errorText = 'mt-1 text-sm font-medium text-danger';

const noSubscribe = () => () => undefined;
/** False in the prerendered HTML: the form only sends once React has taken over the page. */
const useHydrated = () =>
  useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );

/** Same rules as the API (`contactInputSchema`), without loading Zod on the public site. */
function validate(values: Record<Field, string>): Field[] {
  const invalid: Field[] = [];
  if (!values.name.trim()) invalid.push('name');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) invalid.push('email');
  if (values.message.trim().length < CONTACT_LIMITS.messageMin) invalid.push('message');
  return invalid;
}

/** `/contactos`, `/en/contact`: a message to the owner, sent by email (`POST /api/contact`). */
export function ContactPage() {
  const t = useT();
  const { locale } = useLocale();
  const page = t.site.contact;
  const hydrated = useHydrated();
  const [invalid, setInvalid] = useState<Field[]>([]);
  const [status, setStatus] = useState<Status>('idle');

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const values = {
      name: String(data.get('name') ?? ''),
      email: String(data.get('email') ?? ''),
      message: String(data.get('message') ?? ''),
    };
    const errors = validate(values);
    setInvalid(errors);
    if (errors.length) {
      form.querySelector<HTMLElement>(`[name="${errors[0]}"]`)?.focus();
      return;
    }
    setStatus('sending');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          email: values.email.trim(),
          locale,
          website: String(data.get('website') ?? ''),
        }),
      });
      setStatus(res.ok ? 'sent' : res.status === 429 ? 'rateLimited' : 'failed');
      if (res.ok) form.reset();
    } catch {
      setStatus('failed');
    }
  }

  const describedBy = (field: Field, ...ids: string[]) =>
    [...ids, invalid.includes(field) ? `${field}-error` : ''].filter(Boolean).join(' ') ||
    undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 pt-8">
      <h1 className="text-3xl font-bold">{page.title}</h1>
      <p className="text-lg text-ink-muted">{page.intro}</p>

      {status === 'sent' ? (
        <p role="status" className="rounded-xl border border-accent bg-card p-4 font-semibold">
          {page.sent}
        </p>
      ) : (
        <form
          noValidate
          onSubmit={onSubmit}
          className="space-y-4 rounded-2xl border border-line bg-card p-5"
        >
          <div>
            <label htmlFor="name" className={fieldLabel}>
              {page.name}
            </label>
            <input
              id="name"
              name="name"
              autoComplete="name"
              maxLength={CONTACT_LIMITS.name}
              aria-invalid={invalid.includes('name') || undefined}
              aria-describedby={describedBy('name')}
              className={input}
            />
            {invalid.includes('name') && (
              <p id="name-error" className={errorText}>
                {page.errors.name}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="email" className={fieldLabel}>
              {page.email}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              maxLength={CONTACT_LIMITS.email}
              aria-invalid={invalid.includes('email') || undefined}
              aria-describedby={describedBy('email')}
              className={input}
            />
            {invalid.includes('email') && (
              <p id="email-error" className={errorText}>
                {page.errors.email}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="message" className={fieldLabel}>
              {page.message}
            </label>
            <textarea
              id="message"
              name="message"
              rows={6}
              maxLength={CONTACT_LIMITS.message}
              aria-invalid={invalid.includes('message') || undefined}
              aria-describedby={describedBy('message', 'message-hint')}
              className={`${input} py-2`}
            />
            <p id="message-hint" className="mt-1 text-sm text-ink-muted">
              {page.messageHint(CONTACT_LIMITS.messageMin)}
            </p>
            {invalid.includes('message') && (
              <p id="message-error" className={errorText}>
                {page.errors.message(CONTACT_LIMITS.messageMin)}
              </p>
            )}
          </div>
          {/* Honeypot: hidden from people and from assistive technology; bots fill it in. */}
          <div aria-hidden className="absolute -left-[10000px] size-px overflow-hidden">
            <label htmlFor="website">{page.website}</label>
            <input id="website" name="website" tabIndex={-1} autoComplete="off" />
          </div>
          <p className="text-sm text-ink-muted">{page.privacy}</p>
          {(status === 'rateLimited' || status === 'failed') && (
            <p role="alert" className="rounded-xl border border-danger p-3 font-medium text-danger">
              {page.errors[status]}
            </p>
          )}
          <button
            type="submit"
            disabled={!hydrated || status === 'sending'}
            className="min-h-14 w-full rounded-xl bg-accent text-lg font-bold text-accent-ink disabled:opacity-60 sm:w-auto sm:px-8"
          >
            {status === 'sending' ? page.sending : page.send}
          </button>
        </form>
      )}
    </div>
  );
}
