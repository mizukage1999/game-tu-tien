// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { RankingPanel } from './RankingPanel';
import { gameStore, newPlayer } from '../../store/gameStore';
import { playerStats } from '../../game/systems/progression';
vi.mock('../../game/art/icons', () => ({ itemIconUrl: (id: string) => `/${id}.png` }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let host: HTMLDivElement, root: Root, previous: ReturnType<typeof gameStore.getState>;
const named = (parent: string, name: string) =>
  act(() =>
    [...host.querySelectorAll<HTMLButtonElement>(`${parent} button`)]
      .find((b) => b.textContent === name)!
      .click(),
  );
const click = (selector: string) =>
  act(() => host.querySelector<HTMLButtonElement>(selector)!.click());
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
    inventory: { linh_thach: 15 },
  };
  gameStore.setState({
    player: p,
    stats: playerStats(p),
    menu: 'ranking',
    quests: {},
    mapId: 'dai_thua_vien',
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

it('opens on real personal information and leaves server ranking explicitly pending', () => {
  expect(host.querySelectorAll('[data-ranking]')).toHaveLength(1);
  expect(host.querySelector('[role=status]')!.textContent).toContain('Chỉ số nhân vật của bạn');
  expect(host.querySelector('.ranking-table tbody td')!.textContent).toBe('—');
  expect(host.querySelector('.ranking-list-tools')!.textContent).toContain('Thứ hạng: Chờ mở');
  expect(host.querySelector('.ranking-detail')!.textContent).toContain('Thanh Trúc');
  expect(host.querySelector('.ranking-gear-strip img')!.getAttribute('alt')).toContain('Kiếm');
  named('.ranking-detail-footer', 'Mở Nhân Vật ›');
  expect(gameStore.getState().menu).toBe('character');
});

it('offers a labeled top-three preview, working pagination, and Vietnamese search without changing the save', () => {
  const player = gameStore.getState().player,
    quests = gameStore.getState().quests;
  named('.ranking-modes', 'Xem mẫu');
  expect(host.querySelector('[role=status]')!.textContent).toContain('Dữ liệu minh họa');
  expect(host.querySelectorAll('.ranking-podium button')).toHaveLength(3);
  expect(host.querySelectorAll('[data-ranking]')).toHaveLength(8);
  click('[aria-label="Trang sau"]');
  expect(host.querySelector('[aria-current=page]')!.textContent).toBe('2');
  const input = host.querySelector<HTMLInputElement>('[aria-label="Tìm tên nhân vật"]')!;
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
      input,
      'luc tran',
    );
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  expect(host.querySelectorAll('[data-ranking]')).toHaveLength(1);
  expect(host.querySelector('.ranking-table tbody')!.textContent).toContain('Lục Trần');
  click('[aria-label="Xóa tìm kiếm"]');
  expect(host.querySelectorAll('[data-ranking]')).toHaveLength(8);
  expect(gameStore.getState().player).toBe(player);
  expect(gameStore.getState().quests).toBe(quests);
});

it('switches selected character details and never displays sample boss or elements scores as personal data', () => {
  named('.ranking-tabs', 'Săn Boss');
  expect(host.querySelectorAll('[data-ranking]')).toHaveLength(0);
  expect(host.querySelector('.ranking-list-empty')!.textContent).toContain('Chưa có thành tích');
  named('.ranking-modes', 'Xem mẫu');
  click('[aria-label="Xem thông tin Tiêu Vân"]');
  expect(host.querySelector('.ranking-feature h2')!.textContent).toBe('Tiêu Vân');
  named('.ranking-detail-tabs', 'Trang bị');
  expect(host.querySelectorAll('.ranking-equipment .ranking-item')).toHaveLength(6);
  named('.ranking-detail-tabs', 'Linh thú');
  expect(host.querySelector('.ranking-pet')!.textContent).toContain('Tiến hóa');
  named('.ranking-detail-tabs', 'Ngũ hành');
  expect(host.querySelector('.ranking-detail-body')!.textContent).toContain('minh họa');
  named('.ranking-modes', 'Của tôi');
  expect(host.querySelectorAll('[data-ranking]')).toHaveLength(0);
  named('.ranking-tabs', 'Lực Chiến');
  expect(host.querySelectorAll('[data-ranking]')).toHaveLength(1);
  expect(host.querySelector('.ranking-feature h2')!.textContent).toBe('Thanh Trúc');
});
