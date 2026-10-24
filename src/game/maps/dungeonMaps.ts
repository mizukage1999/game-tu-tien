import { MapBuilder, type MapDef } from './MapBuilder';

export const DUNGEON_MAPS = [
  'pb_bang_tuyet',
  'pb_hoa_diem',
  'pb_loi_dinh',
  'pb_u_minh',
  'pb_thien_kiep',
];
const NAMES = [
  'Băng Tuyết Lang Cung',
  'Xích Diễm Hổ Cốc',
  'Lôi Đình Cổ Điện',
  'U Minh Lang Địa',
  'Huyền Thiên Kiếp Đài',
];
export function dungeonMap(index: number): MapDef {
  const width = 32 + index * 2,
    height = 26 + (index % 2) * 2,
    cx = Math.floor(width / 2),
    base = (['stone', 'dirt', 'marble', 'darkgrass', 'platform'] as const)[index],
    b = new MapBuilder(width, height, base, 910 + index);
  b.border('wall');
  b.fill(cx - 3, 3, 7, height - 5, index === 3 ? 'cave' : 'path');
  b.ellipse(cx, 7, 8, 5, index === 1 ? 'dirt' : index === 3 ? 'cave' : 'platform');
  b.ellipse(cx, height - 6, 6, 3, index === 3 ? 'darkgrass' : 'marble');
  if (index === 0 || index === 2) {
    b.fill(2, 10, 3, 7, 'water');
    b.fill(width - 5, 10, 3, 7, 'water');
  }
  const spawns: [number, number][] = [
    [7, 12],
    [width - 8, 12],
    [cx - 4, 15],
    [cx + 4, 15],
    [7, height - 7],
    [width - 8, height - 7],
    [cx, 11],
    [cx, height - 9],
  ];
  b.reserve([...spawns.map(([x, y]) => ({ x, y })), { x: cx, y: 7 }, { x: cx, y: height - 3 }]);
  for (const [x, y] of [
    [3, 5],
    [width - 4, 5],
    [3, height - 5],
    [width - 4, height - 5],
  ]) {
    b.place(
      index === 3 ? 'world-crystal' : index === 1 ? 'court-burner' : 'court-stone-post',
      x,
      y,
      { glow: index === 1 ? 'warm' : 'cold' },
    );
  }
  for (const x of [6, width - 7])
    b.place(index === 4 ? 'sect-cherry' : index === 3 ? 'world-cave' : 'biome-moss-rock', x, 4, {
      fade: true,
    });
  b.place('circle', cx, 7, { block: [] });
  return b.build({
    id: DUNGEON_MAPS[index],
    name: NAMES[index],
    description: 'Bí cảnh thử luyện · chú ý vùng báo chiêu của thủ lĩnh',
    playerSpawn: [cx, height - 3],
    ambient: index === 1 ? 'embers' : index === 3 ? 'fireflies' : index === 4 ? 'petals' : 'snow',
    monsters: [],
    npcs: [],
    zones: [],
    portals: [],
    landmarks: [{ name: NAMES[index].toLocaleUpperCase('vi'), x: cx, y: 4 }],
    arena: {
      dungeon:
        index === 0
          ? 'bang_tuyet_dong'
          : index === 1
            ? 'hoa_diem_coc'
            : `tier_${10 + index * 20}_thuong`,
      spawns,
      boss: [cx, 7],
      exit: [cx - 1, height - 2, 3, 1],
    },
  });
}
