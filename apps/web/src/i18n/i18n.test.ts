import { afterEach, describe, expect, it } from 'vitest';
import { formatDate, formatList, formatPeriod, formatShortDate } from '../lib/format';
import { en } from './en';
import { activateLocale, apiErrorMessage, detectLocale } from './index';
import { ptPT } from './pt-PT';

/** Every key path, with a sample value: functions are called with numbers and names. */
function leaves(value: unknown, path = ''): [string, unknown][] {
  if (typeof value === 'function') return [[path, (value as (...a: unknown[]) => unknown)(2, 3)]];
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
  }
  return [[path, value]];
}

describe('pt-PT strings', () => {
  it('has every English key, with a non-empty value', () => {
    const pt = new Map(leaves(ptPT));
    for (const [path] of leaves(en)) {
      const value = pt.get(path);
      expect(typeof value === 'string' && value.trim().length > 0, path).toBe(true);
    }
    expect(pt.size).toBe(leaves(en).length);
  });
});

describe('detectLocale', () => {
  it('any Portuguese browser language gives pt-PT, anything else English', () => {
    expect(detectLocale(['pt-PT', 'en'])).toBe('pt-PT');
    expect(detectLocale(['pt-BR'])).toBe('pt-PT');
    expect(detectLocale(['PT'])).toBe('pt-PT');
    expect(detectLocale(['en-GB', 'pt-PT'])).toBe('pt-PT');
    expect(detectLocale(['es', 'fr'])).toBe('en');
    expect(detectLocale([])).toBe('en');
  });
});

describe('formatting per language', () => {
  afterEach(() => activateLocale('en'));

  it('English', () => {
    activateLocale('en');
    expect(formatDate('2026-10-23')).toBe('23 Oct 2026');
    expect(formatShortDate('2026-10-23')).toBe('23 Oct');
    expect(formatList(['A', 'C', 'F'])).toBe('A, C and F');
    expect(formatPeriod('month', '2026-10-01', '2026-10-31')).toBe('October 2026');
    expect(document.documentElement.lang).toBe('en');
  });

  it('European Portuguese', () => {
    activateLocale('pt-PT');
    expect(formatDate('2026-10-23')).toBe('23 out. 2026');
    expect(formatShortDate('2026-10-23')).toBe('23 out.');
    expect(formatList(['A', 'C', 'F'])).toBe('A, C e F');
    expect(formatPeriod('month', '2026-10-01', '2026-10-31')).toBe('outubro de 2026');
    expect(formatPeriod('week', '2026-10-19', '2026-10-25')).toBe('19–25 out. 2026');
    expect(document.documentElement.lang).toBe('pt-PT');
  });
});

describe('apiErrorMessage', () => {
  it('translates known codes and shows unknown ones as they are', () => {
    expect(apiErrorMessage(ptPT, 'INTERNAL_ERROR')).toBe('Ocorreu um erro no servidor.');
    expect(apiErrorMessage(en, 'SOMETHING_NEW')).toBe('SOMETHING_NEW');
  });
});
