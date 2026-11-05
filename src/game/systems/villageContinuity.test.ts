import { afterEach, expect, it } from 'vitest';
import { gameStore, newPlayer } from '../../store/gameStore';
import { getMap } from '../maps';
import startup from '../../data/startupAssets.json';
import { villageNpcBounds, villageNpcFrame } from '../art/villageStartup';

const previous = gameStore.getState();
afterEach(() => gameStore.setState(previous));

it('does not announce disabling combat when a walking player already has Auto off', () => {
  gameStore.setState({ player: newPlayer(), auto: false, logs: [] });
  const logs = gameStore.getState().logs;
  gameStore.getState().setAuto(false);
  gameStore.getState().setAuto(false);
  expect(gameStore.getState().logs).toBe(logs);
  gameStore.setState({ player: { ...newPlayer(), admitted: true }, auto: true });
  gameStore.getState().setAuto(false);
  expect(gameStore.getState().auto).toBe(false);
  expect(gameStore.getState().logs).toHaveLength(1);
});

it('ships a nonempty prepared sprite for every NPC actually used by the starting village', () => {
  const village = getMap('vuong_gia_thon');
  expect(village.npcs.some((n) => n.id === 'a_moc')).toBe(true);
  for (const npc of village.npcs) {
    const frame = villageNpcFrame(npc.id);
    expect(frame, npc.id).toBeDefined();
    expect(startup.frames[frame as keyof typeof startup.frames][2]).toBeGreaterThan(0);
    const bounds = villageNpcBounds(npc.id)!;
    expect(bounds.bottom, npc.id).toBeGreaterThan(bounds.top);
    expect((startup.urls as Record<string, string>)[`npc-${npc.id}`]).toMatch(/\.webp$/);
  }
});
