import { describe, expect, it } from 'vitest';
import { withoutQuery } from './VercelMetrics';

// R42: page views and Web Vitals are sent without query strings.
describe('withoutQuery', () => {
  it('drops the query string and the hash, keeping the rest of the event', () => {
    expect(
      withoutQuery({ type: 'pageview', url: 'https://x.test/app/admin?q=ana@example.test#top' }),
    ).toEqual({ type: 'pageview', url: 'https://x.test/app/admin' });
    expect(withoutQuery({ url: 'https://x.test/en/faq#install' }).url).toBe(
      'https://x.test/en/faq',
    );
    expect(withoutQuery({ url: 'https://x.test/' }).url).toBe('https://x.test/');
  });
});
