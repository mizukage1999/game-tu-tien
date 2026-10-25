import type { MonsterDef } from './index';
import { statsForLevel } from '../game/systems/scale';

export const BESTIARY_SHEETS = ['wild', 'spirit', 'danger', 'elite', 'boss'] as const;
export type BestiarySheet = (typeof BESTIARY_SHEETS)[number];
export interface Species {
  id: string;
  name: string;
  level: number;
  sheet: BestiarySheet;
  row: number;
  height: number;
  passive?: boolean;
  pattern?: 'frost' | 'fire' | 'storm' | 'shadow' | 'celestial';
}
export const BESTIARY: Species[] = [
  {
    id: 'tho_linh',
    name: 'Thỏ Linh',
    level: 1,
    sheet: 'wild',
    row: 0,
    height: 44,
    passive: true,
  },
  {
    id: 'heo_rung',
    name: 'Heo Rừng',
    level: 3,
    sheet: 'wild',
    row: 1,
    height: 55,
  },
  {
    id: 'soi_hoang',
    name: 'Sói Hoang',
    level: 5,
    sheet: 'wild',
    row: 2,
    height: 62,
  },
  {
    id: 'yeu_lang_nho',
    name: 'Yêu Lang Nhỏ',
    level: 7,
    sheet: 'wild',
    row: 3,
    height: 66,
  },
  {
    id: 'yeu_thach',
    name: 'Yêu Thạch',
    level: 9,
    sheet: 'wild',
    row: 4,
    height: 86,
  },
  {
    id: 'con_trung_doc',
    name: 'Côn Trùng Độc',
    level: 10,
    sheet: 'wild',
    row: 5,
    height: 46,
  },
  {
    id: 'ho_yeu',
    name: 'Hồ Yêu',
    level: 12,
    sheet: 'spirit',
    row: 0,
    height: 74,
  },
  {
    id: 'linh_hac',
    name: 'Linh Hạc',
    level: 16,
    sheet: 'spirit',
    row: 1,
    height: 82,
    passive: true,
  },
  {
    id: 'yeu_ho_son_lam',
    name: 'Yêu Hổ Sơn Lâm',
    level: 20,
    sheet: 'spirit',
    row: 2,
    height: 72,
  },
  {
    id: 'moc_yeu',
    name: 'Mộc Yêu',
    level: 23,
    sheet: 'spirit',
    row: 3,
    height: 96,
  },
  {
    id: 'thuy_yeu',
    name: 'Thủy Yêu',
    level: 26,
    sheet: 'spirit',
    row: 4,
    height: 88,
  },
  {
    id: 'doc_xa',
    name: 'Độc Xà',
    level: 29,
    sheet: 'spirit',
    row: 5,
    height: 76,
  },
  {
    id: 'huyet_lang',
    name: 'Huyết Lang',
    level: 35,
    sheet: 'danger',
    row: 0,
    height: 76,
  },
  {
    id: 'hac_hung',
    name: 'Hắc Hùng',
    level: 40,
    sheet: 'danger',
    row: 1,
    height: 94,
  },
  {
    id: 'yeu_linh_phong',
    name: 'Yêu Linh Phong',
    level: 45,
    sheet: 'danger',
    row: 2,
    height: 96,
  },
  {
    id: 'hoa_ma',
    name: 'Hỏa Ma',
    level: 48,
    sheet: 'danger',
    row: 3,
    height: 105,
  },
  {
    id: 'bang_yeu',
    name: 'Băng Yêu',
    level: 52,
    sheet: 'danger',
    row: 4,
    height: 110,
  },
  {
    id: 'loi_dieu',
    name: 'Lôi Điểu',
    level: 58,
    sheet: 'danger',
    row: 5,
    height: 94,
  },
  {
    id: 'thach_cu_nhan',
    name: 'Thạch Cự Nhân',
    level: 65,
    sheet: 'elite',
    row: 0,
    height: 124,
  },
  {
    id: 'thien_lang_vuong',
    name: 'Thiên Lang Vương',
    level: 70,
    sheet: 'elite',
    row: 1,
    height: 103,
  },
  {
    id: 'hoa_ky_lan',
    name: 'Hỏa Kỳ Lân',
    level: 78,
    sheet: 'elite',
    row: 2,
    height: 110,
  },
  {
    id: 'bang_phuong',
    name: 'Băng Phượng',
    level: 82,
    sheet: 'elite',
    row: 3,
    height: 118,
  },
  {
    id: 'loi_ma_tuong',
    name: 'Lôi Ma Tướng',
    level: 90,
    sheet: 'elite',
    row: 4,
    height: 128,
  },
  {
    id: 'u_minh_ma',
    name: 'U Minh Ma',
    level: 98,
    sheet: 'elite',
    row: 5,
    height: 126,
  },
  {
    id: 'cuu_vi_thien_ho',
    name: 'Cửu Vĩ Thiên Hồ',
    level: 101,
    sheet: 'boss',
    row: 0,
    height: 132,
    pattern: 'frost',
  },
  {
    id: 'long_than',
    name: 'Long Thần',
    level: 104,
    sheet: 'boss',
    row: 1,
    height: 142,
    pattern: 'storm',
  },
  {
    id: 'ma_ton',
    name: 'Ma Tôn',
    level: 107,
    sheet: 'boss',
    row: 2,
    height: 145,
    pattern: 'fire',
  },
  {
    id: 'thien_dao_kim_o',
    name: 'Thiên Đạo Kim Ô',
    level: 110,
    sheet: 'boss',
    row: 3,
    height: 136,
    pattern: 'celestial',
  },
  {
    id: 'u_minh_co_thu',
    name: 'U Minh Cổ Thụ',
    level: 113,
    sheet: 'boss',
    row: 4,
    height: 148,
    pattern: 'shadow',
  },
  {
    id: 'hon_don_thu',
    name: 'Hỗn Độn Thú',
    level: 116,
    sheet: 'boss',
    row: 5,
    height: 142,
    pattern: 'shadow',
  },
];
export const speciesArt = (id: string) => `mob-v6-${id}`;
export const speciesForArt = (art: string) => BESTIARY.find((s) => speciesArt(s.id) === art);

export const BESTIARY_MONSTERS: Record<string, MonsterDef> = Object.fromEntries(
  BESTIARY.map((s) => {
    const boss = s.sheet === 'boss',
      elite = s.sheet === 'elite';
    const stats = statsForLevel(s.level, boss ? 1.8 : elite ? 1.3 : s.passive ? 0.65 : 0.9);
    const rarity =
      s.level < 20
        ? 'white'
        : s.level < 40
          ? 'blue'
          : s.level < 65
            ? 'green'
            : s.level < 90
              ? 'purple'
              : 'orange';
    const def: MonsterDef = {
      name: s.name,
      level: s.level,
      art: speciesArt(s.id),
      hp: stats.hp * (boss ? 14 : elite ? 2 : 1),
      atk: stats.atk,
      def: stats.def,
      speed: s.passive ? 75 : s.id.includes('thach') ? 70 : 95 + Math.min(45, s.level / 2),
      aggroRadius: s.passive ? 0 : boss ? 250 : 150 + Math.min(60, s.level),
      attackRange: boss ? 95 : s.id === 'thuy_yeu' || s.id === 'yeu_linh_phong' ? 110 : 58,
      attackInterval: boss ? 1800 : 1700 - Math.min(500, s.level * 4),
      attackWindup: boss ? 560 : 360,
      leashRadius: boss ? 600 : 350,
      exp: stats.exp * (boss ? 12 : elite ? 2 : 1),
      respawnMs: boss ? 180000 : elite ? 30000 : 16000,
      scale: boss ? 1.3 : 1,
      loot: [
        { item: 'linh_khi', qty: [Math.max(2, s.level * 2), Math.max(4, s.level * 5)], chance: 1 },
        { item: 'linh_thach', qty: [1, boss ? 12 : elite ? 4 : 2], chance: boss ? 1 : 0.5 },
        { item: 'hoi_xuan_dan', qty: [1, boss ? 3 : 1], chance: boss ? 0.8 : 0.1 },
        {
          item: 'tinh_luyen_thach',
          qty: [1, boss ? 5 : elite ? 2 : 1],
          chance: boss ? 1 : elite ? 0.35 : 0.08,
        },
        { item: `gear:${rarity}`, qty: [1, 1], chance: boss ? 0.65 : elite ? 0.08 : 0.018 },
        ...(s.level >= 10
          ? [
              {
                item: 'yeu_dan',
                qty: [1, boss ? 4 : 1] as [number, number],
                chance: boss ? 1 : 0.3,
              },
            ]
          : []),
      ],
      ...(boss
        ? {
            boss: {
              pattern: s.pattern,
              slamInterval: 6500,
              slamWindup: 1400,
              slamRadius: 155,
              slamMul: 1.9,
              summon: {
                type:
                  s.pattern === 'frost'
                    ? 'yeu_lang_nho'
                    : s.pattern === 'fire'
                      ? 'hoa_ma'
                      : 'yeu_linh_phong',
                count: 2,
                atHpPct: 0.5,
              },
            },
          }
        : {}),
    };
    return [s.id, def];
  }),
);

/** Keep existing quest and save IDs; change only their graphics. */
export function restyleLegacyMonsters(monsters: Record<string, MonsterDef>) {
  const aliases: Record<string, string> = {
    linh_thu: 'soi_hoang',
    hoa_ho: 'ho_yeu',
    thanh_moc_thu: 'moc_yeu',
    thach_linh_thu: 'yeu_thach',
    tuyet_ho_vuong: 'cuu_vi_thien_ho',
    cuu_vi_hoa_ho: 'ho_yeu',
    field_thanh_van_coc: 'heo_rung',
    field_thanh_van_coc_elite: 'yeu_ho_son_lam',
    field_huyen_nham_dong: 'yeu_thach',
    field_huyen_nham_dong_elite: 'doc_xa',
    field_u_minh_trach: 'huyet_lang',
    field_u_minh_trach_elite: 'hac_hung',
    field_xich_ha_son: 'hoa_ma',
    field_xich_ha_son_elite: 'yeu_linh_phong',
    field_loi_am_cac: 'loi_dieu',
    field_loi_am_cac_elite: 'loi_ma_tuong',
    field_han_bang_nguyen: 'bang_yeu',
    field_han_bang_nguyen_elite: 'thien_lang_vuong',
    field_viem_duong_dia: 'hoa_ma',
    field_viem_duong_dia_elite: 'hoa_ky_lan',
    field_tu_van_phong: 'yeu_linh_phong',
    field_tu_van_phong_elite: 'u_minh_ma',
    field_thien_kiep_nhai: 'loi_dieu',
    field_thien_kiep_nhai_elite: 'loi_ma_tuong',
  };
  for (const [id, species] of Object.entries(aliases))
    if (monsters[id]) {
      monsters[id] = {
        ...monsters[id],
        art: speciesArt(species),
        ...(monsters[id].boss ? { scale: 1.35 } : {}),
      };
    }
  const guards = ['bang_yeu', 'yeu_ho_son_lam', 'loi_dieu', 'huyet_lang', 'u_minh_ma'];
  const bosses = ['thien_lang_vuong', 'hoa_ky_lan', 'long_than', 'u_minh_ma', 'hon_don_thu'];
  for (const [id, def] of Object.entries(monsters)) {
    const tier = /^dg_(10|30|50|70|90)_/.exec(id);
    if (!tier) continue;
    const index = [10, 30, 50, 70, 90].indexOf(Number(tier[1]));
    monsters[id] = {
      ...def,
      art: speciesArt(def.boss ? bosses[index] : guards[index]),
      ...(def.boss ? { scale: 1.45 } : {}),
    };
  }
  return monsters;
}

export const BESTIARY_HABITATS: Record<string, string[]> = {
  rung_linh_thu: ['tho_linh', 'tho_linh', 'heo_rung', 'soi_hoang', 'con_trung_doc'],
  linh_thu_lam: ['yeu_lang_nho', 'ho_yeu', 'yeu_ho_son_lam', 'con_trung_doc'],
  bi_canh_thach_linh: ['yeu_thach', 'yeu_lang_nho'],
  thac_ngoc: ['linh_hac', 'linh_hac', 'thuy_yeu'],
  thanh_van_coc: ['ho_yeu', 'yeu_ho_son_lam', 'moc_yeu'],
  huyen_nham_dong: ['doc_xa', 'moc_yeu', 'yeu_thach'],
  u_minh_trach: ['huyet_lang', 'hac_hung', 'doc_xa'],
  xich_ha_son: ['hoa_ma', 'yeu_linh_phong'],
  loi_am_cac: ['loi_dieu', 'bang_yeu'],
  han_bang_nguyen: ['bang_yeu', 'thach_cu_nhan', 'bang_phuong', 'cuu_vi_thien_ho'],
  viem_duong_dia: ['hoa_ky_lan', 'ma_ton', 'thien_dao_kim_o'],
  tu_van_phong: ['u_minh_ma', 'yeu_linh_phong', 'thien_lang_vuong', 'long_than', 'u_minh_co_thu'],
  thien_kiep_nhai: ['loi_ma_tuong', 'hon_don_thu'],
};
