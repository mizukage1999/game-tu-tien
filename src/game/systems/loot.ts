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

/** Keep old loot tables compatible while the game now uses a single weapon slot. */
export function materializeDrop(item: string, rng:Rng=Math.random): string {
  if (!item.startsWith('gear:')) return item;
  return equipmentId(EQUIP_SLOTS[Math.floor(rng()*EQUIP_SLOTS.length)]?.id??'weapon', item.slice(5) as RarityId);
}

export function rollDungeonGear(table: LootEntry[], rng: Rng = Math.random): LootRoll[] {
  return rollLoot(table, rng).map((d) => ({ item: materializeDrop(d.item,rng), qty: d.qty }));
}

export function monsterDrops(def: { loot: LootEntry[]; boss?: unknown }, arena: boolean, rng: Rng = Math.random): LootRoll[] {
  const drops = rollDungeonGear(def.loot, rng);
  if (!arena && rng() < 0.25) drops.push({ item: 'huyen_thiet', qty: 1 });
  if (def.boss && rng() < 0.3) drops.push({ item: rng() < 0.5 ? 'cong_thuc_ngoc' : 'cong_thuc_pha_canh', qty: 1 });
  return drops;
}

export const LOOT_LIFETIME_MS = 60000;
export const PICKUP_RADIUS = 46;
export const MAGNET_RADIUS = 90;
