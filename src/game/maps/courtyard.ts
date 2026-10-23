import { MapBuilder, type MapDef } from './MapBuilder';
import { herbNodes } from '../systems/immortal';

/** The central avenue stays open; architecture frames activities instead of filling the walking lanes. */
export function daiThuaVien(): MapDef {
  const b = new MapBuilder(48, 36, 'grass', 7);
  b.scatter('flower', 'grass', .07);
  b.border('wall', [[47, 16], [47, 17], [47, 18]]);

  // North: ceremonial terrace. Middle: broad paved court and two NPC alcoves.
  b.fill(15, 2, 18, 9, 'stone');
  b.fill(18, 3, 12, 6, 'platform');
  b.fill(13, 12, 23, 15, 'stone');
  b.fill(7, 16, 8, 8, 'stone');
  b.fill(34, 16, 8, 8, 'stone');
  b.fill(22, 9, 4, 26, 'path');
  b.fill(1, 16, 47, 3, 'path');
  b.fill(9, 27, 12, 7, 'dirt');
  b.fill(32, 27, 10, 7, 'dirt');
  b.fill(9, 26, 33, 2, 'path');

  // Garden pockets and ornamental ponds stay outside the main navigation axes.
  b.ellipse(6, 9, 3.5, 3, 'water');
  b.ellipse(41, 7, 4, 3, 'water');
  b.fill(0, 16, 3, 3, 'path');
  b.fill(35, 0, 3, 17, 'path');
  b.fill(17, 21, 5, 5, 'flower');
  b.fill(27, 20, 5, 6, 'flower');

  const npcs = [
    { id: 'truong_lao', x: 24, y: 10 },
    { id: 'thuong_nhan', x: 11, y: 19 },
    { id: 'su_huynh', x: 36, y: 19 },
    { id: 'thanh_nhi', x: 17, y: 19 },
    { id: 'ho_ve', x: 18, y: 12 },
    { id: 'ho_ve', x: 30, y: 12 },
  ];
  // Training beasts live beyond the courtyard; talking, gathering and meditation are safe.
  const monsters = [[10, 28], [13, 29], [16, 29], [19, 30], [12, 32], [17, 33], [34, 28], [37, 31], [40, 28]]
    .map(([x, y]) => ({ type: 'linh_thu', x, y }));
  b.reserve([...npcs, ...monsters, ...herbNodes('dai_thua_vien'), { x: 24, y: 20 }, { x: 45, y: 17 }]);

  b.place('circle', 24, 6, { block: [] });
  b.place('sect-hall', 24, 2, { block: [[-2, -1], [-1, -1], [0, -1], [1, -1], [2, -1]], fade: true });
  b.place('sect-gate', 24, 33, { block: [[-3, 0], [3, 0]], fade: true });
  // Red and gold colonnade: far corners, terrace entry, then the southern arrival gate.
  for (const [x, y, banner] of [
    [16, 4, 0], [31, 4, 0], [16, 10, 1], [32, 10, 1],
    [13, 14, 0], [35, 14, 0], [14, 26, 1], [34, 26, 1],
    [21, 32, 1], [27, 32, 1],
  ]) b.place(banner ? 'court-column-banner' : 'court-column', x, y, { fade: true });

  // Each rail has a real three-cell footprint. The central stairs and side entrances have gaps.
  for (const x of [18, 29]) b.place('court-railing', x, 10, { block: [[-1, 0], [0, 0], [1, 0]] });
  for (const [x, y] of [[15, 5], [33, 5], [8, 20], [41, 20]]) {
    b.place('court-railing', x, y, { flipX: true, block: [[0, -1], [0, 0], [0, 1]] });
  }
  for (const [x, y] of [[20, 10], [27, 10], [8, 18], [41, 18]]) b.place('court-stone-post', x, y);
  for (const y of [12, 24, 29]) {
    b.place('court-lantern', 21, y, { glow: 'warm' });
    b.place('court-lantern', 26, y, { glow: 'warm' });
  }
  for (const [x, y] of [[9, 16], [39, 16], [44, 15], [44, 19]]) b.place('court-lantern', x, y, { glow: 'warm' });
  b.place('court-notice', 15, 19, { fade: true });
  b.place('court-banner', 8, 23, { fade: true });
  b.place('court-banner', 40, 23, { fade: true, flipX: true });
  b.place('court-burner', 20, 7);
  b.place('court-burner', 28, 7);
  for (const [x, y] of [[18, 23], [20, 25], [29, 24], [30, 21], [10, 21], [38, 21]]) b.place('court-planter', x, y);

  for (const [x, y, key] of [
    [11, 7, 'tree_cherry'], [35, 6, 'tree_cherry_b'],
    [5, 21, 'tree_cherry_b'], [44, 24, 'tree_cherry'],
    [8, 31, 'tree_cherry'], [43, 32, 'tree_cherry_b'],
  ] as [number, number, string][]) b.place(key.startsWith('tree_cherry') ? 'sect-cherry' : key, x, y, { fade: true });
  b.sprinkle(['sect-cherry'], 14, ['grass', 'flower'], [[7, 1, 35, 33], [0, 14, 48, 7]]);
  b.sprinkle(['bush'], 10, ['grass'], [[7, 1, 35, 33], [0, 14, 48, 7]], false);

  return b.build({
    id: 'dai_thua_vien', name: 'Đại Thừa Viện', npcs, monsters, requiresAdmission: true,
    playerSpawn: [24, 20], ambient: 'petals',
    zones: [{ id: 'linh_dai', name: 'Linh Đài', rect: [18, 3, 12, 6], rate: 1 }],
    portals: [{ rect: [47, 16, 1, 3], to: 'linh_thu_lam', spawn: [3, 15], label: 'Linh Thú Lâm', levelBand: true }, { rect: [0, 16, 1, 3], to: 'ngoai_mon', spawn: [37, 15], label: 'Ngoại Môn' }, { rect: [35, 0, 3, 1], to: 'linh_son_tong', spawn: [24, 31], label: 'Linh Sơn Tông' }],
    landmarks: [
      { name: 'CHÍNH ĐIỆN', x: 24, y: 3 },
      { name: 'DƯỢC VIÊN', x: 19, y: 26 },
      { name: 'DIỄN VÕ TRƯỜNG', x: 14, y: 28 },
    ],
  });
}
