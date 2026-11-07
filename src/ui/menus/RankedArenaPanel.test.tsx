// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { RankedArenaPanel } from './RankedArenaPanel';
import { gameStore, newPlayer } from '../../store/gameStore';
import { socialStore } from '../../store/socialStore';
import { rankedStore, rankedAction } from '../../net/ranked';
import { practiceDuel } from '../../net/socialBridge';

vi.mock('../../net/ranked', async (original) => ({
  ...(await original<typeof import('../../net/ranked')>()),
  rankedAction: vi.fn(),
}));
vi.mock('../../net/socialBridge', () => ({ practiceDuel: vi.fn() }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const game = gameStore.getState(),
  social = socialStore.getState(),
  rank = rankedStore.getState();
let host: HTMLDivElement, root: Root;
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-05T12:00:00Z'));
  gameStore.setState({
    player: { ...newPlayer(), admitted: true },
    status: 'alive',
    dungeon: null,
    tribulation: null,
  });
  socialStore.setState({ connected: true });
  rankedStore.setState({
    busy: false,
    searching: false,
    error: '',
    searchStartedAt: null,
    page: {
      season: '2026-11-02',
      rating: 1000,
      wins: 3,
      losses: 1,
      draws: 0,
      queue: false,
      match: null,
      status: 'idle',
      rows: [{ userId: 'peer', name: 'Đồng Môn', rating: 1100, wins: 4, losses: 2, draws: 0 }],
    },
  });
  host = document.createElement('div');
  root = createRoot(host);
  act(() => root.render(<RankedArenaPanel />));
});
afterEach(() => {
  act(() => root.unmount());
  gameStore.setState(game);
  socialStore.setState(social);
  rankedStore.setState(rank);
  vi.clearAllMocks();
  vi.useRealTimers();
});
it('keeps real join, practice and refresh actions and blocks duplicate joins while queued', () => {
  act(() => host.querySelector<HTMLButtonElement>('.ranked-join')!.click());
  expect(rankedAction).toHaveBeenCalledWith('join');
  act(() => host.querySelector<HTMLButtonElement>('.ranked-practice')!.click());
  expect(practiceDuel).toHaveBeenCalledOnce();
  act(() => rankedStore.setState({ searching: true, searchStartedAt: Date.now() - 12000 }));
  expect(host.querySelector<HTMLButtonElement>('.ranked-join')!.disabled).toBe(true);
  expect(host.querySelector<HTMLButtonElement>('.ranked-practice')!.disabled).toBe(true);
  expect(host.querySelector('time')!.textContent).toBe('00:12');
  act(() => vi.advanceTimersByTime(2000));
  expect(host.querySelector('time')!.textContent).toBe('00:14');
  act(() => host.querySelector<HTMLButtonElement>('.ranked-cancel')!.click());
  expect(rankedAction).toHaveBeenCalledWith('leave');
  expect(host.querySelector('.ranked-table')!.textContent).toContain('Đồng Môn');
});
it('renders queue failures in the panel and keeps offline and child matchmaking disabled', () => {
  act(() => socialStore.setState({ connected: false }));
  expect(host.querySelector<HTMLButtonElement>('.ranked-join')!.disabled).toBe(true);
  act(() => rankedStore.setState({ error: 'Kết nối bị gián đoạn' }));
  expect(host.querySelector('[role=alert]')!.textContent).toContain('Kết nối bị gián đoạn');
  act(() => {
    socialStore.setState({ connected: true });
    gameStore.setState({ player: { ...newPlayer(), origin: 'vuong_gia_thon', admitted: false } });
  });
  expect(host.querySelector<HTMLButtonElement>('.ranked-join')!.disabled).toBe(true);
});
it('switches the phone leaderboard page without cancelling an active matchmaking queue', () => {
  act(() => rankedStore.setState({ searching: true, searchStartedAt: Date.now() - 5000 }));
  const tabs = host.querySelectorAll<HTMLButtonElement>('.ranked-mobile-tabs button');
  act(() => tabs[1].click());
  expect(host.querySelector('.ranked-panel')!.classList.contains('mobile-board')).toBe(true);
  expect(tabs[1].getAttribute('aria-pressed')).toBe('true');
  expect(rankedStore.getState().searching).toBe(true);
  act(() => tabs[0].click());
  expect(host.querySelector('.ranked-panel')!.classList.contains('mobile-arena')).toBe(true);
  expect(host.querySelector('time')!.textContent).toBe('00:05');
  expect(rankedAction).not.toHaveBeenCalledWith('leave');
});
