import { MapBuilder, type MapDef, type WorldPoint } from './MapBuilder';
import { herbNodes } from '../systems/immortal';

const block = (w: number, h: number): [number, number][] => Array.from({ length: w * h }, (_, i) => [i % w - Math.floor(w / 2), -Math.floor(i / w) - 1]);
const edge = (b: MapBuilder, x: number, y: number, w: number, h: number, ground: 'path' | 'marble' = 'path') => b.fill(x, y, w, h, ground);
function trees(b: MapBuilder, points: [number, number][], key = 'world-tree') { for (const [x, y] of points) b.place(key, x, y, { fade: true }); }
function lamps(b: MapBuilder, points: [number, number][], cold = false) { for (const [x, y] of points) b.place(cold ? 'court-stone-post' : 'court-lantern', x, y, { glow: cold ? 'cold' : 'warm' }); }
function building(b: MapBuilder, key: string, x: number, y: number, w = 5, h = 3) { b.place(key, x, y, { block: block(w, h), fade: true }); }
const point = (id: string, name: string, x: number, y: number, text: string, repeatable = false): WorldPoint => ({ id, name, x, y, text, repeatable });
function finish(b: MapBuilder, meta: Omit<MapDef, 'width' | 'height' | 'terrain' | 'blocked' | 'decor'>) {
  b.reserve([...meta.npcs, ...meta.monsters, ...(meta.points ?? []), ...herbNodes(meta.id), { x: meta.playerSpawn[0], y: meta.playerSpawn[1] }]);
  for (const portal of meta.portals) {
    const [x, y, w, h] = portal.rect;
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) b.reserve([{ x: x + dx, y: y + dy }]);
  }
  const forest = meta.id === 'rung_linh_thu', cave = meta.id === 'bi_canh_thach_linh';
  const tree = ['linh_son_tong', 'dinh_ta', 'ngoai_mon'].includes(meta.id) ? 'sect-cherry' : 'world-tree';
  if (cave) b.sprinkle(['world-crystal'], 10, ['cave'], [[6, 3, 26, 24]]);
  else {
    b.sprinkle([tree], forest ? 22 : 9, ['grass', 'darkgrass', 'flower'], []);
    b.sprinkle(['world-rock'], forest ? 7 : 3, ['grass', 'darkgrass'], []);
    b.sprinkle(['bush'], forest ? 18 : 10, ['grass', 'darkgrass', 'flower'], [], false);
  }
  return b.build(meta);
}

export function vuongGiaThon(): MapDef {
  const b = new MapBuilder(42, 32, 'grass', 101);
  b.scatter('flower', 'grass', .08).border('wall');
  b.fill(29, 1, 3, 30, 'water');
  b.fill(2, 13, 40, 4, 'dirt');
  b.fill(8, 7, 4, 22, 'dirt'); b.fill(8, 21, 20, 3, 'dirt');
  b.fill(18, 7, 4, 21, 'dirt'); b.fill(33, 14, 4, 13, 'dirt');
  b.fill(28, 13, 5, 4, 'bridge'); b.fill(28, 24, 5, 2, 'bridge');
  b.fill(3, 2, 11, 5, 'farmland'); b.fill(19, 3, 7, 4, 'farmland');
  b.fill(3, 18, 5, 5, 'flower');
  building(b, 'village-house', 10, 8, 5, 4);
  building(b, 'village-house', 23, 9, 5, 3);
  building(b, 'village-house', 9, 24, 5, 3);
  building(b, 'village-house', 36, 11, 5, 3);
  b.place('village-well', 20, 17);
  b.place('village-workbench', 14, 11);
  b.place('village-shrine', 19, 26, { block: block(3, 2) });
  b.place('court-notice', 17, 24, { fade: true });
  b.place('sect-bridge', 30, 15, { block: [] });
  b.place('sect-bridge', 30, 25, { block: [], scale: .7 });
  b.place('village-willow', 36, 23, { fade: true });
  for (const [x, y] of [[5, 5], [11, 5], [22, 5]]) b.place('village-farm', x, y, { block: [] });
  for (const [x, y] of [[4, 8], [17, 9], [26, 7], [16, 26], [26, 26]]) b.place('world-fence', x, y);
  trees(b, [[3, 12], [26, 3], [4, 26], [25, 29], [39, 27], [34, 3], [15, 28]]);
  lamps(b, [[16, 15], [25, 16], [34, 16]]);
  b.place('world-rock', 27, 21); b.place('court-planter', 12, 10);
  return finish(b, {
    id: 'vuong_gia_thon', name: 'Vương Gia Thôn', description: 'Quê nhà Thiết Trụ · Chương mở đầu',
    playerSpawn: [11, 14], ambient: 'petals', monsters: [],
    npcs: [{ id: 'vuong_mau', x: 10, y: 11 }, { id: 'vuong_phu', x: 15, y: 12 }, { id: 'vuong_thuc', x: 23, y: 15 }, { id: 'duoc_ba', x: 6, y: 17 }, { id: 'tien_sinh', x: 9, y: 25 }, { id: 'a_moc', x: 35, y: 21 }],
    zones: [{ id: 'village_river', name: 'Bến Thanh Khê', rect: [33, 20, 5, 5], rate: .5 }],
    portals: [{ rect: [41, 14, 1, 3], to: 'ngoai_mon', spawn: [2, 15], label: 'Đường lên Ngoại Môn', requiresQuest: 'village_6' }],
    points: [
      point('village_well', 'Giếng đầu làng', 20, 18, 'Thiết Trụ kéo gàu nước lên. Mặt nước trong veo phản chiếu bầu trời sớm.', true),
      point('village_workbench', 'Bàn mộc của cha', 14, 12, 'Con đo tấm gỗ, giữ chắc tay rồi hạ đục. Cha gật đầu, không giấu được nụ cười.', true),
      point('village_willow', 'Bóng liễu Thanh Khê', 34, 22, 'Chiếc lá trôi qua cầu gỗ. Có lẽ ở rất xa cũng có một đứa trẻ đang nhìn cùng một dòng sông.'),
      point('village_notice', 'Cáo thị tuyển đồ', 17, 25, 'Linh Sơn Tông mở kỳ khảo hạch tại Ngoại Môn. Người hữu chí có thể đến thử. Thiết Trụ đọc đi đọc lại dòng chữ ấy.'),
    ],
    landmarks: [{ name: 'VƯƠNG GIA THÔN', x: 23, y: 13 }, { name: 'BẾN THANH KHÊ', x: 35, y: 26 }, { name: 'NHÀ THIẾT TRỤ', x: 10, y: 10 }],
  });
}

export function ngoaiMon(): MapDef {
  const b = new MapBuilder(40, 30, 'grass', 102);
  b.scatter('flower', 'grass', .12).border('wall');
  b.fill(9, 6, 23, 17, 'marble');
  edge(b, 0, 14, 40, 3); edge(b, 18, 0, 4, 30);
  building(b, 'sect-pavilion', 9, 11, 3, 2); building(b, 'sect-pavilion', 32, 11, 3, 2);
  b.place('sect-gate', 20, 9, { block: [[-3, 0], [3, 0]], fade: true });
  b.place('court-stone-post', 25, 5);
  for (const [x, y] of [[13, 8], [29, 8], [13, 21], [29, 21]]) b.place('court-column-banner', x, y, { fade: true });
  lamps(b, [[16, 12], [23, 12], [16, 21], [23, 21], [4, 13], [36, 13]]);
  for (const [x, y] of [[10, 16], [31, 16], [15, 25], [26, 25]]) b.place('court-planter', x, y);
  trees(b, [[5, 7], [35, 6], [5, 24], [35, 24], [11, 3], [29, 3]], 'sect-cherry');
  return finish(b, {
    id: 'ngoai_mon', name: 'Ngoại Môn', description: 'Bậc đá đầu tiên của tiên lộ', playerSpawn: [2, 15], ambient: 'petals', monsters: [],
    npcs: [{ id: 'tiep_dan', x: 18, y: 18 }, { id: 'khao_hach', x: 25, y: 9 }], zones: [],
    portals: [
      { rect: [0, 14, 1, 3], to: 'vuong_gia_thon', spawn: [39, 15], label: 'Vương Gia Thôn' },
      { rect: [39, 14, 1, 3], to: 'dai_thua_vien', spawn: [2, 17], label: 'Đại Thừa Viện · Nhập môn', admission: true },
      { rect: [18, 0, 4, 1], to: 'dinh_ta', spawn: [2, 15], label: 'Đình Tạ', admission: true },
    ],
    points: [point('gate_trial', 'Bia khảo hạch', 25, 6, 'Lòng bàn tay chạm vào thạch bia lạnh. Trong một thoáng, Thiết Trụ quên tiếng người xung quanh, chỉ còn nhịp thở bình yên.')],
    landmarks: [{ name: 'SƠN MÔN LINH SƠN', x: 20, y: 12 }, { name: 'ĐÀI KHẢO HẠCH', x: 27, y: 8 }],
  });
}

export function linhSonTong(): MapDef {
  const b = new MapBuilder(46, 34, 'grass', 103);
  b.scatter('flower', 'grass', .09).border('wall');
  b.fill(9, 3, 29, 27, 'marble'); b.fill(17, 4, 14, 7, 'platform');
  edge(b, 22, 10, 4, 24, 'marble'); edge(b, 24, 16, 22, 3, 'marble');
  building(b, 'sect-hall', 24, 8, 9, 5);
  building(b, 'sect-hall', 11, 14, 5, 3); building(b, 'sect-hall', 36, 14, 5, 3);
  b.place('sect-gate', 24, 29, { block: [[-3, 0], [3, 0]], fade: true });
  b.ellipse(11, 24, 4, 3, 'water'); b.ellipse(36, 24, 4, 3, 'water');
  for (const [x, y] of [[17, 12], [30, 12], [17, 25], [30, 25]]) b.place('court-column-banner', x, y, { fade: true });
  for (const x of [12, 35]) b.place('sect-wall', x, 30, { block: [[-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0]] });
  for (const [x, y] of [[14, 19], [33, 19], [14, 28], [33, 28]]) b.place('court-burner', x, y);
  lamps(b, [[21, 14], [27, 14], [21, 23], [27, 23], [41, 15]]);
  trees(b, [[5, 8], [41, 7], [5, 26], [41, 28], [8, 3], [37, 3]], 'sect-cherry');
  return finish(b, {
    id: 'linh_son_tong', name: 'Linh Sơn Tông', description: 'Nội tông · Chính điện truyền thừa', requiresAdmission: true,
    playerSpawn: [24, 31], ambient: 'petals', monsters: [], zones: [],
    npcs: [{ id: 'chap_su', x: 24, y: 15 }],
    portals: [{ rect: [22, 33, 4, 1], to: 'dai_thua_vien', spawn: [36, 3], label: 'Đại Thừa Viện' }, { rect: [45, 16, 1, 3], to: 'dinh_ta', spawn: [31, 2], label: 'Đình Tạ' },{rect:[0,16,1,2],to:'sect_archive',spawn:[22,13],label:'Tàng Kinh Các',reputation:150},{rect:[0,18,1,2],to:'sect_sacred',spawn:[22,13],label:'Linh Địa Hậu Sơn',reputation:350}],
    points: [point('sect_history', 'Bia truyền thừa', 18, 18, 'Bia ghi tên những người từng gìn giữ tông môn. Dưới mỗi cái tên là một đời người, chẳng thể gói trong đôi dòng chữ.')],
    landmarks: [{ name: 'LINH SƠN CHÍNH ĐIỆN', x: 24, y: 12 }, { name: 'HỒ BẠCH LIÊN', x: 36, y: 27 }],
  });
}

export function dinhTa(): MapDef {
  const b = new MapBuilder(40, 32, 'grass', 104);
  b.scatter('flower', 'grass', .13).border('wall');
  b.fill(12, 8, 18, 17, 'water');
  b.fill(7, 5, 27, 3, 'marble'); b.fill(7, 5, 3, 23, 'marble'); b.fill(31, 0, 3, 28, 'marble'); b.fill(7, 26, 27, 3, 'marble');
  edge(b, 0, 14, 40, 3, 'marble'); b.fill(11, 14, 20, 3, 'bridge');
  b.fill(17, 7, 7, 6, 'platform'); b.fill(17, 21, 7, 5, 'platform'); b.fill(18, 16, 4, 16, 'bridge');
  building(b, 'sect-pavilion', 20, 10, 3, 2); building(b, 'sect-pavilion', 20, 23, 3, 2);
  b.place('sect-bridge', 14, 15, { block: [] }); b.place('sect-bridge', 28, 15, { block: [] });
  b.place('court-stone-post', 10, 11);
  for (const [x, y] of [[8, 8], [32, 8], [8, 25], [32, 25]]) b.place('court-planter', x, y);
  for (const [x, y] of [[12, 6], [28, 6], [12, 28], [28, 28]]) b.place('court-railing', x, y, { block: [[-1, 0], [0, 0], [1, 0]] });
  trees(b, [[4, 7], [36, 7], [4, 25], [36, 25], [13, 3], [27, 3]], 'sect-cherry');
  lamps(b, [[6, 13], [34, 13], [16, 28], [24, 28]]);
  return finish(b, {
    id: 'dinh_ta', name: 'Đình Tạ', description: 'Hồ Liên Tâm · Cầu đá và hương sen', requiresAdmission: true,
    playerSpawn: [2, 15], ambient: 'petals', monsters: [],
    npcs: [{ id: 'giu_dinh', x: 9, y: 14 }], zones: [{ id: 'pavilion_lotus', name: 'Hồ Liên Tâm', rect: [17, 21, 7, 5], rate: 2 }],
    portals: [{ rect: [0, 14, 1, 3], to: 'ngoai_mon', spawn: [20, 2], label: 'Ngoại Môn' }, { rect: [31, 0, 3, 1], to: 'linh_son_tong', spawn: [43, 17], label: 'Linh Sơn Tông' }, { rect: [39, 14, 1, 3], to: 'rung_linh_thu', spawn: [2, 17], label: 'Rừng Linh Thú' }, { rect: [18, 31, 4, 1], to: 'thac_ngoc', spawn: [2, 17], label: 'Ngọc Tuyền' }],
    points: [point('pavilion_tablet', 'Thạch thư hồ sen', 10, 12, 'Nét chữ cổ chỉ về rừng phía đông: nơi dòng nước đi qua mạch đá, cổ ấn sẽ tìm được đường trở về.')],
    landmarks: [{ name: 'HỒ LIÊN TÂM', x: 20, y: 18 }],
  });
}

export function rungLinhThu(): MapDef {
  const b = new MapBuilder(44, 34, 'darkgrass', 105);
  b.scatter('grass', 'darkgrass', .3).scatter('flower', 'grass', .16).border('wall');
  b.ellipse(8, 7, 4, 3, 'water'); b.ellipse(35, 27, 4, 3, 'water');
  b.fill(0, 16, 44, 3, 'dirt'); b.fill(20, 0, 3, 34, 'dirt');
  b.fill(8, 10, 28, 3, 'dirt'); b.fill(8, 10, 3, 17, 'dirt'); b.fill(8, 24, 28, 3, 'dirt'); b.fill(33, 10, 3, 17, 'dirt');
  building(b, 'village-house', 9, 15, 4, 2);
  for (const [x, y] of [[5, 13], [14, 8], [30, 7], [39, 12], [15, 29], [29, 30], [38, 22]]) b.place('world-rock', x, y);
  b.place('world-cave', 22, 4, { block: [], glow: 'cold' });
  trees(b, [[4, 6], [16, 5], [28, 4], [39, 5], [4, 24], [14, 22], [28, 22], [40, 29], [5, 30], [17, 30], [38, 15], [16, 14], [29, 14]]);
  lamps(b, [[4, 15], [13, 19], [19, 5], [24, 15], [39, 19]]);
  return finish(b, {
    id: 'rung_linh_thu', name: 'Rừng Linh Thú', description: 'Rừng cổ · Linh thảo và mạch đá', requiresAdmission: true,
    playerSpawn: [2, 17], ambient: 'fireflies',
    npcs: [{ id: 'lam_ho', x: 10, y: 19 }], zones: [],
    monsters: [[25, 10], [30, 12], [34, 21], [27, 25], [17, 24], [25, 18]].map(([x, y]) => ({ type: 'thanh_moc_thu', x, y })),
    portals: [{ rect: [0, 16, 1, 3], to: 'dinh_ta', spawn: [37, 15], label: 'Đình Tạ' }, { rect: [20, 0, 3, 1], to: 'bi_canh_thach_linh', spawn: [19, 27], label: 'Bí Cảnh Thạch Linh', requiresQuest: 'travel_3' }, { rect: [43, 16, 1, 3], to: 'thac_ngoc', spawn: [19, 2], label: 'Thác Ngọc Tuyền' }],
    points: [point('forest_tracks', 'Dấu chân linh thú', 15, 12, 'Dấu chân hướng về mạch đá xanh. Hương thuốc thoảng trong gió lẫn với hơi nước từ phía thác.')],
    landmarks: [{ name: 'TRẠM GIỮ RỪNG', x: 9, y: 20 }, { name: 'LỐI VÀO THẠCH LINH', x: 24, y: 5 }],
  });
}

export function biCanhThachLinh(): MapDef {
  const b = new MapBuilder(38, 30, 'cave', 106);
  b.border('wall'); b.fill(14, 11, 10, 7, 'water');
  b.fill(8, 5, 22, 4, 'cave'); b.fill(8, 5, 4, 21, 'platform'); b.fill(26, 5, 4, 21, 'platform'); b.fill(8, 23, 22, 3, 'platform');
  b.fill(18, 23, 3, 7, 'cave'); b.fill(16, 4, 7, 5, 'platform');
  b.place('circle', 19, 6, { block: [] });
  for (const [x, y] of [[4, 5], [33, 5], [4, 14], [33, 14], [5, 25], [32, 25], [13, 9], [24, 20]]) b.place('world-crystal', x, y, { glow: 'cold' });
  for (const [x, y] of [[5, 9], [32, 9], [5, 20], [32, 20]]) b.place('world-rock', x, y);
  lamps(b, [[15, 25], [23, 25], [14, 6], [24, 6]], true);
  return finish(b, {
    id: 'bi_canh_thach_linh', name: 'Bí Cảnh Thạch Linh', description: 'Cổ trận trong lòng núi', requiresAdmission: true, requiresQuest: 'travel_3',
    playerSpawn: [19, 27], ambient: 'fireflies', npcs: [],
    monsters: [[10, 12], [28, 12], [28, 20], [9, 20], [25, 8]].map(([x, y]) => ({ type: 'thach_linh_thu', x, y })),
    zones: [{ id: 'cave_heart', name: 'Tâm Mạch Thạch Linh', rect: [16, 4, 7, 5], rate: 3 }],
    portals: [{ rect: [18, 29, 3, 1], to: 'rung_linh_thu', spawn: [21, 2], label: 'Rừng Linh Thú' }],
    points: [point('cave_memory', 'Cổ bia thạch linh', 19, 6, 'Tinh thể ngân lên rất khẽ. Trên cổ bia hiện một lời nhắn: giữ dòng suối trong, mạch núi sẽ còn sống. Con ghi nhớ lời ấy, không lấy đi một viên đá nào.')],
    landmarks: [{ name: 'CỔ TRẬN THẠCH LINH', x: 19, y: 9 }],
  });
}

export function thacNgoc(): MapDef {
  const b = new MapBuilder(40, 34, 'grass', 107);
  b.scatter('flower', 'grass', .15).border('wall');
  b.ellipse(11, 10, 5, 4, 'water'); b.ellipse(29, 10, 5, 4, 'water'); b.fill(7, 19, 26, 4, 'water');
  b.fill(18, 0, 4, 34, 'path'); b.fill(0, 16, 40, 3, 'path'); b.fill(18, 18, 4, 6, 'bridge');
  b.fill(10, 25, 23, 4, 'marble');
  b.place('world-waterfall', 11, 9, { block: block(6, 3), fade: true });
  b.place('world-waterfall', 29, 9, { block: block(6, 3), fade: true });
  b.place('sect-bridge', 20, 21, { block: [], flipX: true });
  building(b, 'sect-pavilion', 12, 25, 3, 2);
  b.place('circle', 28, 27, { block: [] });
  for (const [x, y] of [[4, 8], [35, 8], [6, 25], [34, 27], [24, 5]]) b.place('world-rock', x, y);
  trees(b, [[5, 15], [35, 15], [5, 29], [36, 30], [8, 3], [32, 3]]);
  lamps(b, [[16, 26], [24, 26], [4, 18]], true);
  return finish(b, {
    id: 'thac_ngoc', name: 'Thác Nước · Ngọc Tuyền', description: 'Song thác và linh tuyền', requiresAdmission: true,
    playerSpawn: [2, 17], ambient: 'fireflies', monsters: [],
    npcs: [{ id: 'giu_suoi', x: 13, y: 27 }],
    zones: [{ id: 'ngoc_tuyen', name: 'Ngọc Tuyền', rect: [25, 24, 7, 6], rate: 4 }],
    portals: [{ rect: [0, 16, 1, 3], to: 'dinh_ta', spawn: [19, 29], label: 'Đình Tạ' }, { rect: [18, 0, 4, 1], to: 'rung_linh_thu', spawn: [41, 17], label: 'Rừng Linh Thú' }],
    points: [point('waterfall_seal', 'Cổ ấn Ngọc Tuyền', 28, 27, 'Sương nước tan trên đầu ngón tay. Một cổ ấn hiện ra trong lòng bàn tay, cùng tiếng vọng từ cửa thạch động sâu trong rừng.')],
    landmarks: [{ name: 'SONG THÁC NGỌC TUYỀN', x: 20, y: 12 }, { name: 'LINH TUYỀN', x: 28, y: 29 }],
  });
}
