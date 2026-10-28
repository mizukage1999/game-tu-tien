import { beforeEach, expect, it, vi } from 'vitest';
import { fetchLeaderboard, leaderboardError, parseLeaderboard } from './leaderboard';
import { personalRankingEntry } from '../game/systems/rankingUi';
import { newPlayer } from '../store/gameStore';
import { playerStats } from '../game/systems/progression';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), account: vi.fn(), lease: vi.fn() }));
vi.mock('./supabase', () => ({ supabase: { rpc: mocks.rpc } }));
vi.mock('./session', () => ({ getAccountState: mocks.account }));
vi.mock('./activeSession', () => ({ activeSessionId: mocks.lease }));
const uid = '30000000-0000-4000-8000-000000000001';
function fixture() {
  const p = newPlayer(),
    entry = personalRankingEntry(p, playerStats(p), {}, 'vuong_gia_thon');
  const publicEntry = {
    ...entry,
    id: uid,
    inspection: { ...entry.inspection, userId: uid },
    bossKills: 0,
    updatedAt: '2026-10-28T00:00:00Z',
  };
  return {
    category: 'power',
    supported: true,
    population: 4,
    total: 1,
    offset: 0,
    limit: 8,
    serverTime: '2026-10-28T00:00:00Z',
    top: [{ rank: 1, entry: publicEntry }],
    rows: [{ rank: 4, entry: publicEntry }],
    self: { rank: 4, entry: publicEntry },
  };
}
beforeEach(() => {
  mocks.account.mockReturnValue({ user: { id: uid } });
  mocks.lease.mockReturnValue('lease');
  mocks.rpc.mockReset();
});
it('validates public profiles, keeps global ranks and strips all unlisted fields', () => {
  const payload = fixture();
  Object.assign(payload.rows[0].entry, { inventory: { secret: 1 }, email: 'private', wallet: 999 });
  const parsed = parseLeaderboard(payload, 'power')!;
  expect(parsed.rows[0].serverRank).toBe(4);
  expect(parsed.self?.id).toBe(uid);
  expect(parsed.rows[0]).not.toHaveProperty('inventory');
  expect(JSON.stringify(parsed)).not.toMatch(/secret|private|wallet/);
  expect(
    parseLeaderboard({ ...payload, self: { ...payload.self, rank: null } }, 'power')?.self
      ?.serverRank,
  ).toBeNull();
});
it('rejects wrong categories, malformed identities, duplicated profiles, invalid ranks and oversized responses', () => {
  const base = fixture();
  for (const payload of [
    { ...base, category: 'level' },
    { ...base, rows: [{ rank: -1, entry: base.self.entry }] },
    { ...base, rows: [base.rows[0], base.rows[0]], total: 2 },
    { ...base, rows: [{ rank: 4, entry: { ...base.self.entry, id: 'not-a-uuid' } }] },
    {
      ...base,
      rows: [
        {
          rank: 4,
          entry: {
            ...base.self.entry,
            inspection: { ...base.self.entry.inspection, userId: crypto.randomUUID() },
          },
        },
      ],
    },
    { ...base, limit: 999 },
    { ...base, total: 5 },
    { ...base, self: { rank: 9, entry: base.self.entry } },
    { ...base, supported: false },
    { ...base, rows: [{ rank: 4, entry: { ...base.self.entry, contribution: Infinity } }] },
  ])
    expect(parseLeaderboard(payload, 'power')).toBeNull();
});
it('sends a bounded request bound to the current lease and propagates cancellation', async () => {
  const signal = new AbortController().signal,
    abortSignal = vi.fn().mockResolvedValue({ data: fixture(), error: null });
  mocks.rpc.mockReturnValue({ abortSignal });
  expect((await fetchLeaderboard('power', '  Thanh Trúc  ', 2, signal)).rows[0].serverRank).toBe(4);
  expect(mocks.rpc).toHaveBeenCalledWith(
    'game_leaderboard',
    expect.objectContaining({
      p_instance_id: 'lease',
      p_query: 'Thanh Trúc',
      p_offset: 16,
      p_limit: 8,
    }),
  );
  expect(abortSignal).toHaveBeenCalledWith(signal);
  mocks.account.mockReturnValue({ user: null });
  await expect(fetchLeaderboard('power', '', 0, signal)).rejects.toThrow('LOGIN_REQUIRED');
});
it('discards a response after session takeover and distinguishes missing installation from network errors', async () => {
  mocks.rpc.mockReturnValue({
    abortSignal: () => {
      mocks.lease.mockReturnValue('new-lease');
      return Promise.resolve({ data: fixture(), error: null });
    },
  });
  await expect(fetchLeaderboard('power', '', 0, new AbortController().signal)).rejects.toThrow(
    'SESSION_REPLACED',
  );
  expect(leaderboardError({ code: 'PGRST202', message: 'missing' })).toContain('chờ kích hoạt');
  expect(leaderboardError(new Error('timeout'))).toContain('quá lâu');
  expect(leaderboardError(new Error('SESSION_REPLACED'))).toContain('đăng nhập lại');
});
