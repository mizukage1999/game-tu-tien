import { NEW_MAPS } from './world';
import { FIELD_BANDS } from '../game/systems/scale';

export interface AtlasPlace { id: string; name: string; group: string; desc: string; x: number; y: number; icon: string; primary?: boolean }
const CORE: Record<string, [number, number, string]> = {
  vuong_gia_thon: [23, 55, '⌂'], ngoai_mon: [46, 77, '◇'], dai_thua_vien: [53, 53, '⌂'],
  linh_son_tong: [48, 24, '♜'], dinh_ta: [25, 36, '⌂'], rung_linh_thu: [21, 77, '♧'],
  thac_ngoc: [70, 35, '≈'], bi_canh_thach_linh: [84, 17, '✦'],
};
const FIELDS: [number, number][] = [[11, 64], [36, 46], [78, 75], [17, 89], [89, 55], [70, 16], [16, 18], [90, 38], [64, 70], [91, 88]];
export const ATLAS_PLACES: AtlasPlace[] = [
  ...NEW_MAPS.map(m => ({ id: m.id, name: m.name, group: m.group, desc: m.desc, x: CORE[m.id][0], y: CORE[m.id][1], icon: CORE[m.id][2], primary: true })),
  { id: 'dai_thua_vien', name: 'Đại Thừa Viện', group: 'Sơn môn', desc: 'Sân viện đệ tử, dược viên, thương nhân và Linh Đài.', x: 53, y: 53, icon: '⌂', primary: true },
  ...FIELD_BANDS.map((b, i) => ({ id: b.id, name: b.name, group: 'Sơn dã', desc: `Yêu thú đề nghị Lv.${b.minLevel}–${b.maxLevel}. Tự do ra vào và trở lại vùng thấp.`, x: FIELDS[i][0], y: FIELDS[i][1], icon: '♧' })),
  { id: 'sect_archive', name: 'Tàng Kinh Các', group: 'Tông môn', desc: 'Truyền thừa nội môn · yêu cầu 150 danh vọng.', x: 41, y: 13, icon: '♜' },
  { id: 'sect_sacred', name: 'Linh Địa Hậu Sơn', group: 'Tông môn', desc: 'Linh địa tông môn · yêu cầu 350 danh vọng.', x: 58, y: 11, icon: '♜' },
];
