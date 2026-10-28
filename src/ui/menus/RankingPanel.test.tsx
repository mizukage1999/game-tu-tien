// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { RankingPanel } from './RankingPanel';
import { gameStore, newPlayer } from '../../store/gameStore';
import { playerStats } from '../../game/systems/progression';
import {
  personalRankingEntry,
  type RankingEntry,
  type RankingCategory,
} from '../../game/systems/rankingUi';
import type { LeaderboardPage } from '../../net/leaderboard';

const server = vi.hoisted(() => ({ get: vi.fn(), refresh: vi.fn() }));
vi.mock('../useLeaderboard', () => ({
  useLeaderboard: (...args: unknown[]) => server.get(...args),
}));
vi.mock('../../game/art/icons', () => ({ itemIconUrl: (id: string) => `/${id}.png` }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let host: HTMLDivElement,
  root: Root,
  previous: ReturnType<typeof gameStore.getState>,
  entries: RankingEntry[];
const ownId = '30000000-0000-4000-8000-000000000012';
const click = (selector: string) =>
  act(() => host.querySelector<HTMLButtonElement>(selector)!.click());
const named = (parent: string, name: string) =>
  act(() =>
    [...host.querySelectorAll<HTMLButtonElement>(`${parent} button`)]
      .find((b) => b.textContent === name)!
      .click(),
  );
const search = (text: string) =>
  act(() => {
    const input = host.querySelector<HTMLInputElement>('[aria-label="Tìm tên nhân vật"]')!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, text);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
beforeEach(() => {
  previous = gameStore.getState();
  const p = {
    ...newPlayer(),
    name: 'Thanh Trúc',
    admitted: true,
    heroId: 'tham_nguyet' as const,
    level: 40,
    realmIndex: 3,
    equipment: { weapon: 'weapon_purple' },
  };
  gameStore.setState({
    player: p,
    stats: playerStats(p),
    menu: 'ranking',
    quests: {},
    mapId: 'dai_thua_vien',
  });
  entries = Array.from({ length: 16 }, (_, i) => {
    const id = `30000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`;
    const entry = personalRankingEntry(
      { ...p, name: i === 11 ? 'Thanh Trúc' : i === 0 ? 'Lục Trần' : `Đạo Hữu ${i + 1}` },
      playerStats(p),
      {},
      'dai_thua_vien',
    );
    return {
      ...entry,
      id,
      inspection: { ...entry.inspection, userId: id },
      serverRank: i + 1,
      updatedAt: '2026-10-28T00:00:00Z',
    };
  });
  server.refresh.mockReset();
  server.get.mockImplementation((category: RankingCategory, query: string, page: number) => {
    const filtered = entries.filter((e) => e.name.includes(query));
    const data: LeaderboardPage = {
      category,
      supported: category !== 'elements',
      population: 16,
      total: filtered.length,
      offset: page * 8,
      limit: 8,
      serverTime: '2026-10-28T00:00:00Z',
      top: entries.slice(0, 3),
      rows: filtered.slice(page * 8, page * 8 + 8),
      self: entries[11],
    };
    if (category === 'elements')
      Object.assign(data, { population: 0, total: 0, top: [], rows: [], self: null });
    return { data, loading: false, error: undefined, refresh: server.refresh, userId: ownId };
  });
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  act(() => root.render(<RankingPanel />));
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  gameStore.setState(previous);
});

it('opens the server board including offline saved profiles and preserves global ranks across search and pages', () => {
  const player = gameStore.getState().player;
  expect(host.querySelector('[role=status]')!.textContent).toContain('toàn server');
  expect(host.querySelectorAll('[data-ranking]')).toHaveLength(8);
  expect(host.querySelectorAll('.ranking-podium button')).toHaveLength(3);
  click('[aria-label="Trang sau"]');
  expect(host.querySelector('.ranking-table tbody td')!.textContent).toBe('9');
  search('Thanh Trúc');
  expect(host.querySelectorAll('[data-ranking]')).toHaveLength(1);
  expect(host.querySelector('.ranking-table tbody td')!.textContent).toBe('12');
  expect(host.querySelectorAll('.ranking-podium button')).toHaveLength(3);
  expect(host.textContent).not.toContain('minh họa');
  expect(gameStore.getState().player).toBe(player);
});
it('shows own global position even when outside the current page and opens the existing character menu', () => {
  named('.ranking-modes', 'Của tôi');
  expect(host.querySelectorAll('[data-ranking]')).toHaveLength(1);
  expect(host.querySelector('.ranking-table tbody td')!.textContent).toBe('12');
  expect(host.querySelector('.ranking-feature h2')!.textContent).toBe('Thanh Trúc');
  named('.ranking-detail-footer', 'Mở Nhân Vật ›');
  expect(gameStore.getState().menu).toBe('character');
});
it('selects public profiles without modifying the player and leaves unimplemented scores unavailable', () => {
  const player = gameStore.getState().player;
  click('[aria-label="Xem thông tin Lục Trần"]');
  expect(host.querySelector('.ranking-feature h2')!.textContent).toBe('Lục Trần');
  named('.ranking-detail-tabs', 'Trang bị');
  expect(host.querySelectorAll('.ranking-equipment .ranking-item')).toHaveLength(6);
  expect(host.querySelector('.ranking-detail-footer')!.textContent).toContain('Tiến trình đã lưu');
  named('.ranking-tabs', 'Ngũ Hành');
  expect(host.querySelectorAll('[data-ranking]')).toHaveLength(0);
  expect(host.querySelector('.ranking-list-empty')!.textContent).toContain('Ngũ Hành chưa mở');
  expect(gameStore.getState().player).toBe(player);
});
it('shows connection errors with a retry and a truthful local profile fallback', () => {
  server.get.mockReturnValue({
    data: undefined,
    error: 'Kết nối quá lâu.',
    loading: false,
    refresh: server.refresh,
    userId: ownId,
  });
  act(() => root.render(<RankingPanel />));
  expect(host.querySelector('[role=alert]')!.textContent).toContain('Kết nối quá lâu.');
  expect(host.querySelectorAll('[data-ranking]')).toHaveLength(0);
  named('.ranking-notice', 'Thử lại');
  expect(server.refresh).toHaveBeenCalledOnce();
  named('.ranking-modes', 'Của tôi');
  expect(host.querySelector('.ranking-table tbody td')!.textContent).toBe('—');
  expect(host.querySelector('.ranking-pagination')!.textContent).toContain('Hồ sơ trên thiết bị');
});
