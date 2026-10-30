// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { PowerGrowthNotice } from './PowerGrowthNotice';
import { AdventureGuide } from './AdventureGuide';
import { gameStore, newPlayer } from '../store/gameStore';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
it('shows a real gain without opening a menu, and lets the player review or dismiss it', () => {
  vi.useFakeTimers();
  const host = document.createElement('div'),
    root = createRoot(host),
    previous = gameStore.getState();
  const p = { ...newPlayer({ sex: 'male' }), level: 7, admitted: true };
  gameStore.setState({ player: p, menu: null });
  try {
    act(() => root.render(<PowerGrowthNotice />));
    act(() => gameStore.setState({ player: { ...p, hp: p.hp - 1 } }));
    expect(host.childElementCount).toBe(0);
    act(() => gameStore.setState({ player: { ...p, level: 8 } }));
    expect(host.textContent).toContain('Công +6');
    expect(gameStore.getState().menu).toBeNull();
    act(() => host.querySelector<HTMLButtonElement>('.power-growth-action')!.click());
    expect(gameStore.getState().menu).toBe('character');
    expect(host.childElementCount).toBe(0);
    act(() => gameStore.setState({ player: { ...p, level: 9 } }));
    act(() => vi.advanceTimersByTime(6600));
    expect(host.childElementCount).toBe(0);
  } finally {
    act(() => root.unmount());
    gameStore.setState(previous);
    vi.useRealTimers();
  }
});
it('takes the next-goal button to a useful source without spending or granting items', () => {
  const host = document.createElement('div'),
    root = createRoot(host),
    previous = gameStore.getState();
  const p = {
    ...newPlayer(),
    admitted: true,
    equipment: { weapon: 'weapon_white' },
    inventory: {},
  };
  gameStore.setState({
    player: p,
    status: 'alive',
    dungeon: null,
    menu: null,
    quests: { first_return: { status: 'done', progress: [1] } },
  });
  try {
    act(() => root.render(<AdventureGuide />));
    expect(host.querySelector('[data-goal="enhance-stone"]')).not.toBeNull();
    act(() => host.querySelector<HTMLButtonElement>('button')!.click());
    expect(gameStore.getState().menu).toBe('dungeon');
    expect(gameStore.getState().player.inventory).toEqual({});
    act(() => gameStore.setState({ player: { ...p, inventory: { tinh_luyen_thach: 1 } } }));
    expect(host.querySelector('[data-goal="enhance"]')).not.toBeNull();
  } finally {
    act(() => root.unmount());
    gameStore.setState(previous);
  }
});
