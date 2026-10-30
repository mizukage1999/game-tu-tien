import { expect, it } from 'vitest';
import { parseRankedPage, rankedTier } from './ranked';
import { newPlayer } from '../store/gameStore';
import { buildDuelist } from '../game/systems/duel';
import { playerStats } from '../game/systems/progression';
import { parseSocialMessage } from './social';
it('preserves full server match UUIDs in readiness packets', () => {
  const nonce = 'd0000000-0000-4000-8000-000000000003';
  const message = parseSocialMessage({ t: 'arena:ready', to: 'a', from: 'b', nonce });
  expect(message && 'nonce' in message ? message.nonce : null).toBe(nonce);
});
it('accepts valid paired fighters and rejects duplicate players or malformed score replies', () => {
  const p = { ...newPlayer(), level: 30 },
    a = buildDuelist(p, playerStats(p), 'Kim Đan', 'a'),
    b = { ...a, userId: 'b' };
  const page = {
    season: '2026-10-26',
    rating: 1000,
    wins: 0,
    losses: 0,
    draws: 0,
    queue: false,
    status: 'playing',
    rows: [],
    match: { id: 'match', a, b, expiresAt: new Date(Date.now() + 180000).toISOString() },
  };
  expect(parseRankedPage(page)?.match?.a.userId).toBe('a');
  expect(parseRankedPage({ ...page, match: { ...page.match, b: a } })).toBeNull();
  expect(parseRankedPage({ ...page, rating: -1 })).toBeNull();
  expect(parseRankedPage({ ...page, rows: [{ rating: 0 }] })).toBeNull();
  expect(rankedTier(1400)).toBe('Tông Sư');
});
