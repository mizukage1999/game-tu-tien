import type { LootEntry, MonsterDef } from './index';

/** Both furnaces pay the same price for one breakthrough pill. */
export const BREAKTHROUGH_PILL_RECIPE = {
  linh_chi: 6,
  yeu_dan: 4,
  ngung_lo: 4,
  linh_khi: 120,
} as const;

/** One material roll per kill, shared by offline and online monster rewards. */
export function cultivationLoot(
  monster: MonsterDef,
  eligible: boolean,
  elite: boolean,
): LootEntry[] {
  const loot = monster.loot
    .filter((entry) => entry.item !== 'yeu_dan')
    .map((entry) =>
      entry.item === 'linh_chi' ? { ...entry, chance: Math.min(entry.chance, 0.08) } : entry,
    );
  if (!eligible) return loot;
  const tier = Math.min(4, Math.floor(monster.level / 20));
  loot.push({
    item: 'yeu_dan',
    qty: monster.boss ? (monster.level >= 90 ? [2, 4] : [1, 3]) : [1, 1],
    chance: monster.boss ? 0.5 + tier * 0.1 : elite ? 0.25 + tier * 0.025 : 0.1 + tier * 0.02,
  });
  return loot;
}
