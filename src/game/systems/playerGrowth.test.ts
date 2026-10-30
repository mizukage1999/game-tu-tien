import { expect, it } from 'vitest';
import { newPlayer } from '../../store/gameStore';
import { powerGrowth } from './powerGrowth';
import { adventureGoal } from './adventureGoal';
import { adventure } from './adventure';
import { breakthroughPillCount, expToNext, realmFor } from './progression';

it('reports actual level/gear/skill gains without reacting to health ticks or another account', () => {
  const p = { ...newPlayer({ sex: 'male' }), level: 7 };
  expect(powerGrowth(p, { ...p, hp: p.hp + 10, mp: p.mp - 10, exp: 100 })).toBeNull();
  expect(powerGrowth(p, { ...p, name: 'AnotherHero', level: 99 })).toBeNull();
  const grown = powerGrowth(p, { ...p, level: 8 })!;
  expect(grown.delta).toBeGreaterThan(0);
  expect(grown.details).toContain('Công +6');
  const equipped = { ...p, equipment: { weapon: 'weapon_white' } };
  expect(powerGrowth(p, equipped)?.delta).toBeGreaterThan(0);
  expect(powerGrowth(equipped, p)).toBeNull();
  expect(powerGrowth(p, { ...p, skills: { hoa_ma_chi: 2 } })).toMatchObject({
    menu: 'skills',
    delta: 0,
  });
});
it('recognizes a real realm breakthrough and the skills newly opened by level', () => {
  const p = { ...newPlayer({ sex: 'female' }), heroId: 'hong_lien' as const, level: 7 };
  expect(powerGrowth(p, { ...p, level: 8 })?.unlocked).toContain('hong_lien_4');
  expect(powerGrowth({ ...p, level: 10 }, { ...p, level: 11, realmIndex: 1 })).toMatchObject({
    title: `Đột phá ${realmFor(1).name}`,
    menu: 'cultivate',
  });
});
it('sends a player without enhancement stones to earn them instead of a dead-end upgrade screen', () => {
  const p = { ...newPlayer(), equipment: { weapon: 'weapon_white' }, inventory: {} };
  expect(adventureGoal(p, {}, 'dai_thua_vien')).toMatchObject({
    id: 'enhance-stone',
    destination: { menu: 'dungeon' },
  });
  expect(
    adventureGoal({ ...p, inventory: { tinh_luyen_thach: 1 } }, {}, 'dai_thua_vien'),
  ).toMatchObject({ id: 'enhance', destination: { menu: 'character' } });
});
it('checks the real doubled pill requirement, then energy, stones, and the sect before advising breakthrough', () => {
  const realm = 3,
    r = realmFor(realm),
    p = {
      ...newPlayer(),
      realmIndex: realm,
      level: r.maxLevel,
      exp: expToNext(r.maxLevel),
      linhKhi: 0,
      inventory: { pha_canh_dan: 1, linh_thach: 0 },
    };
  expect(adventureGoal(p, {}, 'rung_linh_thu')).toMatchObject({
    id: 'pills',
    progress: { value: 1, max: breakthroughPillCount(realm) },
  });
  p.inventory.pha_canh_dan = breakthroughPillCount(realm);
  expect(adventureGoal(p, {}, 'rung_linh_thu').id).toBe('energy');
  p.linhKhi = r.breakthrough!.linhKhi;
  expect(adventureGoal(p, {}, 'rung_linh_thu').id).toBe('stones');
  p.inventory.linh_thach = r.breakthrough!.linhThach;
  expect(adventureGoal(p, {}, 'rung_linh_thu')).toMatchObject({
    id: 'breakthrough',
    destination: { travel: adventure(p).boundSect },
  });
  expect(adventureGoal(p, {}, 'dai_thua_vien')).toMatchObject({
    destination: { menu: 'cultivate' },
  });
});
