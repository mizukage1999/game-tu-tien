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
    portals: [{ rect: [47, 16, 1, 3], to: 'linh_thu_lam', spawn: [3, 17], label: 'Linh Thú Lâm' }],
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
    zones: [{ id: 'linh_tuyen', name: 'Linh Tuyền', rect: [33, 3, 15, 8], rate: 5 }],
    portals: [{ rect: [0, 16, 1, 3], to: 'dai_thua_vien', spawn: [45, 17], label: 'Đại Thừa Viện' }],
    playerSpawn: [3, 17],
    ambient: 'fireflies',
  });
}

const cache = new Map<string, MapDef>();
const builders: Record<string, () => MapDef> = {
  dai_thua_vien: daiThuaVien,
  linh_thu_lam: linhThuLam,
};

export function getMap(id: string): MapDef {
  let m = cache.get(id);
  if (!m) {
    m = (builders[id] ?? daiThuaVien)();
    cache.set(id, m);
  }
  return m;
}

export const MAP_IDS = Object.keys(builders);
