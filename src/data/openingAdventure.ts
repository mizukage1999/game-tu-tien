import type { DungeonDef, ItemDef, MonsterDef, QuestDef } from './index';

export const FIRST_TRIAL = 'ngoc_an_thu_luyen';
export const OPENING_ORDER = ['first_prepare', 'first_boss', 'first_return'];

export const OPENING_QUESTS: Record<string, QuestDef> = {
  first_prepare: {
    kind: 'main',
    name: 'Hành Trang Trước Bí Cảnh',
    chapter: 'Chương III · Ngọc ấn thức tỉnh',
    giver: 'su_huynh',
    requires: 'main_3',
    autoStart: true,
    desc: 'Trang bị một vũ khí, đánh thường trúng đích 3 lần, dùng một kỹ năng và lướt một lần. Luyện sẵn 1 Hồi Xuân Đan.',
    story:
      'Mảnh ngọc thứ hai mở ra một lối vào cổ viện. Sư huynh nhắc con: hãy tự điều khiển kiếm và thân pháp trước khi đối diện người giữ ấn. Những gì con đã luyện tập đều được ghi nhận.',
    objectives: [
      { type: 'practice', action: 'equip', count: 1 },
      { type: 'practice', action: 'basic', count: 3 },
      { type: 'practice', action: 'skill', count: 1 },
      { type: 'practice', action: 'dash', count: 1 },
      { type: 'craft', item: 'hoi_xuan_dan', count: 1 },
    ],
    rewards: { exp: 150, items: { hoi_xuan_dan: 2 } },
  },
  first_boss: {
    kind: 'main',
    name: 'Người Giữ Ngọc Ấn',
    chapter: 'Chương III · Ngọc ấn thức tỉnh',
    giver: 'su_huynh',
    requires: 'first_prepare',
    autoStart: true,
    desc: 'Tiến vào Cổ Viện Ngọc Ấn, đánh bại Ngọc Ấn Thủ Hộ. Khi vòng đỏ xuất hiện, di chuyển hoặc lướt ra ngoài trước khi đòn đánh rơi xuống.',
    story:
      'Cổ viện không thử xem ai có thanh kiếm sáng nhất. Người giữ ấn chỉ trao di vật cho kẻ biết khi nào tiến, khi nào lùi. Phía sau tiếng gầm là lời nhắn cuối cùng của Thanh Vân chân nhân.',
    objectives: [{ type: 'clearDungeon', dungeon: FIRST_TRIAL, count: 1 }],
    rewards: { exp: 250, linhKhi: 80 },
  },
  first_return: {
    kind: 'main',
    name: 'Lời Hẹn Với Quê Nhà',
    chapter: 'Chương III · Ngọc ấn thức tỉnh',
    giver: 'truong_lao',
    requires: 'first_boss',
    turnIn: 'truong_lao',
    autoStart: true,
    desc: 'Trở về Đại Thừa Viện, trao ngọc ấn cho Vân Hạc Trưởng Lão và nhận chỉ dẫn đột phá.',
    story:
      'Bên trong ngọc ấn là hình bóng một người từng rời quê đi tìm đạo. Vân Hạc dặn con giữ thanh kiếm vừa nhận, chăm linh điền để luyện Phá Cảnh Đan, rồi hãy bước qua bình cảnh. Con chợt nhớ lời hẹn trở về Vương Gia Thôn.',
    objectives: [{ type: 'talk', npc: 'truong_lao', count: 1 }],
    rewards: {
      exp: 300,
      items: { tinh_luyen_thach: 3, linh_chi: 3, yeu_dan: 2, ngung_lo: 2, linh_thach: 5 },
    },
  },
};

export const OPENING_ITEMS: Record<string, ItemDef> = {
  thanh_khe_kiem: {
    name: 'Thanh Khê Kiếm',
    kind: 'equipment',
    slot: 'weapon',
    rarity: 'blue',
    color: '#76d6ff',
    reqLevel: 3,
    bonus: { atk: 24, hp: 60 },
    desc: 'Kiếm truyền thừa của Cổ Viện Ngọc Ấn. Nhận chắc chắn khi vượt thử luyện lần đầu; không bán tại cửa hàng. Có thể cường hóa bằng Đá Cường Hóa, tối đa +12.',
  },
};

const guard: MonsterDef = {
  name: 'Ngọc Ấn Linh Vệ',
  art: 'beast_snow',
  level: 3,
  hp: 180,
  atk: 12,
  def: 4,
  speed: 95,
  aggroRadius: 800,
  attackRange: 52,
  attackInterval: 1850,
  attackWindup: 500,
  leashRadius: 99999,
  exp: 55,
  respawnMs: 0,
  loot: [{ item: 'hoi_xuan_dan', chance: 0.5, qty: [1, 1] }],
};
export const OPENING_MONSTERS: Record<string, MonsterDef> = {
  ngoc_an_linh_ve: guard,
  ngoc_an_thu_ho: {
    ...guard,
    name: 'Ngọc Ấn Thủ Hộ',
    art: 'dungeon_boss_0',
    level: 5,
    hp: 1300,
    atk: 25,
    def: 8,
    speed: 105,
    scale: 1.35,
    exp: 300,
    attackRange: 62,
    attackInterval: 1800,
    attackWindup: 650,
    boss: { pattern: 'storm', slamInterval: 7000, slamWindup: 1700, slamRadius: 145, slamMul: 2 },
    loot: [{ item: 'tinh_luyen_thach', chance: 1, qty: [1, 1] }],
  },
};
export const OPENING_DUNGEON: DungeonDef = {
  name: 'Cổ Viện Ngọc Ấn',
  map: 'pb_ngoc_an',
  minLevel: 4,
  recommendedPower: 500,
  requiresQuest: 'first_prepare',
  practice: true,
  desc: 'Thử luyện cốt truyện đầu tiên. Hai đợt linh vệ và một thủ hộ báo chiêu rõ ràng. Có thể thử lại; lần đầu chắc chắn nhận Thanh Khê Kiếm.',
  attemptsPerDay: 999,
  timeLimitSec: 360,
  waves: [[{ type: 'ngoc_an_linh_ve', count: 2 }], [{ type: 'ngoc_an_linh_ve', count: 2 }]],
  boss: 'ngoc_an_thu_ho',
  rewards: { exp: 180, linhKhi: 40, items: { linh_thach: 2 } },
  firstClear: { exp: 300, items: { thanh_khe_kiem: 1, tinh_luyen_thach: 2, hoi_xuan_dan: 2 } },
};
