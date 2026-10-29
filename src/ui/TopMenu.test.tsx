// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { it, expect } from 'vitest';
import { TopMenu } from './TopMenu';
import { gameStore, newPlayer } from '../store/gameStore';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
it('shows every desktop feature directly and keeps mobile compact', () => {
  const previous = gameStore.getState(),
    host = document.createElement('div'),
    root = createRoot(host);
  gameStore.setState({ player: { ...newPlayer(), admitted: true }, menu: null });
  try {
    act(() => root.render(<TopMenu phone />));
    expect(host.querySelectorAll('button')).toHaveLength(5);
    act(() => host.querySelector<HTMLButtonElement>('[aria-expanded]')!.click());
    expect(host.querySelector('.menu-btn-premium')).not.toBeNull();
    act(() => host.querySelector<HTMLButtonElement>('.menu-btn-sect')!.click());
    expect(gameStore.getState().menu).toBe('sect');
    expect(host.querySelector('.top-menu-more')).toBeNull();
    act(() => root.render(<TopMenu />));
    expect(host.querySelectorAll('.top-menu-desktop > button')).toHaveLength(16);
    expect(host.querySelector('[aria-label="Thêm tính năng"]')).toBeNull();
    expect(host.querySelector('[aria-label="Bày Bán"]')).toBeNull();
    expect(
      host.querySelector('.top-menu-desktop button:last-child')?.getAttribute('aria-label'),
    ).toBe('Cài Đặt');
    for (const [label, menu] of [
      ['Tiên Ngọc', 'premium'],
      ['Giao Dịch', 'shop'],
      ['Săn Boss', 'boss'],
      ['Linh Thú', 'companions'],
      ['Bảng Xếp Hạng', 'ranking'],
      ['Cài Đặt', 'settings'],
    ]) {
      act(() =>
        [...host.querySelectorAll<HTMLButtonElement>('button')]
          .find((button) => button.getAttribute('aria-label') === label)!
          .click(),
      );
      expect(gameStore.getState().menu).toBe(menu);
    }
    expect(host.querySelector('.top-menu-more')).toBeNull();
  } finally {
    act(() => root.unmount());
    gameStore.setState(previous);
  }
});
