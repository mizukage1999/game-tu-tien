import { ITEMS, REALMS, type RealmDef } from '../../data';
import type { PlayerSave } from './save';
import { companionStats, lifeProgress } from './life';

export interface ProgressState {
  level: number;
  exp: number;
  realmIndex: number;
}

export interface DerivedStats {
  maxHp: number;
  maxMp: number;
  atk: number;
  def: number;
  critRate: number;
  critMul: number;
  speed: number;
}

export function expToNext(level: number): number {
  return Math.round(60 + 28 * Math.pow(level, 1.35));
}

export function realmFor(index: number): RealmDef {
  return REALMS[Math.max(0, Math.min(index, REALMS.length - 1))];
}

export function realmNameAtLevel(level: number): string {
  const realm = REALMS.find((entry) => level <= entry.maxLevel) ?? REALMS[REALMS.length - 1];
  const levelInRealm = Math.max(0, Math.min(9, level - realm.minLevel));
  const phase = levelInRealm <= 2 ? 'Sơ Kỳ' : levelInRealm <= 5 ? 'Trung Kỳ' : 'Hậu Kỳ';
  return `${realm.name} ${phase}${levelInRealm === 9 ? ' Đại Viên Mãn' : ''}`;
}

export function isBottleneck(s: ProgressState): boolean {
  const realm = realmFor(s.realmIndex);
  return s.level >= realm.maxLevel && realm.breakthrough !== null;
}

export interface ExpResult {
  levelsGained: number;
  /** True when exp is full but a breakthrough is required to continue. */
  bottleneck: boolean;
}

/** Mutates `s`. Exp beyond a realm cap is stored up to one full bar. */
export function addExp(s: ProgressState, amount: number): ExpResult {
  let levelsGained = 0;
  s.exp += Math.max(0, Math.round(amount));
  while (s.exp >= expToNext(s.level)) {
    if (isBottleneck(s)) {
      s.exp = expToNext(s.level);
      return { levelsGained, bottleneck: true };
    }
    s.exp -= expToNext(s.level);
    s.level += 1;
    levelsGained += 1;
  }
  return { levelsGained, bottleneck: false };
}

export type BreakthroughCheck =
  | { ok: true; cost: { linhKhi: number; linhThach: number } }
  | { ok: false; reason: string };

export function checkBreakthrough(
  s: ProgressState,
  linhKhi: number,
  linhThach: number,
): BreakthroughCheck {
  const realm = realmFor(s.realmIndex);
  if (!realm.breakthrough) return { ok: false, reason: 'Đã đạt cảnh giới tối cao của bản demo.' };
  if (s.level < realm.maxLevel || s.exp < expToNext(s.level))
    return { ok: false, reason: `Cần đạt ${realm.name} đại viên mãn và đầy tu vi.` };
  const cost = realm.breakthrough;
  if (linhKhi < cost.linhKhi) return { ok: false, reason: `Thiếu Linh Khí (${linhKhi}/${cost.linhKhi}).` };
  if (linhThach < cost.linhThach)
    return { ok: false, reason: `Thiếu Linh Thạch (${linhThach}/${cost.linhThach}).` };
  return { ok: true, cost };
}

/** Mutates `s` after costs were paid. */
export function applyBreakthrough(s: ProgressState) {
  s.realmIndex += 1;
  s.level += 1;
  s.exp = 0;
}

export type EquipCheck = { ok: true } | { ok: false; reason: string };

export function canEquip(itemId: string, level: number): EquipCheck {
  const def = ITEMS[itemId];
  if (def?.slot !== 'weapon') return { ok: false, reason: 'Chỉ có thể cầm vũ khí. Trang phục không dùng ô trang bị.' };
  const req = def.reqLevel ?? 1;
  if (level < req) return { ok: false, reason: `Cần đạt ${realmNameAtLevel(req)} để cầm ${def.name}.` };
  return { ok: true };
}

export function computeStats(
  level: number,
  realmIndex: number,
  equipment: Record<string, string | undefined>,
): DerivedStats {
  const statRealmIndex = Math.min(realmIndex + (level > 0 && level % 10 === 0 ? 1 : 0), REALMS.length - 1);
  const mul = realmFor(statRealmIndex).statMul;
  const stats: DerivedStats = {
    maxHp: Math.round((300 + 42 * level) * mul),
    maxMp: Math.round((120 + 12 * level) * mul),
    atk: Math.round((30 + 6 * level) * mul),
    def: Math.round((8 + 2.2 * level) * mul),
    critRate: 0.15,
    critMul: 1.8,
    speed: 190,
  };
  for (const itemId of [equipment.weapon]) {
    const bonus = itemId ? ITEMS[itemId]?.bonus : undefined;
    if (!bonus) continue;
    stats.atk += bonus.atk ?? 0;
    stats.def += bonus.def ?? 0;
    stats.maxHp += bonus.hp ?? 0;
  }
  return stats;
}

export function playerStats(p: PlayerSave) {
  const stats=computeStats(p.level,p.realmIndex,p.equipment), pet=companionStats(p);
  stats.atk+=pet.atk;stats.def+=pet.def;stats.maxHp+=pet.hp;
  if(lifeProgress(p).artifact==='phap_bao_ngoc'){stats.def+=12;stats.maxHp+=100;}
  return stats;
}
