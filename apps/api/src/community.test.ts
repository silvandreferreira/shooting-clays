import type { Leaderboard, Me } from '@shooting-clays/shared';
import { describe, expect, it } from 'vitest';
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
  discipline = 'trap',
) {
  await db.insert(sessions).values(scores.map((score) => ({ userId, date, discipline, score })));
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

    const res = await json('GET', '/api/community/leaderboard?discipline=trap', undefined, OTHER);
    expect(res.status).toBe(200);
    const board = (await res.json()) as Leaderboard;
    expect(board).toMatchObject({
      discipline: 'trap',
      period: 'month',
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
      await json('GET', '/api/community/leaderboard?discipline=trap', undefined, OTHER)
    ).json()) as Leaderboard;
    expect(names(board)).toEqual([[1, OTHER.name]]);
  });

  it('counts only the discipline and the period asked for', async () => {
    const { db, json } = await createTestApp({ empty: true });
    await addShooter(db, 'a');
    await addSeries(db, 'a', [25], '2026-10-19'); // Monday of the week of 2026-10-23
    await addSeries(db, 'a', [25], '2026-10-18'); // Sunday of the week before
    await addSeries(db, 'a', [25], '2026-10-23', 'fosso');
    await addSeries(db, 'a', [10, 11], '2026-10-23');

    const get = async (query: string) =>
      (await (
        await json('GET', `/api/community/leaderboard?discipline=trap&${query}`, undefined, OTHER)
      ).json()) as Leaderboard;

    expect((await get('period=day')).entries[0]).toMatchObject({ bestScore: 11, series: 2 });
    const week = await get('period=week');
    expect(week).toMatchObject({ from: '2026-10-19', to: '2026-10-25' });
    expect(week.entries[0]).toMatchObject({ bestScore: 25, bestScoreCount: 1, series: 3 });
    expect((await get('period=month')).entries[0]).toMatchObject({ series: 4 });
    expect((await get('period=month&date=2026-09-15')).entries).toEqual([]);
  });

  it('validates the query', async () => {
    const { json } = await createTestApp({ empty: true });
    for (const query of [
      '',
      'discipline=golf',
      'discipline=trap&period=year',
      'discipline=trap&date=2026-13-01',
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
        await json('GET', '/api/community/leaderboard?discipline=trap', undefined, OTHER)
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
      await json('GET', '/api/community/leaderboard?discipline=trap', undefined, OTHER)
    ).json()) as Leaderboard;
    expect(board.entries[0]?.displayName).toBe('Ace');
  });
});
