import { describe, expect, it } from 'vitest';
import { BESTIARY, BESTIARY_HABITATS, BESTIARY_MONSTERS, speciesArt } from '../../data/bestiary';
import { ITEMS, MONSTERS, QUESTS } from '../../data';
import { getMap, MAP_IDS } from '../maps';
import { findPath } from './path';
import { materializeDrop } from './loot';
import { createBrain, provoke, stepMonsterAI } from './monsterAI';

describe('authored monster population', () => {
  it('has thirty distinct species with valid stats, material drops and real equipment drops', () => {
    expect(BESTIARY).toHaveLength(30);
    expect(new Set(BESTIARY.map((s) => s.id)).size).toBe(30);
    for (const s of BESTIARY) {
      const def = MONSTERS[s.id];
      expect(def.art).toBe(speciesArt(s.id));
      expect(def.hp).toBeGreaterThan(0);
      expect(def.attackWindup).toBeLessThan(def.attackInterval);
      for (const drop of def.loot) {
        expect(ITEMS[materializeDrop(drop.item, () => 0.5)], `${s.id}: ${drop.item}`).toBeDefined();
        expect(drop.chance).toBeGreaterThan(0);
        expect(drop.chance).toBeLessThanOrEqual(1);
        expect(drop.qty[0]).toBeGreaterThan(0);
        expect(drop.qty[1]).toBeGreaterThanOrEqual(drop.qty[0]);
      }
    }
  });

  it('places every species on reachable ground and keeps new spawn sites away from entry and quest stops', () => {
    const seen = new Set<string>();
    for (const [id, roster] of Object.entries(BESTIARY_HABITATS)) {
      const map = getMap(id),
        [sx, sy] = map.playerSpawn,
        grid = map.blocked.map((row) => row.slice());
      for (const n of map.npcs) grid[n.y][n.x] = true;
      expect(map.monsters.length).toBeLessThanOrEqual(16);
      for (const type of new Set(roster))
        expect(
          map.monsters.some((m) => m.type === type),
          `${id}: ${type}`,
        ).toBe(true);
      for (const m of map.monsters.filter((m) => !!BESTIARY_MONSTERS[m.type])) {
        seen.add(m.type);
        expect(grid[m.y][m.x], `${id} ${m.type} blocked`).toBe(false);
        expect(findPath(grid, sx, sy, m.x, m.y).reached, `${id} ${m.type} unreachable`).toBe(true);
        expect(Math.hypot(m.x - sx, m.y - sy)).toBeGreaterThanOrEqual(8);
        for (const n of [...map.npcs, ...(map.points ?? [])])
          expect(Math.hypot(m.x - n.x, m.y - n.y)).toBeGreaterThanOrEqual(5);
        for (const p of map.portals)
          expect(
            Math.hypot(m.x - (p.rect[0] + p.rect[2] / 2), m.y - (p.rect[1] + p.rect[3] / 2)),
          ).toBeGreaterThanOrEqual(5);
      }
    }
    expect(seen.size).toBe(30);
  });

  it('preserves safe settlements, legacy kill targets and dungeon wave references', () => {
    for (const id of [
      'vuong_gia_thon',
      'ngoai_mon',
      'dai_thua_vien',
      'linh_son_tong',
      'dinh_ta',
      'dong_phu',
      'sect_archive',
      'sect_sacred',
    ])
      expect(getMap(id).monsters.filter((m) => BESTIARY_MONSTERS[m.type])).toEqual([]);
    for (const id of MAP_IDS)
      for (const m of getMap(id).monsters)
        expect(MONSTERS[m.type], `${id} ${m.type}`).toBeDefined();
    for (const q of Object.values(QUESTS))
      for (const o of q.objectives)
        if (o.type === 'kill') expect(MONSTERS[o.target], o.target).toBeDefined();
    expect(MONSTERS.dg_10_thuong_boss.boss).toBeDefined();
    expect(MONSTERS.dg_10_thuong_boss.art.startsWith('mob-v6-')).toBe(true);
    expect(
      BESTIARY.filter((s) => s.sheet === 'boss').every((s) => MONSTERS[s.id].respawnMs >= 180000),
    ).toBe(true);
  });

  it('lets rabbits and cranes remain neutral until the player attacks', () => {
    for (const type of ['tho_linh', 'linh_hac']) {
      const def = MONSTERS[type],
        brain = createBrain({ x: 0, y: 0 });
      stepMonsterAI(brain, def, { pos: { x: 0, y: 0 }, player: { x: 20, y: 0 }, dt: 16 });
      expect(brain.state).toBe('idle');
      provoke(brain);
      stepMonsterAI(brain, def, { pos: { x: 0, y: 0 }, player: { x: 20, y: 0 }, dt: 16 });
      expect(brain.state).toBe('attack');
    }
  });
});
