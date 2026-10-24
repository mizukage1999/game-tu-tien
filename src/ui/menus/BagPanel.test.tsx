// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, vi } from 'vitest';
import { BagPanel } from './BagPanel';
import { gameStore, newPlayer } from '../../store/gameStore';
import { playerStats } from '../../game/systems/progression';
import { inventoryEntries } from '../../game/systems/inventory';
vi.mock('../../game/art/icons', () => ({ itemIconUrl: (id: string) => `/${id}.png` }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
describe('inventory screen interactions', () => {
  it('equips, enhances with stones and returns the same item to the bag without duplicating it', () => {
    const host = document.createElement('div'),
      root = createRoot(host),
      previous = gameStore.getState();
    const p = {
      ...newPlayer(),
      level: 20,
      admitted: true,
      inventory: { weapon_white: 1, tinh_luyen_thach: 2 },
    };
    gameStore.setState({ player: p, stats: playerStats(p), status: 'alive' });
    try {
      act(() => root.render(<BagPanel />));
      act(() => host.querySelector<HTMLButtonElement>('[data-item="weapon_white"]')!.click());
      act(() => host.querySelector<HTMLButtonElement>('[data-action="primary"]')!.click());
      expect(gameStore.getState().player.equipment.weapon).toBe('weapon_white');
      expect(gameStore.getState().player.inventory.weapon_white ?? 0).toBe(0);
      expect(
        inventoryEntries(gameStore.getState().player).find((e) => e.id === 'weapon_white')
          ?.quantity,
      ).toBe(1);
      act(() => host.querySelector<HTMLButtonElement>('[data-action="enhance"]')!.click());
      expect(gameStore.getState().player.adventure?.enhancements.weapon_white).toBe(1);
      expect(gameStore.getState().player.inventory.tinh_luyen_thach).toBe(1);
      expect(host.querySelector('[role="status"]')?.textContent).toContain('thành công');
      act(() => host.querySelector<HTMLButtonElement>('[data-action="primary"]')!.click());
      expect(gameStore.getState().player.equipment.weapon).toBeUndefined();
      expect(gameStore.getState().player.inventory.weapon_white).toBe(1);
      expect(gameStore.getState().player.adventure?.enhancements.weapon_white).toBe(1);
    } finally {
      act(() => root.unmount());
      gameStore.setState(previous);
    }
  });
  it('filters by group, rarity and equipped state while refusing gear above the player level', () => {
    const host = document.createElement('div'),
      root = createRoot(host),
      previous = gameStore.getState();
    const p = {
      ...newPlayer(),
      admitted: true,
      inventory: { weapon_red: 1, hoi_xuan_dan: 3, thanh_linh_thao: 5 },
      equipment: { ring: 'nhan_bac' },
    };
    gameStore.setState({ player: p, status: 'alive' });
    try {
      act(() => root.render(<BagPanel />));
      act(() => host.querySelector<HTMLButtonElement>('[data-group="weapon"]')!.click());
      expect(host.querySelectorAll('[data-item]')).toHaveLength(1);
      expect(host.querySelector<HTMLButtonElement>('[data-action="primary"]')!.disabled).toBe(true);
      act(() => host.querySelector<HTMLButtonElement>('[data-group="all"]')!.click());
      act(() => host.querySelector<HTMLButtonElement>('[data-rarity="white"]')!.click());
      expect(host.querySelectorAll('[data-item]')).toHaveLength(1);
      expect(host.querySelector('[data-item="nhan_bac"]')).not.toBeNull();
      act(() => host.querySelector<HTMLButtonElement>('[data-view="bag"]')!.click());
      expect(host.querySelectorAll('[data-item]')).toHaveLength(0);
      expect(host.querySelector('.cult-bag-empty h2')?.textContent).toContain('Không có');
    } finally {
      act(() => root.unmount());
      gameStore.setState(previous);
    }
  });
  it('uses an elixir from the selected item and updates its remaining quantity immediately', () => {
    const host = document.createElement('div'),
      root = createRoot(host),
      previous = gameStore.getState();
    const p = { ...newPlayer(), admitted: true, hp: 50, mp: 30, inventory: { hoi_xuan_dan: 2 } };
    gameStore.setState({ player: p, stats: playerStats(p), status: 'alive' });
    try {
      act(() => root.render(<BagPanel />));
      act(() => host.querySelector<HTMLButtonElement>('[data-action="primary"]')!.click());
      expect(gameStore.getState().player.inventory.hoi_xuan_dan).toBe(1);
      expect(gameStore.getState().player.hp).toBeGreaterThan(50);
      expect(host.querySelector('.cult-item-quantity')?.textContent).toBe('1');
      expect(host.querySelector('[role="status"]')?.textContent).toContain('Đã dùng');
    } finally {
      act(() => root.unmount());
      gameStore.setState(previous);
    }
  });
});
