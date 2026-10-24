import { ITEMS, RARITIES } from '../../data';
import type { PlayerSave } from './save';

export const INVENTORY_GROUPS = [
  ['all', '▦', 'Tất cả'],
  ['weapon', '⚔', 'Vũ khí'],
  ['armor', '♜', 'Phòng cụ'],
  ['jewel', '◉', 'Trang sức'],
  ['pill', '丹', 'Đan dược'],
  ['herb', '❀', 'Linh dược'],
  ['material', '◇', 'Nguyên liệu'],
  ['manual', '卷', 'Bí quyển'],
  ['artifact', '☯', 'Pháp bảo'],
  ['other', '✦', 'Khác'],
] as const;
export type InventoryGroup = (typeof INVENTORY_GROUPS)[number][0];
export type InventoryView = 'all' | 'bag' | 'worn';
export type InventorySort = 'rarity' | 'name' | 'quantity';
export interface InventoryEntry {
  id: string;
  bag: number;
  worn: number;
  quantity: number;
}
export function inventoryGroup(id: string): InventoryGroup {
  const def = ITEMS[id];
  if (id === 'phap_bao_ngoc' || id === 'tien_phap_bao') return 'artifact';
  if (def?.slot === 'weapon') return 'weapon';
  if (def?.slot && ['armor', 'helmet', 'boots'].includes(def.slot)) return 'armor';
  if (def?.slot) return 'jewel';
  if (def?.kind === 'consumable' || id === 'pha_canh_dan' || id === 'thuc_an_linh_thu')
    return 'pill';
  if (['thanh_linh_thao', 'linh_chi', 'ngung_lo'].includes(id) || id.startsWith('hat_'))
    return 'herb';
  if (id === 'kiem_pho' || id.startsWith('cong_thuc_')) return 'manual';
  return def?.kind === 'material' ? 'material' : 'other';
}
export function inventoryEntries(p: PlayerSave): InventoryEntry[] {
  const counts = new Map<string, InventoryEntry>();
  for (const [id, qty] of Object.entries(p.inventory))
    if (qty > 0) counts.set(id, { id, bag: qty, worn: 0, quantity: qty });
  for (const id of Object.values(p.equipment))
    if (id) {
      const entry = counts.get(id) ?? { id, bag: 0, worn: 0, quantity: 0 };
      entry.worn++;
      entry.quantity++;
      counts.set(id, entry);
    }
  return [...counts.values()];
}
export function filteredInventory(
  entries: InventoryEntry[],
  opts: { group: InventoryGroup; rarity: string; view: InventoryView; sort: InventorySort },
): InventoryEntry[] {
  return entries
    .filter(
      (e) =>
        (opts.group === 'all' || inventoryGroup(e.id) === opts.group) &&
        (opts.rarity === 'all' || ITEMS[e.id]?.rarity === opts.rarity) &&
        (opts.view === 'all' || (opts.view === 'bag' ? e.bag > 0 : e.worn > 0)),
    )
    .sort((a, b) => {
      const name = () => (ITEMS[a.id]?.name ?? a.id).localeCompare(ITEMS[b.id]?.name ?? b.id, 'vi');
      if (opts.sort === 'quantity') return b.quantity - a.quantity || name();
      if (opts.sort === 'rarity')
        return (
          RARITIES.findIndex((r) => r.id === ITEMS[b.id]?.rarity) -
            RARITIES.findIndex((r) => r.id === ITEMS[a.id]?.rarity) || name()
        );
      return name();
    });
}
