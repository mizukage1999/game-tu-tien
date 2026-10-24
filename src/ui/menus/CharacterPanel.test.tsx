// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { it, expect, vi } from 'vitest';
import { CharacterPanel } from './CharacterPanel';
import { gameStore, newPlayer } from '../../store/gameStore';
import { playerStats } from '../../game/systems/progression';
import { adventure } from '../../game/systems/adventure';
vi.mock('../../game/art/icons', () => ({ itemIconUrl: () => '/item.png' }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
it('keeps enhancement, unequip and re-equip working through the character paper-doll', () => {
  const host = document.createElement('div'),
    root = createRoot(host),
    previous = gameStore.getState();
  const p = {
    ...newPlayer({ sex: 'male' }),
    admitted: true,
    level: 20,
    equipment: { weapon: 'weapon_white' },
    inventory: { tinh_luyen_thach: 3 },
  };
  p.adventure = adventure(p);
  gameStore.setState({ player: p, stats: playerStats(p) });
  try {
    act(() => root.render(<CharacterPanel />));
    act(() => host.querySelector<HTMLButtonElement>('[data-slot="weapon"]')!.click());
    const enhance = host.querySelector<HTMLButtonElement>(
      '.cult-equipment-detail .cult-action-row .gold',
    )!;
    expect(enhance.disabled).toBe(false);
    act(() => enhance.click());
    expect(gameStore.getState().player.adventure?.enhancements.weapon_white).toBe(1);
    expect(gameStore.getState().player.inventory.tinh_luyen_thach).toBe(2);
    act(() =>
      host
        .querySelector<HTMLButtonElement>('.cult-equipment-detail .cult-action-row button')!
        .click(),
    );
    expect(gameStore.getState().player.equipment.weapon).toBeUndefined();
    expect(gameStore.getState().player.inventory.weapon_white).toBe(1);
    act(() => host.querySelector<HTMLButtonElement>('.cult-gear-candidate')!.click());
    expect(gameStore.getState().player.equipment.weapon).toBe('weapon_white');
    expect(gameStore.getState().player.adventure?.enhancements.weapon_white).toBe(1);
  } finally {
    act(() => root.unmount());
    gameStore.setState(previous);
  }
});
