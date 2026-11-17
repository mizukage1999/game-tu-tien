// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, vi } from 'vitest';
import { BagPanel } from './BagPanel';
import { gameStore, newPlayer } from '../../store/gameStore';
import { playerStats } from '../../game/systems/progression';
import { inventoryEntries } from '../../game/systems/inventory';
import { equipmentBaseId } from '../../game/systems/equipment';
import { adventure } from '../../game/systems/adventure';
import { dismissWorldPanel } from '../../game/systems/inputFocus';
vi.mock('../../game/art/icons', () => ({ itemIconUrl: (id: string) => `/${id}.png` }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
describe('inventory screen interactions', () => {
  it('focuses cancel, traps keyboard focus, and cancels with Escape without spending anything', () => {
    const host = document.createElement('div'),
      root = createRoot(host),
      previous = gameStore.getState();
    document.body.append(host);
    window.addEventListener('keydown', dismissWorldPanel, true);
    const p = {
      ...newPlayer(),
      admitted: true,
      inventory: { armor_white: 1, tinh_luyen_thach: 3 },
    };
    gameStore.setState({ player: p, status: 'alive', tribulation: null, menu: 'bag' });
    try {
      act(() => root.render(<BagPanel />));
      const trigger = host.querySelector<HTMLButtonElement>('[data-action="enhance"]')!;
      trigger.focus();
      act(() => trigger.click());
      expect(document.activeElement).toBe(host.querySelector('[data-action="cancel-equipment"]'));
      act(() =>
        document.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
        ),
      );
      expect(document.activeElement).toBe(host.querySelector('[data-action="confirm-equipment"]'));
      act(() =>
        document.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
        ),
      );
      expect(document.activeElement).toBe(host.querySelector('[data-action="cancel-equipment"]'));
      act(() =>
        document.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
        ),
      );
      expect(host.querySelector('[role="alertdialog"]')).toBeNull();
      expect(gameStore.getState().menu).toBe('bag');
      expect(gameStore.getState().player.inventory).toEqual(p.inventory);
      expect(document.activeElement).toBe(trigger);
    } finally {
      window.removeEventListener('keydown', dismissWorldPanel, true);
      act(() => root.unmount());
      host.remove();
      gameStore.setState(previous);
    }
  });
  it('cancels a destructive action, then salvages only the approved physical item and clears its upgrade', () => {
    const host = document.createElement('div'),
      root = createRoot(host),
      previous = gameStore.getState();
    const id = 'armor_white~first',
      other = 'armor_white~second',
      p = {
        ...newPlayer(),
        admitted: true,
        inventory: { [id]: 1, [other]: 1, tinh_luyen_thach: 8 },
      };
    p.adventure = { ...adventure(p), enhancements: { [id]: 4, [other]: 2 } };
    gameStore.setState({ player: p, stats: playerStats(p), status: 'alive', tribulation: null });
    try {
      act(() => root.render(<BagPanel />));
      act(() => host.querySelector<HTMLButtonElement>(`[data-item="${id}"]`)!.click());
      act(() => host.querySelector<HTMLButtonElement>('[data-action="salvage"]')!.click());
      expect(host.querySelector('[role="alertdialog"]')?.textContent).toContain('+4');
      expect(gameStore.getState().player.inventory[id]).toBe(1);
      act(() => host.querySelector<HTMLButtonElement>('[data-action="cancel-equipment"]')!.click());
      expect(host.querySelector('[role="alertdialog"]')).toBeNull();
      expect(gameStore.getState().player.inventory[id]).toBe(1);
      act(() => host.querySelector<HTMLButtonElement>('[data-action="salvage"]')!.click());
      const confirm = host.querySelector<HTMLButtonElement>('[data-action="confirm-equipment"]')!;
      act(() => {
        confirm.click();
        confirm.click();
      });
      const saved = gameStore.getState().player;
      expect(saved.inventory[id] ?? 0).toBe(0);
      expect(saved.inventory[other]).toBe(1);
      expect(saved.inventory.huyen_thiet).toBe(2);
      expect(saved.inventory.tinh_luyen_thach).toBe(8);
      expect(saved.adventure?.enhancements[id]).toBeUndefined();
      expect(saved.adventure?.enhancements[other]).toBe(2);
    } finally {
      act(() => root.unmount());
      gameStore.setState(previous);
    }
  });
  it('refuses stale enhancement approvals and spends stones only after a current approval', () => {
    const host = document.createElement('div'),
      root = createRoot(host),
      previous = gameStore.getState();
    const id = 'armor_white~upgrade',
      p = { ...newPlayer(), admitted: true, inventory: { [id]: 1, tinh_luyen_thach: 8 } };
    gameStore.setState({ player: p, stats: playerStats(p), status: 'alive', tribulation: null });
    const rng = vi.spyOn(Math, 'random').mockReturnValue(0.99);
    try {
      act(() => root.render(<BagPanel />));
      act(() => host.querySelector<HTMLButtonElement>('[data-action="enhance"]')!.click());
      act(() => host.querySelector<HTMLButtonElement>('[data-action="cancel-equipment"]')!.click());
      expect(gameStore.getState().player.inventory.tinh_luyen_thach).toBe(8);
      act(() => host.querySelector<HTMLButtonElement>('[data-action="enhance"]')!.click());
      act(() => {
        const s = gameStore.getState();
        gameStore.setState({
          player: { ...s.player, adventure: { ...adventure(s.player), enhancements: { [id]: 3 } } },
        });
      });
      expect(
        host.querySelector<HTMLButtonElement>('[data-action="confirm-equipment"]')!.disabled,
      ).toBe(true);
      act(() =>
        host.querySelector<HTMLButtonElement>('[data-action="confirm-equipment"]')!.click(),
      );
      expect(gameStore.getState().player.inventory.tinh_luyen_thach).toBe(8);
      act(() => host.querySelector<HTMLButtonElement>('[data-action="cancel-equipment"]')!.click());
      act(() => host.querySelector<HTMLButtonElement>('[data-action="enhance"]')!.click());
      expect(host.querySelector('[role="alertdialog"]')?.textContent).toContain('85%');
      expect(host.querySelector('[role="alertdialog"]')?.textContent).toContain('2 Đá');
      act(() =>
        host.querySelector<HTMLButtonElement>('[data-action="confirm-equipment"]')!.click(),
      );
      expect(gameStore.getState().player.inventory.tinh_luyen_thach).toBe(6);
      expect(gameStore.getState().player.adventure?.enhancements[id]).toBe(3);
      expect(host.querySelector('[role="status"]')?.textContent).toContain('thất bại');
    } finally {
      rng.mockRestore();
      act(() => root.unmount());
      gameStore.setState(previous);
    }
  });
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
      const key = gameStore.getState().player.equipment.weapon!;
      expect(equipmentBaseId(key)).toBe('weapon_white');
      expect(gameStore.getState().player.inventory.weapon_white ?? 0).toBe(0);
      expect(
        inventoryEntries(gameStore.getState().player).find((e) => e.id === key)?.quantity,
      ).toBe(1);
      act(() => host.querySelector<HTMLButtonElement>('[data-action="enhance"]')!.click());
      expect(gameStore.getState().player.inventory.tinh_luyen_thach).toBe(2);
      expect(host.querySelector('[role="alertdialog"]')?.textContent).toContain('100%');
      act(() =>
        host.querySelector<HTMLButtonElement>('[data-action="confirm-equipment"]')!.click(),
      );
      expect(gameStore.getState().player.adventure?.enhancements[key]).toBe(1);
      expect(gameStore.getState().player.inventory.tinh_luyen_thach).toBe(1);
      expect(host.querySelector('[role="status"]')?.textContent).toContain('thành công');
      act(() => host.querySelector<HTMLButtonElement>('[data-action="primary"]')!.click());
      expect(gameStore.getState().player.equipment.weapon).toBeUndefined();
      expect(gameStore.getState().player.inventory[key]).toBe(1);
      expect(gameStore.getState().player.adventure?.enhancements[key]).toBe(1);
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
