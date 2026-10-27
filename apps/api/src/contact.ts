import type { ContactInput } from '@shooting-clays/shared';
import nodemailer from 'nodemailer';

export type ContactMessage = Omit<ContactInput, 'website'>;

/** Delivers a contact form message to the owner (Gmail SMTP in production, an outbox in tests). */
export type SendContact = (message: ContactMessage) => Promise<void>;

export interface SmtpSettings {
  user: string;
  password: string;
  to: string;
}

/** No line breaks in headers (subject, display names). */
const oneLine = (value: string) => value.replace(/[\r\n]+/g, ' ').trim();

export function contactEmail(message: ContactMessage, settings: Pick<SmtpSettings, 'user' | 'to'>) {
  const name = oneLine(message.name);
  return {
    from: { name: 'Shooting Clays', address: settings.user },
    to: settings.to,
    replyTo: { name, address: message.email },
    subject: `Contact form: ${name}`,
    text: [
      `Name: ${name}`,
      `Email: ${message.email}`,
      `Language: ${message.locale}`,
      '',
      message.message,
    ].join('\n'),
  };
}

/** Gmail SMTP with an app password (docs/environments.md → Contact form). */
export function createSmtpSender(settings: SmtpSettings): SendContact {
  const transport = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: settings.user, pass: settings.password },
  });
  return async (message) => {
    await transport.sendMail(contactEmail(message, settings));
  };
}

export interface RateLimiter {
  /** Counts one attempt for `key`; false when the key is over its limit. */
  allow(key: string): boolean;
  reset(): void;
}

/**
 * Fixed-window counters in memory, per function instance: enough to stop a script from flooding
 * the inbox, not a hard guarantee (decision #64).
 */
export function createRateLimiter(
  limits: { perKey: number; total: number; windowMs: number },
  now: () => number = Date.now,
): RateLimiter {
  let windowStart = now();
  let total = 0;
  const counts = new Map<string, number>();
  return {
    allow(key) {
      if (now() - windowStart >= limits.windowMs) {
        windowStart = now();
        total = 0;
        counts.clear();
      }
      const count = counts.get(key) ?? 0;
      if (count >= limits.perKey || total >= limits.total) return false;
      counts.set(key, count + 1);
      total += 1;
      return true;
    },
    reset() {
      total = 0;
      counts.clear();
    },
  };
}

/** Per sender: 5 messages an hour; for everyone together: 50 an hour. */
export const createContactLimiter = (now?: () => number) =>
  createRateLimiter({ perKey: 5, total: 50, windowMs: 60 * 60 * 1000 }, now);
