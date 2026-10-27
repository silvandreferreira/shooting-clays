import { describe, expect, it } from 'vitest';
import { contactEmail, createContactLimiter, type ContactMessage } from './contact';
import { loadConfig } from './config';
import type { LogFields } from './logger';
import { createTestApp } from './test-utils';

const MESSAGE = {
  name: 'Ana Silva',
  email: 'ana@example.test',
  message: 'Could you add Olympic Trap?',
  locale: 'en',
} as const;

async function contactApp({ fail = false } = {}) {
  const outbox: ContactMessage[] = [];
  const logs: LogFields[] = [];
  const { app } = await createTestApp({
    empty: true,
    deps: {
      sendContact: async (message) => {
        if (fail) {
          throw Object.assign(new Error(`Invalid recipient ${message.email}`), {
            code: 'EENVELOPE',
          });
        }
        outbox.push(message);
      },
      logger: { log: (_level, fields) => logs.push(fields) },
    },
  });
  // No Authorization header: the form is public.
  const send = (body: unknown, ip = '203.0.113.7') =>
    app.request('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': `${ip}, 10.0.0.1` },
      body: JSON.stringify(body),
    });
  return { outbox, logs, send };
}

// R44: contact form API.
describe('POST /api/contact', () => {
  it('sends the message without signing in and logs none of it', async () => {
    const { outbox, logs, send } = await contactApp();
    const res = await send({ ...MESSAGE, name: '  Ana Silva ', website: '' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(outbox).toEqual([MESSAGE]);
    const logged = JSON.stringify(logs);
    for (const value of [MESSAGE.name, MESSAGE.email, MESSAGE.message]) {
      expect(logged).not.toContain(value);
    }
  });

  it('rejects invalid input', async () => {
    const { outbox, send } = await contactApp();
    for (const body of [
      { ...MESSAGE, name: ' ' },
      { ...MESSAGE, email: 'not-an-email' },
      { ...MESSAGE, message: 'Too short' },
      { ...MESSAGE, message: 'x'.repeat(5001) },
      { ...MESSAGE, locale: 'fr' },
    ]) {
      expect((await send(body)).status).toBe(400);
    }
    expect(outbox).toEqual([]);
  });

  it('answers a filled-in honeypot like a person but sends nothing', async () => {
    const { outbox, send } = await contactApp();
    const res = await send({ ...MESSAGE, website: 'https://spam.example' });
    expect(res.status).toBe(200);
    expect(outbox).toEqual([]);
  });

  it('allows 5 messages an hour per sender, then answers 429', async () => {
    let time = 0;
    const limiter = createContactLimiter(() => time);
    for (let i = 0; i < 5; i++) expect(limiter.allow('a')).toBe(true);
    expect(limiter.allow('a')).toBe(false);
    expect(limiter.allow('b')).toBe(true);
    time = 60 * 60 * 1000;
    expect(limiter.allow('a')).toBe(true);

    const app = await contactApp();
    for (let i = 0; i < 5; i++) expect((await app.send(MESSAGE)).status).toBe(200);
    const res = await app.send(MESSAGE);
    expect(res.status).toBe(429);
    expect((await app.send(MESSAGE, '198.51.100.1')).status).toBe(200);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('RATE_LIMITED');
    expect(app.outbox).toHaveLength(6);
  });

  it('caps all senders together at 50 an hour', () => {
    const limiter = createContactLimiter(() => 0);
    for (let i = 0; i < 50; i++) expect(limiter.allow(`ip-${i}`)).toBe(true);
    expect(limiter.allow('ip-new')).toBe(false);
  });

  it('answers 503 without SMTP settings or when sending fails, logging only the error code', async () => {
    const { json } = await createTestApp({ empty: true });
    expect((await json('POST', '/api/contact', MESSAGE, null)).status).toBe(503);

    const { logs, send } = await contactApp({ fail: true });
    expect((await send(MESSAGE)).status).toBe(503);
    expect(logs).toContainEqual({ message: 'Contact email failed', code: 'EENVELOPE' });
    expect(JSON.stringify(logs)).not.toContain(MESSAGE.email);
  });

  it('builds the email: from the Gmail account, reply-to the sender, no line breaks in headers', () => {
    const mail = contactEmail(
      { ...MESSAGE, name: 'Ana\r\nBcc: x@example.test' },
      { user: 'site@example.test', to: 'owner@example.test' },
    );
    expect(mail).toMatchObject({
      from: { name: 'Shooting Clays', address: 'site@example.test' },
      to: 'owner@example.test',
      replyTo: { name: 'Ana Bcc: x@example.test', address: MESSAGE.email },
      subject: 'Contact form: Ana Bcc: x@example.test',
    });
    expect(mail.text).toContain(MESSAGE.message);
  });

  it('reads the SMTP settings, dropping the spaces Google shows in app passwords', () => {
    const config = loadConfig({
      SMTP_USER: 'site@example.test',
      SMTP_PASSWORD: 'abcd efgh ijkl mnop',
      CONTACT_TO_EMAIL: 'owner@example.test',
    });
    expect(config).toMatchObject({
      smtpUser: 'site@example.test',
      smtpPassword: 'abcdefghijklmnop',
      contactToEmail: 'owner@example.test',
    });
  });
});
