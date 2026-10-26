import type { PlayerSave } from './save';
import type { QuestLog } from './quest';
import { EXPLORATION_ORDER, PROLOGUE_ORDER, WORLD_QUESTS } from '../../data/world';
import { OPENING_QUESTS } from '../../data/openingAdventure';
import { REALMS } from '../../data';
import { missingMaterials } from './crafting';
import { BREAKTHROUGH_PILL_RECIPE } from '../../data/cultivationBalance';

export type MountId = 'sword' | 'crane';
export interface ImmortalProgress {
  crafted: Record<string, number>;
  gathered: Record<string, number>;
  homeLevel: number;
  gardenReadyAt: number;
  mount: MountId | null;
  /** Absolute times survive map changes and reloads. */
  harvestReadyAt: Record<string, number>;
}

export function immortalProgress(player: PlayerSave): ImmortalProgress {
  return {
    crafted: {},
    gathered: {},
    homeLevel: 0,
    gardenReadyAt: 0,
    mount: null,
    harvestReadyAt: {},
    ...player.immortal,
  };
}

export const RECIPES = [
  {
    id: 'hoi_xuan_dan',
    name: 'Hồi Xuân Đan',
    level: 1,
    desc: 'Hồi 45% sinh lực và linh lực.',
    cost: { thanh_linh_thao: 2, ngung_lo: 1, linh_khi: 5 },
  },
  {
    id: 'tu_linh_dan',
    name: 'Tụ Linh Đan',
    level: 1,
    desc: 'Dùng trong túi: nhận 120 EXP và 80 Linh Khí.',
    cost: { thanh_linh_thao: 3, linh_chi: 1, ngung_lo: 1, linh_khi: 10 },
  },
  {
    id: 'pha_canh_dan',
    name: 'Phá Cảnh Đan',
    level: 5,
    desc: 'Đột phá Trúc Cơ cần 1 viên; số viên cần tăng gấp đôi qua mỗi đại cảnh giới tiếp theo.',
    cost: BREAKTHROUGH_PILL_RECIPE,
  },
] as const;

export function recipeCheck(player: PlayerSave, id: string): string | null {
  const recipe = RECIPES.find((r) => r.id === id);
  if (!recipe) return 'Không có đan phương này.';
  if (player.level < recipe.level) return `Cần Lv.${recipe.level} để lĩnh ngộ đan phương.`;
  return missingMaterials(player, recipe.cost);
}

export const MOUNTS = [
  {
    id: 'sword' as const,
    name: 'Thanh Vân Kiếm',
    speed: 1.45,
    quest: 'main_4',
    desc: 'Đứng trên kiếm để bay. Tốc độ gốc +45%, thêm 1% mỗi đại cảnh giới. Từ Vấn Đỉnh chuyển sang đạp không, không hiện kiếm.',
  },
  {
    id: 'crane' as const,
    name: 'Bạch Vân Hạc',
    speed: 1.7,
    quest: 'main_hac',
    desc: 'Linh hạc nhận chủ khi hoàn thành duyên ngộ. Tốc độ +70%.',
  },
];

export function mountUnlocked(
  id: MountId,
  quests: QuestLog,
  player?: Pick<PlayerSave, 'realmIndex'>,
) {
  return (
    (id === 'sword' && (player?.realmIndex ?? 0) >= 1) ||
    quests[MOUNTS.find((m) => m.id === id)!.quest]?.status === 'done'
  );
}
export const UNASSISTED_FLIGHT_REALM = REALMS.findIndex((r) => r.name === 'Vấn Đỉnh');
export function flightProfile(player: Pick<PlayerSave, 'realmIndex'>, id: MountId = 'sword') {
  const realm = Math.max(0, Math.min(REALMS.length - 1, player.realmIndex));
  return {
    speed: (MOUNTS.find((m) => m.id === id)?.speed ?? 1.45) + realm * 0.01,
    showMount: id !== 'sword' || realm < UNASSISTED_FLIGHT_REALM,
  };
}

export const HOME_QUEST = 'main_dan';
export const HOME_MAX_LEVEL = 3;
export function homeUpgradeCost(level: number): Record<string, number> {
  return { linh_thach: 5 * (level + 1), linh_khi: 80 * (level + 1) };
}
export function homeMeditateRate(level: number) {
  return 2 + Math.max(0, Math.min(HOME_MAX_LEVEL, level));
}

export interface HerbNode {
  id: string;
  item: 'thanh_linh_thao' | 'ngung_lo' | 'linh_chi';
  x: number;
  y: number;
}

/** All nodes use open, reachable tiles. Field nodes are added on the entrance path. */
export function herbNodes(mapId: string): HerbNode[] {
  const points: [HerbNode['item'], number, number][] =
    mapId === 'dai_thua_vien'
      ? [
          ['thanh_linh_thao', 19, 22],
          ['thanh_linh_thao', 20, 24],
          ['ngung_lo', 27, 23],
          ['linh_chi', 28, 21],
        ]
      : mapId === 'dong_phu'
        ? []
        : mapId === 'linh_thu_lam'
          ? [
              ['thanh_linh_thao', 4, 17],
              ['linh_chi', 7, 17],
              ['ngung_lo', 10, 17],
            ]
          : [];
  const extra: Record<string, [HerbNode['item'], number, number][]> = {
    vuong_gia_thon: [
      ['thanh_linh_thao', 5, 19],
      ['thanh_linh_thao', 6, 20],
    ],
    dinh_ta: [
      ['ngung_lo', 11, 19],
      ['linh_chi', 29, 27],
    ],
    rung_linh_thu: [
      ['thanh_linh_thao', 7, 19],
      ['linh_chi', 12, 20],
      ['ngung_lo', 14, 10],
      ['linh_chi', 32, 24],
    ],
    thac_ngoc: [
      ['ngung_lo', 24, 27],
      ['linh_chi', 30, 27],
    ],
    bi_canh_thach_linh: [
      ['linh_chi', 12, 23],
      ['ngung_lo', 25, 23],
    ],
  };
  return (extra[mapId] ?? points).map(([item, x, y], i) => ({ id: `${mapId}:${i}`, item, x, y }));
}

export const HARVEST_COOLDOWN_MS = 25_000;
export function herbCooldownMs(item: HerbNode['item']) {
  return item === 'linh_chi' ? 180_000 : item === 'ngung_lo' ? 60_000 : HARVEST_COOLDOWN_MS;
}
export const GARDEN_COOLDOWN_MS = 300_000;

export const STORY_ORDER = [
  'main_0',
  'main_1',
  'main_2',
  'main_duoc',
  'main_dan',
  'main_phu',
  'main_3',
  'first_prepare',
  'first_boss',
  'first_return',
  'main_4',
  'main_kiem',
  'main_hac',
  ...EXPLORATION_ORDER,
];
export function storyOrder(player: PlayerSave) {
  return player.origin ? [...PROLOGUE_ORDER, ...STORY_ORDER] : STORY_ORDER;
}

export function storyChapter(id: string) {
  if (OPENING_QUESTS[id]?.chapter) return OPENING_QUESTS[id].chapter!;
  if (WORLD_QUESTS[id]?.chapter) return WORLD_QUESTS[id].chapter!;
  const index = STORY_ORDER.indexOf(id);
  return index <= 2
    ? 'Chương I · Tiên duyên'
    : index <= 5
      ? 'Chương II · Đan đạo'
      : 'Chương III · Ngọc ấn thức tỉnh';
}
