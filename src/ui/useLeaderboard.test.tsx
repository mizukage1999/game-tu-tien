// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useLeaderboard } from './useLeaderboard';
import type { RankingCategory } from '../game/systems/rankingUi';
import type { LeaderboardPage } from '../net/leaderboard';
const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  flush: vi.fn(),
  emit: vi.fn(),
  account: { user: { id: 'one' } },
}));
vi.mock('../net/leaderboard', () => ({
  fetchLeaderboard: mocks.fetch,
  leaderboardError: (e: unknown) => String(e),
}));
vi.mock('../net/session', () => ({ useAccount: () => mocks.account }));
vi.mock('../net/cloudSave', () => ({ flushCloudSave: mocks.flush }));
vi.mock('../game/EventBus', () => ({ EventBus: { emit: mocks.emit } }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root: Root, host: HTMLDivElement, latest: ReturnType<typeof useLeaderboard>;
function View({
  category = 'power',
  query = '',
  page = 0,
}: {
  category?: RankingCategory;
  query?: string;
  page?: number;
}) {
  latest = useLeaderboard(category, query, page);
  return null;
}
const data = (category: RankingCategory): LeaderboardPage => ({
  category,
  supported: true,
  population: 1,
  total: 1,
  offset: 0,
  limit: 8,
  serverTime: '2026-10-28T00:00:00Z',
  rows: [],
  top: [],
  self: null,
});
beforeEach(() => {
  vi.useFakeTimers();
  mocks.account.user.id = 'one';
  mocks.fetch.mockReset();
  mocks.flush.mockReset().mockResolvedValue(undefined);
  mocks.emit.mockReset();
  host = document.createElement('div');
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  vi.useRealTimers();
});
it('cancels stale requests when switching boards and never labels old data with the new category', async () => {
  const resolve: ((value: LeaderboardPage) => void)[] = [];
  mocks.fetch.mockImplementation(() => new Promise((done) => resolve.push(done)));
  await act(async () => root.render(<View />));
  const firstSignal = mocks.fetch.mock.calls[0][3] as AbortSignal;
  await act(async () => root.render(<View category="level" />));
  expect(firstSignal.aborted).toBe(true);
  expect(latest.data).toBeUndefined();
  await act(async () => resolve[1](data('level')));
  expect(latest.data?.category).toBe('level');
  await act(async () => resolve[0](data('power')));
  expect(latest.data?.category).toBe('level');
});
it('debounces search and clears previous results while the query is pending', async () => {
  mocks.fetch.mockResolvedValue(data('power'));
  await act(async () => root.render(<View />));
  expect(latest.data).toBeDefined();
  await act(async () => root.render(<View query="Thanh" />));
  expect(latest.data).toBeUndefined();
  await act(async () => vi.advanceTimersByTime(299));
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
  await act(async () => vi.advanceTimersByTime(1));
  expect(mocks.fetch).toHaveBeenCalledTimes(2);
  expect(mocks.fetch.mock.calls[1][1]).toBe('Thanh');
});
it('manual refresh waits for the save queue before loading current server ranks', async () => {
  mocks.fetch.mockResolvedValue(data('power'));
  await act(async () => root.render(<View />));
  await act(async () => latest.refresh());
  expect(mocks.emit).toHaveBeenCalledWith('cmd:save');
  expect(mocks.flush).toHaveBeenCalledWith('one');
  expect(mocks.fetch).toHaveBeenCalledTimes(2);
});
it('times out a hanging save without leaving the board loading forever', async () => {
  mocks.fetch.mockResolvedValue(data('power'));
  mocks.flush.mockImplementation(() => new Promise(() => {}));
  await act(async () => root.render(<View />));
  await act(async () => latest.refresh());
  await act(async () => vi.advanceTimersByTime(12000));
  expect(latest.loading).toBe(false);
  expect(latest.error).toContain('timeout');
});
it('ignores a timed-out save that fails after switching accounts', async () => {
  let rejectSave!: (reason: Error) => void;
  mocks.fetch.mockImplementation((category: RankingCategory) => Promise.resolve(data(category)));
  mocks.flush
    .mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectSave = reject;
        }),
    )
    .mockResolvedValue(undefined);
  await act(async () => root.render(<View />));
  await act(async () => latest.refresh());
  await act(async () => vi.advanceTimersByTime(12000));
  mocks.account.user.id = 'two';
  await act(async () => root.render(<View category="level" />));
  expect(latest.data?.category).toBe('level');
  await act(async () => rejectSave(new Error('old save failed')));
  expect(latest.data?.category).toBe('level');
  expect(latest.error).toBeUndefined();
});
