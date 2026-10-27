import { DUNGEONS } from './index';
import { FIRST_TRIAL } from './openingAdventure';
import { DIFFICULTIES, DUNGEON_TIERS, dungeonId, type DifficultyId } from '../game/systems/scale';

export type DungeonGroup = 'all' | 'story' | 'trial' | 'sect';
export interface DungeonEntry {
  key: string;
  name: string;
  id: string;
  group: Exclude<DungeonGroup, 'all'>;
  art: number;
  tier?: number;
}
/** One destination per card, rather than twenty near-identical difficulty cards. */
export const DUNGEON_CATALOG: DungeonEntry[] = [
  { key: FIRST_TRIAL, id: FIRST_TRIAL, name: DUNGEONS[FIRST_TRIAL].name, group: 'story', art: 0 },
  ...DUNGEON_TIERS.map((tier, i) => ({
    key: `tier_${tier.level}`,
    id: dungeonId(tier.level, 'de'),
    name: tier.name,
    group: 'trial' as const,
    tier: tier.level,
    art: i + 1,
  })),
  ...Object.entries(DUNGEONS)
    // Quest-linked aliases retain tier metadata but have their own entry ids,
    // recommended level and saved attempts. Keep them reachable as sect trials.
    .filter(([id, def]) => !id.startsWith('tier_') && !def.practice)
    .map(([id, def], i) => ({
      key: id,
      id,
      name: def.name,
      group: 'sect' as const,
      art: 6 + (i % 2),
    })),
];
export const DUNGEON_GROUPS = [
  { id: 'all', label: 'Tất cả', glyph: 'all' },
  { id: 'story', label: 'Cốt truyện', glyph: 'story' },
  { id: 'trial', label: 'Thử luyện', glyph: 'trial' },
  { id: 'sect', label: 'Sư môn', glyph: 'sect' },
] as const;
export const DUNGEON_LEVELS = [
  { id: 'all', label: 'Tất cả', min: 0, max: Infinity },
  { id: '1-20', label: 'Lv.1–20', min: 1, max: 20 },
  { id: '21-40', label: 'Lv.21–40', min: 21, max: 40 },
  { id: '41-60', label: 'Lv.41–60', min: 41, max: 60 },
  { id: '61-80', label: 'Lv.61–80', min: 61, max: 80 },
  { id: '81+', label: 'Lv.81+', min: 81, max: Infinity },
] as const;
export function dungeonVariant(entry: DungeonEntry, difficulty: DifficultyId = 'de') {
  return entry.tier ? dungeonId(entry.tier, difficulty) : entry.id;
}
export function dungeonVariants(entry: DungeonEntry) {
  return entry.tier ? DIFFICULTIES.map((d) => dungeonId(entry.tier!, d.id)) : [entry.id];
}
