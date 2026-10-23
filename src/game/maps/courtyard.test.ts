import { describe, expect, it } from 'vitest';
import { getMap } from './index';
import { findPath } from '../systems/path';
import { herbNodes } from '../systems/immortal';
import { MONSTERS } from '../../data';
import { TILE } from '../art/tiles';
import { COURTYARD_PROPS } from '../art/courtyard';

describe('redesigned sect courtyard', () => {
  const map = getMap('dai_thua_vien');
  const [sx, sy] = map.playerSpawn;
  const grid = map.blocked.map((row) => row.slice());
  for (const npc of map.npcs) grid[npc.y][npc.x] = true;

  it('keeps all NPCs, herbs, meditation and the east gate reachable', () => {
    for (const npc of map.npcs) expect(findPath(grid, sx, sy, npc.x, npc.y, 1).reached, npc.id).toBe(true);
    for (const herb of herbNodes(map.id)) expect(findPath(grid, sx, sy, herb.x, herb.y).reached, herb.id).toBe(true);
    expect(findPath(grid, sx, sy, 24, 6).reached).toBe(true);
    expect(findPath(grid, sx, sy, 47, 17).reached).toBe(true);
    expect(findPath(grid, 45, 17, 24, 10, 1).reached).toBe(true);
  });

  it('keeps training beasts outside the safe NPC and herb areas', () => {
    for (const monster of map.monsters) {
      expect(map.blocked[monster.y][monster.x]).toBe(false);
      expect(findPath(grid, sx, sy, monster.x, monster.y, 1).reached).toBe(true);
      const safeSpots = [...map.npcs, ...herbNodes(map.id), { x: sx, y: sy }, { x: 24, y: 6 }];
      for (const safe of safeSpots) expect(Math.hypot(monster.x - safe.x, monster.y - safe.y) * TILE).toBeGreaterThan(MONSTERS[monster.type].aggroRadius);
    }
  });

  it('blocks the footprints of architecture and leaves the center stairs clear', () => {
    for (const prop of map.decor.filter((d) => d.key.startsWith('court-'))) {
      expect(COURTYARD_PROPS[prop.key], prop.key).toBeDefined();
      for (const [dx, dy] of prop.block ?? []) expect(map.blocked[prop.y + dy][prop.x + dx], prop.key).toBe(true);
    }
    for (let y = 9; y <= 32; y++) for (let x = 22; x <= 25; x++) expect(map.blocked[y][x], `${x},${y}`).toBe(false);
  });

  it('preserves saved arrival points and NPC identities used by quests', () => {
    expect([map.width, map.height]).toEqual([48, 36]);
    expect(map.blocked[20][24]).toBe(false);
    expect(map.blocked[17][45]).toBe(false);
    expect(map.npcs.find((n) => n.id === 'truong_lao')).toMatchObject({ x: 24, y: 10 });
    expect(map.zones[0]).toMatchObject({ id: 'linh_dai', rect: [18, 3, 12, 6] });
    expect(map.portals[0]).toMatchObject({ to: 'linh_thu_lam', rect: [47, 16, 1, 3] });
  });
});
