import type { DungeonDef, LootEntry, MonsterDef, QuestRewards, RarityId } from '../../data';

/** Normal-monster experience. Higher level always yields more exp. */
export function expForMonsterLevel(level: number) {
  return Math.round(18 + level * 14 * (1 + level / 50));
}

export function killExp(def: { level: number; exp: number; boss?: unknown }) {
  return def.boss ? def.exp : expForMonsterLevel(def.level);
}

export function statsForLevel(level: number, mul = 1) {
  return {
    hp: Math.round((70 + 48 * level * (1 + level / 90)) * mul),
    atk: Math.round((6 + 4.5 * level) * mul),
    def: Math.round((2 + 1.5 * level) * mul),
    exp: expForMonsterLevel(level),
  };
}

export interface LevelRange {
  min: number;
  max: number;
}

export interface FieldBand {
  id: string;
  name: string;
  minLevel: number;
  maxLevel: number;
  mob: string;
  elite: string;
  /** Hand-built maps are not regenerated; their monsters already exist. */
  generated: boolean;
  art: 'beast_snow' | 'beast_fire';
  terrain: 'darkgrass' | 'dirt' | 'stone' | 'grass';
  ambient: 'petals' | 'fireflies' | 'snow' | 'embers';
  trees: string[];
  glow: 'warm' | 'cold';
}

export const FIELD_BANDS: FieldBand[] = [
  { id: 'linh_thu_lam', name: 'Linh Thú Lâm', minLevel: 1, maxLevel: 10, mob: 'linh_thu', elite: 'hoa_ho', generated: false, art: 'beast_snow', terrain: 'darkgrass', ambient: 'fireflies', trees: ['tree_pine'], glow: 'warm' },
  { id: 'thanh_van_coc', name: 'Thanh Vân Cốc', minLevel: 11, maxLevel: 20, mob: 'field_thanh_van_coc', elite: 'field_thanh_van_coc_elite', generated: true, art: 'beast_snow', terrain: 'grass', ambient: 'petals', trees: ['tree_cherry', 'tree_cherry_b'], glow: 'warm' },
  { id: 'huyen_nham_dong', name: 'Huyền Nham Động', minLevel: 21, maxLevel: 30, mob: 'field_huyen_nham_dong', elite: 'field_huyen_nham_dong_elite', generated: true, art: 'beast_fire', terrain: 'stone', ambient: 'embers', trees: ['rock'], glow: 'warm' },
  { id: 'u_minh_trach', name: 'U Minh Trạch', minLevel: 31, maxLevel: 40, mob: 'field_u_minh_trach', elite: 'field_u_minh_trach_elite', generated: true, art: 'beast_snow', terrain: 'darkgrass', ambient: 'fireflies', trees: ['tree_pine', 'tree_pine_b'], glow: 'cold' },
  { id: 'xich_ha_son', name: 'Xích Hà Sơn', minLevel: 41, maxLevel: 50, mob: 'field_xich_ha_son', elite: 'field_xich_ha_son_elite', generated: true, art: 'beast_fire', terrain: 'dirt', ambient: 'embers', trees: ['rock'], glow: 'warm' },
  { id: 'loi_am_cac', name: 'Lôi Âm Các', minLevel: 51, maxLevel: 60, mob: 'field_loi_am_cac', elite: 'field_loi_am_cac_elite', generated: true, art: 'beast_snow', terrain: 'stone', ambient: 'snow', trees: ['rock'], glow: 'cold' },
  { id: 'han_bang_nguyen', name: 'Hàn Băng Nguyên', minLevel: 61, maxLevel: 70, mob: 'field_han_bang_nguyen', elite: 'field_han_bang_nguyen_elite', generated: true, art: 'beast_snow', terrain: 'stone', ambient: 'snow', trees: ['tree_pine'], glow: 'cold' },
  { id: 'viem_duong_dia', name: 'Viêm Dương Địa', minLevel: 71, maxLevel: 80, mob: 'field_viem_duong_dia', elite: 'field_viem_duong_dia_elite', generated: true, art: 'beast_fire', terrain: 'dirt', ambient: 'embers', trees: ['rock'], glow: 'warm' },
  { id: 'tu_van_phong', name: 'Tử Vân Phong', minLevel: 81, maxLevel: 90, mob: 'field_tu_van_phong', elite: 'field_tu_van_phong_elite', generated: true, art: 'beast_fire', terrain: 'darkgrass', ambient: 'fireflies', trees: ['tree_pine_b'], glow: 'cold' },
  { id: 'thien_kiep_nhai', name: 'Thiên Kiếp Nhai', minLevel: 91, maxLevel: 99, mob: 'field_thien_kiep_nhai', elite: 'field_thien_kiep_nhai_elite', generated: true, art: 'beast_fire', terrain: 'stone', ambient: 'embers', trees: ['rock'], glow: 'warm' },
];

export function fieldForLevel(level: number) {
  return FIELD_BANDS.find((b) => level >= b.minLevel && level <= b.maxLevel) ?? FIELD_BANDS[FIELD_BANDS.length - 1];
}

export type FieldCheck = { ok: true } | { ok: false; reason: string };

export function canEnterField(level: number, range: LevelRange): FieldCheck {
  if (level < range.min) return { ok: false, reason: `Cần đạt cấp ${range.min} mới vào được khu này.` };
  if (level > range.max) return { ok: false, reason: `Khu này chỉ dành cho cấp ${range.min}-${range.max}.` };
  return { ok: true };
}

export const DIFFICULTIES = [
  { id: 'de', name: 'Dễ', stat: 0.75, levelAdd: 0, attempts: 4, time: 200, reward: 0.7, color: '#7dff9a' },
  { id: 'thuong', name: 'Thường', stat: 1, levelAdd: 2, attempts: 3, time: 240, reward: 1, color: '#7fd8ff' },
  { id: 'kho', name: 'Khó', stat: 1.45, levelAdd: 5, attempts: 2, time: 270, reward: 1.6, color: '#ffb44a' },
  { id: 'dia_nguc', name: 'Địa Ngục', stat: 2.1, levelAdd: 10, attempts: 1, time: 300, reward: 2.6, color: '#ff6a5a' },
] as const;

export type DifficultyId = (typeof DIFFICULTIES)[number]['id'];

export const DUNGEON_TIERS = [
  { level: 10, name: 'Băng Tuyết Động', map: 'pb_bang_tuyet', art: 'beast_snow' as const, bossArt: 'beast_frost_king' as const },
  { level: 30, name: 'Hỏa Diễm Cốc', map: 'pb_hoa_diem', art: 'beast_fire' as const, bossArt: 'beast_fire_king' as const },
  { level: 50, name: 'Lôi Đình Uyên', map: 'pb_bang_tuyet', art: 'beast_snow' as const, bossArt: 'beast_frost_king' as const },
  { level: 70, name: 'U Minh Huyết Địa', map: 'pb_hoa_diem', art: 'beast_fire' as const, bossArt: 'beast_fire_king' as const },
  { level: 90, name: 'Thiên Kiếp Điện', map: 'pb_bang_tuyet', art: 'beast_snow' as const, bossArt: 'beast_fire_king' as const },
];

export function dungeonId(level: number, diff: DifficultyId) {
  return `tier_${level}_${diff}`;
}

/** One roll per rarity. Chances stay low so most clears only pay the listed rewards. */
const GEAR_DROPS: Record<DifficultyId, [RarityId, number][]> = {
  de: [
    ['white', 0.08],
    ['blue', 0.03],
  ],
  thuong: [
    ['blue', 0.06],
    ['green', 0.025],
  ],
  kho: [
    ['green', 0.05],
    ['purple', 0.018],
  ],
  dia_nguc: [
    ['purple', 0.04],
    ['orange', 0.015],
    ['red', 0.006],
    ['pink', 0.002],
  ],
};

export function gearDrops(diff: DifficultyId): LootEntry[] {
  return GEAR_DROPS[diff].map(([rarity, chance]) => ({ item: `gear:${rarity}`, qty: [1, 1], chance }));
}

function lootFor(level: number, elite: boolean): MonsterDef['loot'] {
  const stones = elite ? 0.55 : 0.3;
  return [
    { item: 'linh_khi', qty: [level * 4, level * 8], chance: 0.85 },
    { item: 'linh_thach', qty: [1, elite ? 2 : 1], chance: stones },
    { item: 'hoi_xuan_dan', qty: [1, 1], chance: elite ? 0.12 : 0.06 },
    { item: 'kiem_pho', qty: [1, 1], chance: elite ? 0.08 : 0.03 },
  ];
}

function makeMob(name: string, level: number, art: MonsterDef['art'], mul: number, elite: boolean): MonsterDef {
  const s = statsForLevel(level, mul);
  return {
    name,
    level,
    art,
    hp: s.hp,
    atk: s.atk,
    def: s.def,
    speed: 90 + Math.min(40, level),
    aggroRadius: 200,
    attackRange: 60,
    attackInterval: Math.max(900, 1700 - level * 8),
    attackWindup: 300,
    leashRadius: 460,
    exp: s.exp,
    respawnMs: elite ? 14000 : 8000,
    loot: lootFor(level, elite),
  };
}

export function buildScaledContent(): { monsters: Record<string, MonsterDef>; dungeons: Record<string, DungeonDef> } {
  const monsters: Record<string, MonsterDef> = {};
  for (const band of FIELD_BANDS) {
    if (!band.generated) continue;
    monsters[band.mob] = makeMob(`${band.name} Thú`, band.minLevel + 1, band.art, 1, false);
    monsters[band.elite] = makeMob(`${band.name} Yêu`, band.maxLevel, band.art, 1.25, true);
  }

  const dungeons: Record<string, DungeonDef> = {};
  for (const tier of DUNGEON_TIERS) {
    for (const diff of DIFFICULTIES) {
      const level = tier.level + diff.levelAdd;
      const mobId = `dg_${tier.level}_${diff.id}`;
      const bossId = `dg_${tier.level}_${diff.id}_boss`;
      monsters[mobId] = makeMob(`${tier.name} Hộ Vệ`, level, tier.art, diff.stat, false);
      const boss = makeMob(`${tier.name} Chủ`, level + 2, tier.bossArt, diff.stat * 1.15, true);
      boss.scale = 2;
      boss.hp = Math.round(boss.hp * 6);
      boss.exp = expForMonsterLevel(level) * 6;
      boss.respawnMs = 0;
      boss.leashRadius = 99999;
      boss.aggroRadius = 900;
      boss.boss = { slamInterval: 6000, slamWindup: 900, slamRadius: 140, slamMul: 1.6 + diff.levelAdd / 20, summon: { type: mobId, count: 2, atHpPct: 0.5 } };
      monsters[bossId] = boss;

      const reward = Math.round(diff.reward * 10) / 10;
      const rewards: QuestRewards = {
        exp: expForMonsterLevel(level) * 8,
        linhKhi: Math.round(tier.level * 40 * reward),
        items: { linh_thach: Math.max(1, Math.round((tier.level / 10) * reward)), kiem_pho: diff.levelAdd >= 5 ? 2 : 1 },
      };
      const counts = [3, 4, 5].map((n) => n + Math.floor(diff.levelAdd / 4));
      dungeons[dungeonId(tier.level, diff.id)] = {
        name: `${tier.name} · ${diff.name}`,
        map: tier.map,
        desc: `Phó bản cấp ${tier.level}, độ khó ${diff.name}. Quái khoảng cấp ${level}.`,
        minLevel: tier.level,
        attemptsPerDay: diff.attempts,
        timeLimitSec: diff.time,
        waves: counts.map((count) => [{ type: mobId, count }]),
        boss: bossId,
        rewards,
        firstClear: { items: { hoi_xuan_dan: 2, kiem_pho: 1 } },
        drops: gearDrops(diff.id),
        tier: tier.level,
        difficulty: diff.id,
      };
    }
  }
  return { monsters, dungeons };
}
