import { expect, it, vi } from 'vitest';
import { sameMinimap } from './uiSnapshot';
import { gameStore, newPlayer, type MinimapData } from '../../store/gameStore';

it('preserves an unchanged minimap but detects movement, drops and boss metadata', () => {
  const map: MinimapData = {
    player: { x: 10, y: 20 },
    monsters: [{ x: 50, y: 60, boss: true, level: 90, name: 'Boss' }],
    npcs: [{ x: 30, y: 40 }],
    loot: [{ x: 70, y: 80 }],
  };
  expect(sameMinimap(map, structuredClone(map))).toBe(true);
  expect(sameMinimap(map, { ...map, player: { x: 11, y: 20 } })).toBe(false);
  expect(sameMinimap(map, { ...map, loot: [] })).toBe(false);
  expect(sameMinimap(map, { ...map, monsters: [{ ...map.monsters[0], boss: false }] })).toBe(false);
  expect(sameMinimap(map, { ...map, npcs: [{ x: 31, y: 40 }] })).toBe(false);
});

it('does not notify HUD subscribers for regeneration at full health and mana', () => {
  const previous = gameStore.getState();
  const stats = previous.stats;
  gameStore.setState({ player: { ...newPlayer(), hp: stats.maxHp, mp: stats.maxMp } });
  const listener = vi.fn(),
    unsubscribe = gameStore.subscribe(listener);
  try {
    const fullPlayer = gameStore.getState().player;
    gameStore.getState().restore(20, 20);
    expect(gameStore.getState().player).toBe(fullPlayer);
    expect(listener).not.toHaveBeenCalled();
    gameStore.setState({ player: { ...fullPlayer, hp: stats.maxHp - 10 } });
    listener.mockClear();
    gameStore.getState().restore(5, 0);
    expect(gameStore.getState().player.hp).toBe(stats.maxHp - 5);
    expect(listener).toHaveBeenCalledTimes(1);
  } finally {
    unsubscribe();
    gameStore.setState(previous);
  }
});
