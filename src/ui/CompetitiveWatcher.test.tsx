// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { CompetitiveWatcher } from './CompetitiveWatcher';
import { rankedAction, rankedStore, type RankedPage } from '../net/ranked';
import { socialStore } from '../store/socialStore';
import { newPlayer } from '../store/gameStore';
import { playerStats } from '../game/systems/progression';
import { buildDuelist } from '../game/systems/duel';
import { ArenaEngine } from '../game/systems/arena';
vi.mock('../net/session', () => ({
  useAccount: () => ({ user: { id: 'a' } }),
  getAccountState: () => ({ user: { id: 'a' } }),
}));
vi.mock('../net/socialBridge', () => ({ openRankedArena: vi.fn(() => true) }));
vi.mock('../net/ranked', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../net/ranked')>()),
  rankedAction: vi.fn(),
}));
vi.mock('../net/worldActivities', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../net/worldActivities')>()),
  activityAction: vi.fn(),
}));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
function fixture() {
  const p = { ...newPlayer(), level: 99, realmIndex: 9 },
    a = buildDuelist(p, playerStats(p), 'Khuy Niết', 'a'),
    b = { ...a, userId: 'b' };
  const engine = new ArenaEngine('ranked-match', a, b);
  engine.start();
  for (let n = 0; n < 31; n++) engine.step(100);
  const duel = {
    rankedId: 'ranked-match',
    nonce: 'ranked-match',
    snapshot: engine.snapshot(),
    a,
    b,
    localId: 'a',
    aIsMe: true,
    practice: false,
  };
  const page: RankedPage = {
    season: '2026-10-26',
    rating: 1000,
    wins: 0,
    losses: 0,
    draws: 0,
    queue: false,
    match: null,
    rows: [],
    status: 'expired',
    result: { id: 'ranked-match', status: 'expired', winner: null, scored: false },
  };
  return { engine, duel, page };
}
it('ends a local ranked fight when the server expires it instead of leaving the map paused indefinitely', async () => {
  vi.useFakeTimers();
  const host = document.createElement('div'),
    root = createRoot(host),
    previous = socialStore.getState(),
    f = fixture();
  vi.mocked(rankedAction).mockReset().mockResolvedValue(f.page);
  try {
    act(() => root.render(<CompetitiveWatcher />));
    act(() => {
      rankedStore.setState({ searching: true });
      socialStore.setState({ duel: f.duel });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100);
    });
    expect(socialStore.getState().duel?.snapshot).toMatchObject({
      phase: 'finished',
      winner: null,
      reason: 'Trận đã hết thời gian xác nhận.',
    });
    expect(vi.mocked(rankedAction).mock.calls.some(([action]) => action === 'report')).toBe(false);
  } finally {
    act(() => root.unmount());
    socialStore.setState(previous);
    vi.useRealTimers();
  }
});
it('retries a lost result request with the same match id and outcome', async () => {
  vi.useFakeTimers();
  const root = createRoot(document.createElement('div')),
    previous = socialStore.getState(),
    f = fixture();
  const settled = {
    ...f.page,
    rating: 1020,
    status: 'finished',
    result: { id: 'ranked-match', status: 'finished', winner: 'a', scored: true },
  };
  vi.mocked(rankedAction).mockReset().mockResolvedValueOnce(null).mockResolvedValue(settled);
  try {
    act(() => root.render(<CompetitiveWatcher />));
    act(() => {
      rankedStore.setState({ searching: true });
      socialStore.setState({ duel: f.duel });
    });
    f.engine.forfeit('b');
    await act(async () => {
      socialStore.setState({ duel: { ...f.duel, snapshot: f.engine.snapshot() } });
      await Promise.resolve();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100);
    });
    const reports = vi.mocked(rankedAction).mock.calls.filter(([action]) => action === 'report');
    expect(reports).toHaveLength(2);
    expect(reports[0]).toEqual(reports[1]);
    expect(reports[0]).toEqual(['report', { id: 'ranked-match', winner: 'a' }]);
  } finally {
    act(() => root.unmount());
    socialStore.setState(previous);
    vi.useRealTimers();
  }
});
