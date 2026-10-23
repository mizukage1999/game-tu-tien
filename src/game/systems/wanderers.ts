import type { MapDef } from '../maps/MapBuilder';
import { seeded } from '../art/canvas';
export const SETTLEMENTS = new Set([
  'vuong_gia_thon',
  'ngoai_mon',
  'dai_thua_vien',
  'linh_son_tong',
  'dinh_ta',
]);
export function allowsWanderers(map: Pick<MapDef, 'id' | 'monsters' | 'arena' | 'private'>) {
  return !SETTLEMENTS.has(map.id) && !map.arena && !map.private && map.monsters.length > 0;
}
const NAMES = [
  'Tạ Vô Trần',
  'Lâm Thanh Hà',
  'Mạc Bắc Huyền',
  'Diệp Vân Chi',
  'Chu Hoài An',
  'Tống Dạ Hành',
  'Ninh Tử Yên',
  'Hàn Vọng Sơn',
  'Tô Mộc Dao',
  'Phó Trường Phong',
  'Bạch Tùng',
  'Liễu Vân Khê',
];
export function wandererRoster(map: MapDef, seed: number) {
  if (!allowsWanderers(map)) return [];
  const rng = seeded(seed),
    names = [...NAMES],
    count = 2 + Math.floor(rng() * 2);
  return Array.from({ length: count }, () => {
    const name = names.splice(Math.floor(rng() * names.length), 1)[0];
    return {
      name,
      art: Math.floor(rng() * 6),
      cultivation: 1 + Math.floor(rng() * Math.min(100, (map.level?.max ?? 12) + 18)),
    };
  });
}
