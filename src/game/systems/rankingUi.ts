import { HEROES, heroFor } from '../../data/heroes';
import { heroDefaultLoadout } from '../../data/heroSkills';
import { ITEMS } from '../../data';
import { adventure, battlePower, SECT_RANKS } from './adventure';
import { lifeProgress } from './life';
import { buildInspection, type PlayerInspection } from '../../net/inspection';
import { playerStats, type DerivedStats } from './progression';
import type { PlayerSave } from './save';
import type { QuestLog } from './quest';

export const RANKING_CATEGORIES = [
  {
    id: 'power',
    label: 'Lực Chiến',
    metric: 'Lực chiến',
    unit: '',
    hint: 'Sức mạnh tổng hợp từ thuộc tính và trang bị.',
  },
  {
    id: 'level',
    label: 'Cấp Độ',
    metric: 'Cấp độ',
    unit: 'cấp',
    hint: 'Cấp độ nhân vật hiện tại.',
  },
  {
    id: 'realm',
    label: 'Cảnh Giới',
    metric: 'Cảnh giới',
    unit: '',
    hint: 'Đại cảnh giới và giai đoạn tu luyện hiện tại.',
  },
  {
    id: 'sect',
    label: 'Tông Môn',
    metric: 'Cống hiến',
    unit: 'điểm',
    hint: 'Cống hiến cá nhân của đệ tử trong tông môn.',
  },
  {
    id: 'dungeons',
    label: 'Phó Bản',
    metric: 'Vượt ải',
    unit: 'lần',
    hint: 'Tổng số lần hoàn thành phó bản đã lưu.',
  },
  {
    id: 'boss',
    label: 'Săn Boss',
    metric: 'Boss hạ gục',
    unit: 'boss',
    hint: 'Số boss đã hạ có đóng góp, tính từ khi mở Tiên Bảng toàn server.',
  },
  {
    id: 'pets',
    label: 'Linh Thú',
    metric: 'Điểm linh thú',
    unit: 'điểm',
    hint: 'Tổng bậc linh thú; mỗi lần tiến hóa cộng thêm 3 điểm.',
  },
  {
    id: 'elements',
    label: 'Ngũ Hành',
    metric: 'Điểm ngũ hành',
    unit: 'điểm',
    hint: 'Bảng ngũ hành sẽ được nối khi hệ thống ghi nhận chỉ số.',
  },
] as const;
export type RankingCategory = (typeof RANKING_CATEGORIES)[number]['id'];
export interface RankingEntry {
  id: string;
  name: string;
  inspection: PlayerInspection;
  contribution: number;
  reputation: number;
  title: string;
  bossKills?: number;
  /** No five-elements score exists until that gameplay system records one. */
  elementScore?: number;
  element?: string;
  serverRank?: number | null;
  updatedAt?: string;
}

export function personalRankingEntry(
  player: PlayerSave,
  stats: DerivedStats,
  quests: QuestLog,
  mapId: string,
): RankingEntry {
  const data = buildInspection(player, stats, quests, mapId, 'ranking:self'),
    a = adventure(player);
  return {
    id: 'ranking:self',
    name: player.name,
    inspection: data,
    contribution: a.contribution,
    reputation: a.reputation,
    bossKills: Math.max(0, Math.min(10000000, Math.floor(player.achievements?.bossKills || 0))),
    title: data.child
      ? 'Thiếu niên Vương Gia Thôn'
      : `${SECT_RANKS[data.rank]?.name ?? 'Đệ tử'} · ${heroFor(player).school}`,
  };
}

export function rankingScore(entry: RankingEntry, category: RankingCategory): number | undefined {
  const p = entry.inspection;
  switch (category) {
    case 'power':
      return p.power;
    case 'level':
      return p.level;
    case 'realm':
      return p.child ? 0 : (p.realmIndex + 1) * 1000 + p.level;
    case 'sect':
      return entry.contribution;
    case 'dungeons':
      return p.progress.clears;
    case 'pets':
      return p.companions.reduce((sum, c) => sum + c.rank + c.evolution * 3, 0);
    case 'boss':
      return entry.bossKills;
    case 'elements':
      return entry.elementScore;
  }
}
const folded = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLocaleLowerCase('vi-VN');
export function rankEntries(
  entries: readonly RankingEntry[],
  category: RankingCategory,
  query = '',
) {
  const name = folded(query.trim());
  return entries
    .filter(
      (e) => rankingScore(e, category) !== undefined && (!name || folded(e.name).includes(name)),
    )
    .sort(
      (a, b) =>
        rankingScore(b, category)! - rankingScore(a, category)! ||
        b.inspection.level - a.inspection.level ||
        a.id.localeCompare(b.id),
    );
}

/** Explicit, deterministic artwork previews. Never added to a save or the social roster. */
export function rankingPreviewEntries(): RankingEntry[] {
  const names = [
    'Lục Trần',
    'Tiêu Vân',
    'Phong Vô Ảnh',
    'Hàn Thiên',
    'Dạ Thiên',
    'Ngọc Thanh',
    'Kim Long',
    'Tiểu Vân',
    'Mộ Vân',
    'Diệp Trần',
    'Thanh Trúc',
    'Vân Ninh',
    'Lâm Phong',
    'Vô Trần',
    'Bạch Nguyệt',
    'Tử Yên',
  ];
  const titles = ['Kiếm Đạo Chí Tôn', 'Băng Tâm Ngọc Cốt', 'Vạn Ảnh Vô Tung', 'Thiên Mộc Linh Tâm'];
  return names.map((name, i) => {
    const hero = HEROES[i % HEROES.length],
      level = 99 - i * 3;
    const p: PlayerSave = {
      name,
      heroId: hero.id,
      sex: hero.sex,
      admitted: true,
      level,
      realmIndex: Math.floor((level - 1) / 10),
      exp: 0,
      hp: 1,
      mp: 1,
      linhKhi: 0,
      inventory: {},
      equipment: {
        weapon: 'weapon_orange',
        armor: 'armor_purple',
        helmet: 'helmet_purple',
        amulet: 'amulet_blue',
        boots: 'boots_purple',
        ring: 'ring_orange',
      },
      skillLoadout: heroDefaultLoadout(hero.id),
      dungeons: { day: 'preview', runs: {}, clears: { preview: 140 - i * 6 } },
    };
    // Only known equipment definitions are used in the visual examples.
    p.equipment = Object.fromEntries(
      Object.entries(p.equipment).filter(([, id]) => !!ITEMS[id!]),
    ) as PlayerSave['equipment'];
    p.adventure = {
      ...adventure(p),
      contribution: 18000 - i * 750,
      reputation: 1700 - i * 70,
      enhancements: Object.fromEntries(
        Object.values(p.equipment).map((id) => [id!, Math.max(1, 12 - Math.floor(i / 2))]),
      ),
      evolution: { snow_fox: i < 5 ? 2 : 1 },
    };
    p.life = {
      ...lifeProgress(p),
      companion: 'snow_fox',
      companions: { snow_fox: { rank: 10 - Math.floor(i / 3), bond: 80 } },
    };
    const stats = playerStats(p);
    p.hp = stats.maxHp;
    p.mp = stats.maxMp;
    const entry = personalRankingEntry(p, stats, {}, 'dai_thua_vien');
    return {
      ...entry,
      id: `ranking:preview:${i}`,
      title: titles[i % titles.length],
      bossKills: 90 - i * 4,
      elementScore: 6000 - i * 210,
      element: ['Kim', 'Thủy', 'Mộc', 'Hỏa', 'Thổ'][i % 5],
      inspection: {
        ...entry.inspection,
        userId: `ranking:preview:${i}`,
        power: battlePower(stats),
      },
    };
  });
}
