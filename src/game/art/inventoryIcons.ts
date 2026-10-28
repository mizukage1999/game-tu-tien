import { ITEMS } from '../../data';
import { equipmentBaseId } from '../systems/equipment';

const urls = new Map<number, string>();
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
const REGIONS: number[][] = [
  [9, 4, 247, 276],
  [258, 22, 251, 262],
  [515, 3, 251, 277],
  [777, 24, 242, 254],
  [1030, 18, 253, 256],
  [1294, 4, 241, 278],
  [13, 284, 239, 245],
  [259, 292, 251, 239],
  [521, 289, 245, 243],
  [779, 283, 245, 253],
  [1030, 283, 251, 243],
  [1291, 285, 244, 235],
  [8, 534, 246, 235],
  [258, 535, 252, 237],
  [516, 538, 251, 233],
  [774, 536, 251, 237],
  [1028, 535, 253, 238],
  [1288, 522, 247, 251],
  [8, 777, 246, 247],
  [259, 777, 252, 247],
  [516, 777, 251, 247],
  [774, 779, 251, 245],
  [1028, 781, 253, 243],
  [1288, 777, 247, 247],
];
export function inventoryIconIndex(id: string): number | undefined {
  id = equipmentBaseId(id);
  return (
    ICONS[id] ?? (id.startsWith('hat_') ? 18 : ITEMS[id]?.slot ? SLOTS[ITEMS[id].slot!] : undefined)
  );
}
export function registerInventoryIcons(source: HTMLImageElement) {
  for (let index = 0; index < 24; index++) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const [x, y, w, h] = REGIONS[index],
      scale = Math.min(238 / w, 238 / h);
    ctx.drawImage(
      source,
      (x * source.width) / 1536,
      (y * source.height) / 1024,
      (w * source.width) / 1536,
      (h * source.height) / 1024,
      (256 - w * scale) / 2,
      (256 - h * scale) / 2,
      w * scale,
      h * scale,
    );
    urls.set(index, canvas.toDataURL('image/png'));
  }
}
export function inventoryIconUrl(id: string) {
  const index = inventoryIconIndex(id);
  return index === undefined ? undefined : urls.get(index);
}
/** Static UI pages can crop the atlas without booting the game renderer. */
export function inventoryIconRegion(id: string) {
  const index = inventoryIconIndex(id);
  return index === undefined ? undefined : REGIONS[index];
}
