import type { LootEntry } from '../../data';
import type { Rng } from '../types';

export interface LootRoll {
  item: string;
  qty: number;
}

export function rollLoot(table: LootEntry[], rng: Rng = Math.random): LootRoll[] {
  const out: LootRoll[] = [];
  for (const entry of table) {
    if (rng() >= entry.chance) continue;
    const [min, max] = entry.qty;
    const qty = min + Math.floor(rng() * (max - min + 1));
    if (qty > 0) out.push({ item: entry.item, qty });
  }
  return out;
}

export const LOOT_LIFETIME_MS = 60000;
export const PICKUP_RADIUS = 46;
export const MAGNET_RADIUS = 90;
