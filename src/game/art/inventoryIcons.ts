import { ITEMS } from '../../data';
import layout from '../../data/uiIconLayout.json';
import icons from '../../data/uiIconAssets.json';
import { equipmentBaseId } from '../systems/equipment';

const ICONS: Record<string, number> = {
  hoi_xuan_dan: 6,
  tu_linh_dan: 7,
  pha_canh_dan: 8,
  kiem_pho: 9,
  thanh_linh_thao: 10,
  linh_chi: 11,
  ngung_lo: 12,
  yeu_dan: 13,
  huyen_thiet: 14,
  tinh_luyen_thach: 15,
  linh_thach: 16,
  linh_khi: 17,
  cong_thuc_ngoc: 19,
  cong_thuc_pha_canh: 20,
  phap_bao_ngoc: 21,
  tien_phap_bao: 21,
  thuc_an_linh_thu: 22,
  thach_linh_an: 23,
};
const SLOTS: Record<string, number> = {
  weapon: 0,
  armor: 1,
  helmet: 2,
  boots: 3,
  ring: 4,
  amulet: 5,
};
// Source bounds follow the painted silhouettes rather than an approximate grid.
// This keeps a neighbouring sword tip / robe hem out of the next inventory cell.
const REGIONS = layout.inventory;
export function inventoryIconIndex(id: string): number | undefined {
  id = equipmentBaseId(id);
  return (
    ICONS[id] ?? (id.startsWith('hat_') ? 18 : ITEMS[id]?.slot ? SLOTS[ITEMS[id].slot!] : undefined)
  );
}
export function inventoryIconUrl(id: string) {
  const index = inventoryIconIndex(id);
  return index === undefined ? undefined : (icons as Record<string, string>)[`item:${index}`];
}
/** Static UI pages can crop the atlas without booting the game renderer. */
export function inventoryIconRegion(id: string) {
  const index = inventoryIconIndex(id);
  return index === undefined ? undefined : REGIONS[index];
}
