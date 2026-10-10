import { FIELD_BANDS, type FieldBand } from '../systems/scale';
import { MapBuilder, type MapDef } from './MapBuilder';

type Spawn = { type: string; x: number; y: number };
const spawns = (type: string, pts: [number, number][]): Spawn[] => pts.map(([x, y]) => ({ type, x, y }));

function daiThuaVien(): MapDef {
  const b = new MapBuilder(48, 36, 'grass', 7);
  b.scatter('flower', 'grass', 0.12);
  b.border('wall', [
    [47, 16],
    [47, 17],
    [47, 18],
  ]);
  b.fill(8, 11, 32, 16, 'stone');
  b.fill(22, 1, 4, 34, 'path');
  b.fill(1, 16, 47, 3, 'path');
  b.fill(15, 2, 18, 8, 'stone');
  b.fill(18, 3, 12, 6, 'platform');
  b.ellipse(7, 29, 5, 3.5, 'water');
  b.ellipse(41, 6, 4.5, 3, 'water');

  const monsters = spawns('linh_thu', [
    [12, 21],
    [15, 24],
    [32, 22],
    [35, 24],
    [11, 13],
    [36, 13],
    [14, 31],
    [33, 31],
    [30, 29],
  ]);
  const npcs = [
    { id: 'truong_lao', x: 24, y: 10 },
    { id: 'thuong_nhan', x: 11, y: 19 },
    { id: 'su_huynh', x: 36, y: 19 },
  ];
  b.reserve([...monsters, ...npcs]);

  b.place('circle', 24, 6, { block: [] });
  for (const y of [12, 21, 25, 30]) {
    b.place('lantern', 21, y, { glow: 'warm' });
    b.place('lantern', 26, y, { glow: 'warm' });
  }
  for (const x of [9, 13, 17, 30, 34, 38]) {
    b.place('pillar', x, 11);
    b.place('pillar', x, 26);
  }
  b.place('lantern', 16, 3, { glow: 'warm' });
  b.place('lantern', 31, 3, { glow: 'warm' });
  b.place('burner', 18, 21);
  b.place('burner', 29, 21);
  b.place('rock', 12, 29);
  b.place('rock', 36, 5);
  b.place('rock', 3, 25);

  const clear: [number, number, number, number][] = [
    [7, 10, 34, 18],
    [21, 0, 6, 36],
    [0, 15, 48, 5],
    [14, 1, 20, 10],
  ];
  b.sprinkle(['tree_cherry', 'tree_cherry_b'], 26, ['grass', 'flower'], clear);
  b.sprinkle(['bush'], 12, ['grass', 'flower'], clear, false);

  return b.build({
    id: 'dai_thua_vien',
    name: 'Đại Thừa Viện',
    monsters,
    npcs,
    zones: [{ id: 'linh_dai', name: 'Linh Đài', rect: [18, 3, 12, 6], rate: 3 }],
    portals: [{ rect: [47, 16, 1, 3], to: 'linh_thu_lam', spawn: [3, 15], label: 'Khu săn', levelBand: true }],
    playerSpawn: [24, 20],
    ambient: 'petals',
  });
}

function linhThuLam(): MapDef {
  const b = new MapBuilder(50, 36, 'darkgrass', 13);
  b.scatter('grass', 'darkgrass', 0.18);
  b.scatter('flower', 'grass', 0.15);
  b.fill(0, 16, 30, 3, 'dirt');
  b.fill(28, 9, 3, 24, 'dirt');
  b.fill(28, 9, 14, 3, 'dirt');
  b.fill(30, 30, 16, 2, 'dirt');
  b.ellipse(40, 6.5, 7.5, 4.5, 'platform');
  b.ellipse(40, 6.5, 3.5, 2, 'water');

  const monsters = [
    ...spawns('linh_thu', [
      [8, 12],
      [10, 22],
      [16, 10],
      [17, 24],
    ]),
    ...spawns('hoa_ho', [
      [22, 6],
      [36, 20],
      [42, 26],
      [20, 29],
      [44, 16],
      [36, 31],
      [12, 30],
    ]),
  ];
  const npcs = [{ id: 'an_si', x: 34, y: 8 }];
  b.reserve([...monsters, ...npcs, { x: 3, y: 17 }]);

  b.place('circle', 40, 6, { block: [] });
  // dense forest edge, with a gap for the west gate
  for (let x = 0; x < b.width; x++) {
    b.place('tree_pine', x, 0);
    b.place('tree_pine_b', x, b.height - 1);
  }
  for (let y = 1; y < b.height - 1; y++) {
    if (y < 16 || y > 18) b.place('tree_pine', 0, y);
    b.place('tree_pine_b', b.width - 1, y);
  }
  b.place('lantern', 2, 15, { glow: 'warm' });
  b.place('lantern', 2, 19, { glow: 'warm' });
  b.place('rock', 37, 11);
  b.place('rock', 46, 3);

  const clear: [number, number, number, number][] = [
    [0, 15, 31, 5],
    [27, 8, 5, 26],
    [27, 8, 16, 5],
    [31, 1, 18, 12],
    [29, 29, 18, 4],
  ];
  b.sprinkle(['tree_pine', 'tree_pine_b'], 48, ['darkgrass', 'grass', 'flower'], clear);
  b.sprinkle(['rock'], 10, ['darkgrass', 'grass'], clear);
  b.sprinkle(['bush'], 16, ['darkgrass', 'grass', 'flower'], clear, false);

  return b.build({
    id: 'linh_thu_lam',
    name: 'Linh Thú Lâm',
    monsters,
    npcs,
    level: { min: 1, max: 10 },
    zones: [{ id: 'linh_tuyen', name: 'Linh Tuyền', rect: [33, 3, 15, 8], rate: 5 }],
    portals: [{ rect: [0, 16, 1, 3], to: 'dai_thua_vien', spawn: [45, 17], label: 'Đại Thừa Viện' }],
    playerSpawn: [3, 17],
    ambient: 'fireflies',
  });
}

const ARENA_SPAWNS: [number, number][] = [
  [8, 8],
  [21, 8],
  [5, 13],
  [24, 13],
  [9, 17],
  [20, 17],
  [14, 6],
  [15, 15],
];

function pbBangTuyet(): MapDef {
  const b = new MapBuilder(30, 24, 'stone', 21);
  b.border('wall');
  b.ellipse(15, 11, 9, 6.5, 'platform');
  b.ellipse(3.5, 3.5, 2.5, 2, 'water');
  b.ellipse(26.5, 3.5, 2.5, 2, 'water');
  b.ellipse(3.5, 20, 2.5, 1.8, 'water');
  b.ellipse(26.5, 20, 2.5, 1.8, 'water');
  b.fill(13, 18, 4, 5, 'path');
  b.reserve([...ARENA_SPAWNS.map(([x, y]) => ({ x, y })), { x: 15, y: 20 }, { x: 15, y: 9 }]);
  b.place('circle', 15, 11, { block: [] });
  for (const [x, y] of [
    [6, 5],
    [24, 5],
    [6, 18],
    [24, 18],
  ] as [number, number][]) {
    b.place('pillar', x, y);
  }
  for (const [x, y] of [
    [12, 20],
    [18, 20],
    [2, 11],
    [27, 11],
  ] as [number, number][]) {
    b.place('lantern', x, y, { glow: 'cold' });
  }
  b.sprinkle(['rock'], 8, ['stone'], [[4, 4, 22, 16], [12, 17, 6, 7]]);
  return b.build({
    id: 'pb_bang_tuyet',
    name: 'Băng Tuyết Động',
    monsters: [],
    npcs: [],
    zones: [],
    portals: [],
    playerSpawn: [15, 20],
    ambient: 'snow',
    arena: { dungeon: 'bang_tuyet_dong', spawns: ARENA_SPAWNS, boss: [15, 9], exit: [14, 21, 2, 1] },
  });
}

function pbHoaDiem(): MapDef {
  const b = new MapBuilder(30, 24, 'dirt', 33);
  b.border('wall');
  b.ellipse(15, 11, 9, 6.5, 'stone');
  b.fill(13, 18, 4, 5, 'stone');
  b.reserve([...ARENA_SPAWNS.map(([x, y]) => ({ x, y })), { x: 15, y: 20 }, { x: 15, y: 9 }]);
  b.place('circle', 15, 11, { block: [] });
  for (const [x, y] of [
    [6, 5],
    [24, 5],
    [6, 18],
    [24, 18],
  ] as [number, number][]) {
    b.place('burner', x, y);
  }
  for (const [x, y] of [
    [12, 20],
    [18, 20],
    [2, 11],
    [27, 11],
  ] as [number, number][]) {
    b.place('lantern', x, y, { glow: 'warm' });
  }
  b.sprinkle(['rock'], 14, ['dirt'], [[4, 4, 22, 16], [12, 17, 6, 7]]);
  return b.build({
    id: 'pb_hoa_diem',
    name: 'Hỏa Diễm Cốc',
    monsters: [],
    npcs: [],
    zones: [],
    portals: [],
    playerSpawn: [15, 20],
    ambient: 'embers',
    arena: { dungeon: 'hoa_diem_coc', spawns: ARENA_SPAWNS, boss: [15, 9], exit: [14, 21, 2, 1] },
  });
}

function fieldMap(band: FieldBand): MapDef {
  const b = new MapBuilder(42, 30, band.terrain, band.minLevel);
  b.border('wall', [
    [0, 14],
    [0, 15],
    [0, 16],
  ]);
  b.fill(1, 14, 18, 3, 'path');
  b.ellipse(28, 14, 8, 5.5, band.terrain === 'stone' ? 'platform' : 'grass');
  const monsters = [
    ...spawns(band.mob, [
      [12, 8],
      [16, 22],
      [22, 9],
      [24, 21],
      [31, 8],
      [34, 22],
    ]),
    ...spawns(band.elite, [
      [20, 14],
      [28, 14],
      [33, 15],
    ]),
  ];
  b.reserve([...monsters, { x: 3, y: 15 }]);
  b.place('lantern', 2, 13, { glow: band.glow });
  b.place('lantern', 2, 17, { glow: band.glow });
  b.sprinkle(band.trees, 28, [band.terrain, 'grass', 'path'], [
    [0, 12, 20, 7],
    [20, 8, 16, 12],
  ]);
  return b.build({
    id: band.id,
    name: `${band.name} (Lv ${band.minLevel}-${band.maxLevel})`,
    level: { min: band.minLevel, max: band.maxLevel },
    monsters,
    npcs: [],
    zones: [],
    portals: [{ rect: [0, 14, 1, 3], to: 'dai_thua_vien', spawn: [45, 17], label: 'Đại Thừa Viện' }],
    playerSpawn: [3, 15],
    ambient: band.ambient,
  });
}

const cache = new Map<string, MapDef>();
const builders: Record<string, () => MapDef> = {
  dai_thua_vien: daiThuaVien,
  linh_thu_lam: linhThuLam,
  pb_bang_tuyet: pbBangTuyet,
  pb_hoa_diem: pbHoaDiem,
};

for (const band of FIELD_BANDS) {
  if (band.generated) builders[band.id] = () => fieldMap(band);
}

export function getMap(id: string): MapDef {
  let m = cache.get(id);
  if (!m) {
    m = (builders[id] ?? daiThuaVien)();
    cache.set(id, m);
  }
  return m;
}

export const MAP_IDS = Object.keys(builders);
