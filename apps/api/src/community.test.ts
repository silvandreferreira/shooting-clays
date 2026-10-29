import type { Leaderboard, Me } from '@shooting-clays/shared';
import { describe, expect, it } from 'vitest';
import { upsertAuthUser } from './db/memory';
import { profiles, sessions } from './db/schema';
import { createTestApp, OTHER } from './test-utils';

type Db = Awaited<ReturnType<typeof createTestApp>>['db'];

async function addShooter(
  db: Db,
  id: string,
  status: 'pending' | 'active' | 'disabled' = 'active',
  showInCommunity = true,
) {
  await db
    .insert(profiles)
    .values({ userId: id, displayName: `Shooter ${id}`, status, showInCommunity });
}

async function addSeries(
  db: Db,
  userId: string,
  scores: number[],
  date = '2026-10-10',
  discipline = 'fosso',
  place: { clubId: string; fieldId: string } = { clubId: 'ccm', fieldId: '1' },
) {
  await db
    .insert(sessions)
    .values(scores.map((score) => ({ userId, date, discipline, score, ...place })));
}

const names = (board: Leaderboard) => board.entries.map((e) => [e.rank, e.displayName]);

// R26: Community leaderboard API.
describe('community leaderboard', () => {
  it('ranks by series at 25, then 24, … and returns no ids or emails', async () => {
    const { db, json } = await createTestApp({ empty: true });
    await addShooter(db, 'a');
    await addShooter(db, 'b');
    await addSeries(db, 'a', [25, 25, 24, 24]);
    await addSeries(db, 'b', [25, 25, 24, 23, 23]);
    await addSeries(db, OTHER.id, [24, 24, 24, 24, 24]);

    const res = await json(
      'GET',
      '/api/community/leaderboard?clubId=ccm&discipline=fosso',
      undefined,
      OTHER,
    );
    expect(res.status).toBe(200);
    const board = (await res.json()) as Leaderboard;
    expect(board).toMatchObject({
      clubId: 'ccm',
      discipline: 'fosso',
      fieldId: null,
      from: '2026-10-01',
      to: '2026-10-31',
      meHidden: false,
    });
    expect(names(board)).toEqual([
      [1, 'Shooter a'],
      [2, 'Shooter b'],
      [3, OTHER.name],
    ]);
    expect(board.entries[2]).toMatchObject({
      bestScore: 24,
      bestScoreCount: 5,
      series: 5,
      isMe: true,
    });
    const text = JSON.stringify(board);
    expect(text).not.toContain('userId');
    expect(text).not.toContain('@');
  });

  it('excludes pending, disabled and hidden users; one entry per shooter', async () => {
    const { db, json } = await createTestApp({ empty: true });
    await addShooter(db, 'pending', 'pending');
    await addShooter(db, 'disabled', 'disabled');
    await addShooter(db, 'hidden', 'active', false);
    for (const id of ['pending', 'disabled', 'hidden']) await addSeries(db, id, [25]);
    await addSeries(db, OTHER.id, [20, 21, 22]);

    const board = (await (
      await json('GET', '/api/community/leaderboard?clubId=ccm&discipline=fosso', undefined, OTHER)
    ).json()) as Leaderboard;
    expect(names(board)).toEqual([[1, OTHER.name]]);
  });

  it('counts only the club, discipline and month asked for, and the field when given', async () => {
    const { db, json } = await createTestApp({ empty: true });
    await addShooter(db, 'a');
    await addSeries(db, 'a', [25], '2026-10-01'); // Field 1
    await addSeries(db, 'a', [24], '2026-10-31', 'fosso', { clubId: 'ccm', fieldId: '2' });
    await addSeries(db, 'a', [23], '2026-10-20', 'fosso', { clubId: 'ccm', fieldId: '2' });
    await addSeries(db, 'a', [25], '2026-10-20', 'fosso', { clubId: 'other', fieldId: '1' });
    await addSeries(db, 'a', [25], '2026-10-23', 'compak');
    await addSeries(db, 'a', [25], '2026-09-30');

    const get = async (query: string) =>
      (await (
        await json(
          'GET',
          `/api/community/leaderboard?clubId=ccm&discipline=fosso${query}`,
          undefined,
          OTHER,
        )
      ).json()) as Leaderboard;

    // Every field of the club; another club's series do not count.
    const month = await get('');
    expect(month).toMatchObject({ from: '2026-10-01', to: '2026-10-31', fieldId: null });
    expect(month.entries[0]).toMatchObject({ bestScore: 25, bestScoreCount: 1, series: 3 });
    expect((await get('&fieldId=2')).entries[0]).toMatchObject({ bestScore: 24, series: 2 });
    expect(await get('&fieldId=2')).toMatchObject({ fieldId: '2' });
    expect((await get('&date=2026-09-15')).entries[0]).toMatchObject({ series: 1 });
    expect((await get('&date=2026-08-15')).entries).toEqual([]);
  });

  it('a calendar year with period=year', async () => {
    const { db, json } = await createTestApp({ empty: true });
    await addShooter(db, 'a');
    await addSeries(db, 'a', [20], '2026-01-01');
    await addSeries(db, 'a', [21], '2026-12-31');
    await addSeries(db, 'a', [25], '2025-12-31');
    const board = (await (
      await json(
        'GET',
        '/api/community/leaderboard?clubId=ccm&discipline=fosso&period=year&date=2026-10-29',
        undefined,
        OTHER,
      )
    ).json()) as Leaderboard;
    expect(board).toMatchObject({ period: 'year', from: '2026-01-01', to: '2026-12-31' });
    expect(board.entries[0]).toMatchObject({ bestScore: 21, series: 2 });
  });

  // Installed apps from before decision #71 asked without a club (and with day/week/month):
  // they got 400 and an empty Community until they updated.
  it('without a club uses the home club, and an old period is the month', async () => {
    const { db, json } = await createTestApp({ empty: true });
    await addShooter(db, 'a');
    await addSeries(db, 'a', [22], '2026-10-05');
    for (const period of ['day', 'week', 'month']) {
      const res = await json(
        'GET',
        `/api/community/leaderboard?discipline=fosso&period=${period}`,
        undefined,
        OTHER,
      );
      expect(res.status).toBe(200);
      const board = (await res.json()) as Leaderboard;
      expect(board).toMatchObject({ clubId: 'ccm', period: 'month', from: '2026-10-01' });
      expect(board.entries[0]).toMatchObject({ bestScore: 22 });
    }
  });

  it('validates the query', async () => {
    const { json } = await createTestApp({ empty: true });
    for (const query of [
      '',
      'clubId=ccm',
      'clubId=nope&discipline=fosso',
      'clubId=ccm&discipline=golf',
      'clubId=ccm&discipline=fosso&fieldId=3',
      'clubId=ccm&discipline=fosso&fieldId=9',
      'clubId=ccm&discipline=fosso&date=2026-13-01',
    ]) {
      const res = await json('GET', `/api/community/leaderboard?${query}`, undefined, OTHER);
      expect(res.status).toBe(400);
    }
  });

  it('"Show me in the Community" off removes the user and says so; on brings them back', async () => {
    const { db, json } = await createTestApp({ empty: true });
    await addSeries(db, OTHER.id, [20]);
    const board = async () =>
      (await (
        await json(
          'GET',
          '/api/community/leaderboard?clubId=ccm&discipline=fosso',
          undefined,
          OTHER,
        )
      ).json()) as Leaderboard;

    expect(
      ((await (await json('GET', '/api/me', undefined, OTHER)).json()) as Me).showInCommunity,
    ).toBe(true);

    const off = await json('PUT', '/api/me/profile', { showInCommunity: false }, OTHER);
    expect(((await off.json()) as Me).showInCommunity).toBe(false);
    expect(await board()).toMatchObject({ entries: [], meHidden: true });

    await json('PUT', '/api/me/profile', { showInCommunity: true }, OTHER);
    expect(await board()).toMatchObject({ entries: [{ isMe: true }], meHidden: false });
  });

  it('the display name change shows on the leaderboard; an empty update is rejected', async () => {
    const { db, json } = await createTestApp({ empty: true });
    await addSeries(db, OTHER.id, [20]);
    expect((await json('PUT', '/api/me/profile', {}, OTHER)).status).toBe(400);
    const res = await json('PUT', '/api/me/profile', { displayName: '  Ace  ' }, OTHER);
    expect(((await res.json()) as Me).displayName).toBe('Ace');
    const board = (await (
      await json('GET', '/api/community/leaderboard?clubId=ccm&discipline=fosso', undefined, OTHER)
    ).json()) as Leaderboard;
    expect(board.entries[0]?.displayName).toBe('Ace');
  });

  it('shows the Google photo from Neon Auth even when the profile has none', async () => {
    const { db, json } = await createTestApp({ empty: true });
    await addShooter(db, 'photo');
    await addShooter(db, 'letter');
    const image = 'https://lh3.googleusercontent.com/a/photo';
    await upsertAuthUser(db, { id: 'photo', email: 'photo@example.test', name: 'P', image });
    await addSeries(db, 'photo', [25]);
    await addSeries(db, 'letter', [24]);

    const board = (await (
      await json('GET', '/api/community/leaderboard?clubId=ccm&discipline=fosso', undefined, OTHER)
    ).json()) as Leaderboard;
    expect(board.entries.map((e) => e.avatarUrl)).toEqual([image, null]);
  });
});
