import type { LootEntry, MonsterDef } from './index';

/** Both furnaces pay the same price for one breakthrough pill. */
export const BREAKTHROUGH_PILL_RECIPE = {
  linh_chi: 6,
  yeu_dan: 4,
  ngung_lo: 4,
  linh_khi: 120,
} as const;

/** Quantity depends on the source's difficulty, never the recipient's level. */
export function cultivationYield(level: number): number {
  return 2 ** Math.min(7, Math.max(0, Math.floor((level - 1) / 10) - 2));
}

/** Guaranteed materials alongside rare drops, proportional to the matching realm's recipe. */
export function cultivationClearMaterials(level: number, reward: number): Record<string, number> {
  if (level < 20) return {};
  const pills = 2 ** Math.min(10, Math.max(0, Math.floor((level - 1) / 10)));
  const batches = Math.max(1, Math.floor(pills * Math.min(0.12, reward * 0.045)));
  return { linh_chi: batches * 6, yeu_dan: batches * 4, ngung_lo: batches * 4 };
}

/** One material roll per kill, shared by offline and online monster rewards. */
export function cultivationLoot(
  monster: MonsterDef,
  eligible: boolean,
  elite: boolean,
): LootEntry[] {
  const amount = cultivationYield(monster.level);
  const loot = monster.loot
    .filter((entry) => entry.item !== 'yeu_dan')
    .map((entry) =>
      entry.item === 'linh_chi'
        ? { ...entry, chance: Math.min(entry.chance, 0.08), qty: entry.qty.map(n => n * amount) as [number, number] }
        : entry,
    );
  if (!eligible) return loot;
  const tier = Math.min(4, Math.floor(monster.level / 20));
  loot.push({
    item: 'yeu_dan',
    qty: monster.boss ? [amount * 2, amount * 4] : [amount, amount],
    chance: monster.boss ? 0.5 + tier * 0.1 : elite ? 0.25 + tier * 0.025 : 0.1 + tier * 0.02,
  });
  return loot;
}
