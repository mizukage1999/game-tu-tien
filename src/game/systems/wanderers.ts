import type { MapDef } from '../maps/MapBuilder';
import { seeded } from '../art/canvas';
import { MONSTERS, REALMS } from '../../data';
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

/** Most travelers are near the map's recommended realm; distant realms remain rare. */
export function wandererRealmWeights(map: Pick<MapDef, 'level' | 'monsters'>) {
  const levels = map.monsters.map((m) => MONSTERS[m.type]?.level ?? 1);
  const midpoint = map.level
    ? (map.level.min + map.level.max) / 2
    : levels.length
      ? levels.reduce((a, b) => a + b, 0) / levels.length
      : 10;
  const center = Math.max(0, Math.min(REALMS.length - 1, (midpoint - 5.5) / 10));
  return REALMS.map((_, i) => Math.exp(-0.5 * ((i - center) / 1.15) ** 2) + 0.008);
}

export function rollWandererLevel(map: Pick<MapDef, 'level' | 'monsters'>, rng: () => number) {
  const weights = wandererRealmWeights(map);
  let roll = rng() * weights.reduce((a, b) => a + b, 0);
  const index = weights.findIndex((w) => (roll -= w) < 0);
  const realm = REALMS[index < 0 ? REALMS.length - 1 : index];
  return (
    realm.minLevel +
    Math.min(
      realm.maxLevel - realm.minLevel,
      Math.floor(rng() * (realm.maxLevel - realm.minLevel + 1)),
    )
  );
}
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
      cultivation: rollWandererLevel(map, rng),
    };
  });
}
