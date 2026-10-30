import { expect, it } from 'vitest';
import { ITEMS } from '../../data';
import { HEROES } from '../../data/heroes';
import { seeded } from '../art/canvas';
import { schoolBossDrops } from './loot';
import { gameStore, newPlayer } from '../../store/gameStore';
import { playerStats } from './progression';
it('keeps other-school equipment owned but only equips the matching school', () => {
  const previous = gameStore.getState(),
    player = {
      ...newPlayer(),
      heroId: 'hong_lien' as const,
      level: 99,
      realmIndex: 9,
      inventory: { weapon_blue_wang_lam: 1, weapon_blue_hong_lien: 1 },
    };
  gameStore.setState({ player, stats: playerStats(player) });
  try {
    gameStore.getState().equip('weapon_blue_wang_lam');
    expect(gameStore.getState().player.equipment.weapon).toBeUndefined();
    gameStore.getState().equip('weapon_blue_hong_lien');
    const next = gameStore.getState().player;
    expect(ITEMS[next.equipment.weapon!].hero).toBe('hong_lien');
    expect(Object.keys(next.inventory).some((id) => ITEMS[id]?.hero === 'wang_lam')).toBe(true);
  } finally {
    gameStore.setState(previous);
  }
});
it('uses a strict 55 percent boundary, excludes self from the other pool and preserves materials', () => {
  const drop = [{ item: 'weapon_blue', qty: 1 }],
    sequence = [0.55, 0.999];
  expect(schoolBossDrops(drop, 'wang_lam', () => 0.549)[0].item).toBe('weapon_blue_wang_lam');
  const other = schoolBossDrops(drop, 'wang_lam', () => sequence.shift()!)[0];
  expect(ITEMS[other.item].hero).toBe('diep_ly');
  expect(schoolBossDrops([{ item: 'yeu_dan', qty: 3 }], 'wang_lam')).toEqual([
    { item: 'yeu_dan', qty: 3 },
  ]);
  expect(schoolBossDrops([other], 'wang_lam', () => 0)).toEqual([other]);
});
it('rolls school independently for every piece with about 55/45 distribution for every school', () => {
  for (const hero of HEROES) {
    const drops = schoolBossDrops([{ item: 'armor_purple', qty: 20000 }], hero.id, seeded(777));
    const own = drops.filter((d) => ITEMS[d.item].hero === hero.id).length / drops.length;
    expect(own).toBeGreaterThan(0.535);
    expect(own).toBeLessThan(0.565);
    expect(new Set(drops.map((d) => ITEMS[d.item].hero)).size).toBe(8);
  }
});
