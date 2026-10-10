import { EQUIP_SLOTS, equipmentId, type LootEntry, type RarityId } from '../../data';
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

/** `gear:white` becomes a random slot of that rarity. Other ids pass through. */
export function materializeDrop(item: string, rng: Rng = Math.random): string {
  if (!item.startsWith('gear:')) return item;
  const slot = EQUIP_SLOTS[Math.floor(rng() * EQUIP_SLOTS.length)] ?? EQUIP_SLOTS[0];
  return equipmentId(slot.id, item.slice(5) as RarityId);
}

export function rollDungeonGear(table: LootEntry[], rng: Rng = Math.random): LootRoll[] {
  return rollLoot(table, rng).map((d) => ({ item: materializeDrop(d.item, rng), qty: d.qty }));
}

export const LOOT_LIFETIME_MS = 60000;
export const PICKUP_RADIUS = 46;
export const MAGNET_RADIUS = 90;
