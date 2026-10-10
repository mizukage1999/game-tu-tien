import monstersJson from './monsters.json';
import itemsJson from './items.json';
import skillsJson from './skills.json';
import realmsJson from './realms.json';
import questsJson from './quests.json';
import npcsJson from './npcs.json';
import equipmentJson from './equipment.json';

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
  | { type: 'meditate'; zone: string; count: number };

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
  shop?: ShopOffer[];
  /** Also sells every generated equipment piece. */
  equipmentShop?: boolean;
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
        reqLevel: r.reqLevel,
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

export const MONSTERS = monstersJson as unknown as Record<string, MonsterDef>;
export const ITEMS: Record<string, ItemDef> = { ...(itemsJson as unknown as Record<string, ItemDef>), ...buildEquipment() };
export const SKILLS = skillsJson as unknown as Record<SkillId, SkillDef>;
export const REALMS = realmsJson as unknown as RealmDef[];
export const QUESTS = questsJson as unknown as Record<string, QuestDef>;
export const NPCS: Record<string, NpcDef> = Object.fromEntries(
  Object.entries(npcsJson as unknown as Record<string, NpcDef>).map(([id, n]) => [
    id,
    n.equipmentShop ? { ...n, shop: [...(n.shop ?? []), ...equipmentOffers()] } : n,
  ]),
);

export const ZONE_NAMES: Record<string, string> = {
  linh_dai: 'Linh Đài',
  linh_tuyen: 'Linh Tuyền',
  dai_thua_vien: 'Đại Thừa Viện',
  linh_thu_lam: 'Linh Thú Lâm',
};
