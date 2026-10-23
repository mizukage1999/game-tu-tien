import monstersJson from './monsters.json';
import itemsJson from './items.json';
import skillsJson from './skills.json';
import realmsJson from './realms.json';
import questsJson from './quests.json';
import npcsJson from './npcs.json';
import equipmentJson from './equipment.json';
import dungeonsJson from './dungeons.json';
import { buildScaledContent, FIELD_BANDS } from '../game/systems/scale';
import { NEW_MAPS, WORLD_NPCS, WORLD_QUESTS } from './world';
import { EXPANSION_ITEMS, EXPANSION_OFFERS } from './expansion';

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

export type EquipSlot = 'weapon' | 'armor' | 'helmet' | 'boots' | 'ring' | 'amulet';
export type RarityId = 'white' | 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'pink';
export type StatBonus = { atk?: number; def?: number; hp?: number };

export interface RarityDef {
  id: RarityId;
  name: string;
  label: string;
  color: string;
  prefix: string;
  reqLevel: number;
  mul: number;
  price: Record<string, number>;
}

export interface SlotDef {
  id: EquipSlot;
  name: string;
  noun: string;
  bonus: StatBonus;
}

export interface ItemDef {
  name: string;
  kind: 'currency' | 'material' | 'consumable' | 'equipment';
  color: string;
  desc: string;
  heal?: number;
  cultivation?: { exp: number; linhKhi: number };
  slot?: EquipSlot;
  rarity?: RarityId;
  reqLevel?: number;
  bonus?: StatBonus;
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
  /** Low-chance bonus gear. Ids like `gear:white` roll a random slot of that rarity. */
  drops?: LootEntry[];
  tier?: number;
  difficulty?: 'de' | 'thuong' | 'kho' | 'dia_nguc';
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
  | { type: 'clearDungeon'; dungeon: string; count: number }
  | { type: 'gather'; item: string; count: number }
  | { type: 'craft'; item: string; count: number }
  | { type: 'mount'; mount: 'sword' | 'crane'; count: number }
  | { type: 'interact'; point: string; count: number };

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
  story?: string;
  chapter?: string;
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
  shop?: ShopOffer[];
  /** Also sells every generated equipment piece. */
  equipmentShop?: boolean;
  dungeon?: boolean;
}

export interface ShopOffer {
  item: string;
  qty: number;
  price: Record<string, number>;
}

export const RARITIES = equipmentJson.rarities as RarityDef[];
export const EQUIP_SLOTS = equipmentJson.slots as SlotDef[];

export function rarityOf(id: RarityId | undefined): RarityDef {
  return RARITIES.find((r) => r.id === id) ?? RARITIES[0];
}

export function equipmentId(slot: EquipSlot, rarity: RarityId) {
  return `${slot}_${rarity}`;
}

export function bonusText(bonus: StatBonus | undefined): string {
  if (!bonus) return '';
  return [bonus.atk && `Công +${bonus.atk}`, bonus.def && `Thủ +${bonus.def}`, bonus.hp && `Sinh lực +${bonus.hp}`]
    .filter(Boolean)
    .join(', ');
}

const EQUIPMENT_REQ_LEVEL: Record<RarityId, number> = {
  white: 10,
  blue: 20,
  green: 40,
  purple: 60,
  orange: 80,
  red: 100,
  pink: 100,
};

function buildEquipment(): Record<string, ItemDef> {
  const out: Record<string, ItemDef> = {};
  for (const r of RARITIES) {
    for (const slot of EQUIP_SLOTS) {
      const bonus: StatBonus = {};
      for (const [k, v] of Object.entries(slot.bonus) as [keyof StatBonus, number][]) bonus[k] = Math.round(v * r.mul);
      out[equipmentId(slot.id, r.id)] = {
        name: `${r.prefix} ${slot.noun}`,
        kind: 'equipment',
        color: r.color,
        slot: slot.id,
        rarity: r.id,
        reqLevel:
          ['weapon', 'armor', 'boots', 'ring', 'amulet'].includes(slot.id)
            ? EQUIPMENT_REQ_LEVEL[r.id]
            : r.reqLevel,
        bonus,
        desc: `${slot.name} ${r.name}. ${bonusText(bonus)}.`,
      };
    }
  }
  return out;
}

function equipmentOffers(): ShopOffer[] {
  return RARITIES.flatMap((r) =>
    EQUIP_SLOTS.map((slot) => ({ item: equipmentId(slot.id, r.id), qty: 1, price: r.price })),
  );
}

const scaled = buildScaledContent();

export const MONSTERS: Record<string, MonsterDef> = {
  ...(monstersJson as unknown as Record<string, MonsterDef>),
  ...scaled.monsters,
  thanh_moc_thu: { name: 'Thanh Mộc Thú', level: 3, art: 'beast_snow', hp: 210, atk: 13, def: 5, speed: 100, aggroRadius: 165, attackRange: 55, attackInterval: 1700, attackWindup: 350, leashRadius: 230, exp: 65, respawnMs: 12000, loot: [{ item: 'linh_khi', qty: [4, 8], chance: 1 }, { item: 'linh_thach', qty: [1, 1], chance: .35 }, { item: 'linh_chi', qty: [1, 1], chance: .25 }] },
  thach_linh_thu: { name: 'Thạch Linh Thú', level: 5, art: 'beast_snow', hp: 330, atk: 19, def: 9, speed: 95, aggroRadius: 155, attackRange: 58, attackInterval: 1800, attackWindup: 400, leashRadius: 240, exp: 105, respawnMs: 16000, loot: [{ item: 'linh_khi', qty: [8, 15], chance: 1 }, { item: 'yeu_dan', qty: [1, 1], chance: .45 }, { item: 'linh_thach', qty: [1, 2], chance: .4 }] },
};
export const ITEMS: Record<string, ItemDef> = { ...(itemsJson as unknown as Record<string, ItemDef>), ...buildEquipment(), ...EXPANSION_ITEMS };
export const SKILLS = skillsJson as unknown as Record<SkillId, SkillDef>;
export const REALMS = realmsJson as unknown as RealmDef[];
export const QUESTS: Record<string, QuestDef> = { ...(questsJson as unknown as Record<string, QuestDef>), ...WORLD_QUESTS };
export const NPCS: Record<string, NpcDef> = Object.fromEntries(
  Object.entries({ ...(npcsJson as unknown as Record<string, NpcDef>), ...WORLD_NPCS }).map(([id, n]) => [
    id,
    n.equipmentShop ? { ...n, shop: [...(n.shop ?? []), ...equipmentOffers().filter(o=>ITEMS[o.item].slot==='weapon'), ...EXPANSION_OFFERS] } : n,
  ]),
);
export const DUNGEONS: Record<string, DungeonDef> = {
  ...(dungeonsJson as unknown as Record<string, DungeonDef>),
  ...scaled.dungeons,
};

export const ZONE_NAMES: Record<string, string> = {
  village_well: 'Giếng đầu làng', village_workbench: 'Bàn mộc của cha', village_willow: 'Bóng liễu Thanh Khê', village_notice: 'Cáo thị tuyển đồ', gate_trial: 'Bia khảo hạch', pavilion_tablet: 'Thạch thư hồ sen', waterfall_seal: 'Cổ ấn Ngọc Tuyền', cave_memory: 'Cổ bia thạch linh',
  ...Object.fromEntries(NEW_MAPS.map((map) => [map.id, map.name])),
  village_river: 'Bến Thanh Khê',
  pavilion_lotus: 'Hồ Liên Tâm',
  ngoc_tuyen: 'Ngọc Tuyền',
  cave_heart: 'Tâm Mạch Thạch Linh',
  linh_dai: 'Linh Đài',
  linh_tuyen: 'Linh Tuyền',
  dai_thua_vien: 'Đại Thừa Viện',
  linh_thu_lam: 'Linh Thú Lâm',
  dong_phu: 'Động Phủ Thanh Vân',
  phu_linh_mach: 'Linh Mạch Động Phủ',
  ...Object.fromEntries(FIELD_BANDS.map((b) => [b.id, b.name])),
  ...Object.fromEntries(Object.entries(DUNGEONS).map(([id, d]) => [id, d.name])),
};
