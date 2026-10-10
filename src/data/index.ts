import monstersJson from './monsters.json';
import itemsJson from './items.json';
import skillsJson from './skills.json';
import realmsJson from './realms.json';
import questsJson from './quests.json';
import npcsJson from './npcs.json';
import dungeonsJson from './dungeons.json';

export interface LootEntry {
  item: string;
  qty: [number, number];
  chance: number;
}

export interface MonsterDef {
  name: string;
  level: number;
  art: string;
  hp: number;
  atk: number;
  def: number;
  speed: number;
  aggroRadius: number;
  attackRange: number;
  attackInterval: number;
  attackWindup: number;
  leashRadius: number;
  exp: number;
  respawnMs: number;
  loot: LootEntry[];
  scale?: number;
  boss?: BossDef;
}

export interface BossDef {
  slamInterval: number;
  slamWindup: number;
  slamRadius: number;
  slamMul: number;
  summon?: { type: string; count: number; atHpPct: number };
}

export interface ItemDef {
  name: string;
  kind: 'currency' | 'material' | 'consumable' | 'equipment';
  color: string;
  desc: string;
  heal?: number;
  slot?: 'ring';
  bonus?: { atk?: number; def?: number; hp?: number };
}

export type SkillId = 'basic' | 'bang_tam_tram' | 'phi_kiem' | 'han_bang_tran' | 'than_phap';

export interface SkillDef {
  name: string;
  key: string;
  mpCost: number;
  cooldownMs: number;
  multiplier: number;
  range: number;
  arc: number;
  desc: string;
  /** Fractional change per skill level above 1 (e.g. multiplier 0.1 = +10%/level). */
  growth: { multiplier?: number; cooldown?: number; range?: number };
  /** Extra effect unlocked at skill level 5. */
  bonus: SkillBonus;
}

export interface SkillBonus {
  desc: string;
  finisherMul?: number;
  echo?: number;
  extraSwords?: number;
  slowMs?: number;
  invulnMs?: number;
}

export interface WaveSpawn {
  type: string;
  count: number;
}

export interface DungeonDef {
  name: string;
  map: string;
  desc: string;
  minLevel: number;
  attemptsPerDay: number;
  timeLimitSec: number;
  waves: WaveSpawn[][];
  boss: string;
  rewards: QuestRewards;
  firstClear: QuestRewards;
}

export interface RealmDef {
  name: string;
  minLevel: number;
  maxLevel: number;
  statMul: number;
  breakthrough: { linhKhi: number; linhThach: number } | null;
}

export type Objective =
  | { type: 'kill'; target: string; count: number }
  | { type: 'collect'; item: string; count: number }
  | { type: 'talk'; npc: string; count: number }
  | { type: 'reachLevel'; count: number }
  | { type: 'enterZone'; zone: string; count: number }
  | { type: 'meditate'; zone: string; count: number }
  | { type: 'upgradeSkill'; count: number }
  | { type: 'clearDungeon'; dungeon: string; count: number };

export interface QuestRewards {
  exp?: number;
  linhKhi?: number;
  items?: Record<string, number>;
}

export interface QuestDef {
  kind: 'main' | 'side';
  name: string;
  desc: string;
  autoStart?: boolean;
  giver?: string;
  requires?: string;
  turnIn?: string;
  objectives: Objective[];
  rewards: QuestRewards;
}

export interface NpcDef {
  name: string;
  title: string;
  art: string;
  lines: string[];
  dungeon?: boolean;
  shop?: { item: string; qty: number; price: Record<string, number> }[];
}

export const MONSTERS = monstersJson as unknown as Record<string, MonsterDef>;
export const ITEMS = itemsJson as unknown as Record<string, ItemDef>;
export const SKILLS = skillsJson as unknown as Record<SkillId, SkillDef>;
export const REALMS = realmsJson as unknown as RealmDef[];
export const QUESTS = questsJson as unknown as Record<string, QuestDef>;
export const NPCS = npcsJson as unknown as Record<string, NpcDef>;
export const DUNGEONS = dungeonsJson as unknown as Record<string, DungeonDef>;

export const ZONE_NAMES: Record<string, string> = {
  linh_dai: 'Linh Đài',
  linh_tuyen: 'Linh Tuyền',
  dai_thua_vien: 'Đại Thừa Viện',
  linh_thu_lam: 'Linh Thú Lâm',
  ...Object.fromEntries(Object.entries(DUNGEONS).map(([id, d]) => [id, d.name])),
};
