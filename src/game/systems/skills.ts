import { SKILLS, type SkillBonus, type SkillDef, type SkillId } from '../../data';
import type { PlayerSave } from './save';

export const DASH_SKILL: SkillId = 'than_phap';
export const DEFAULT_LOADOUT: SkillId[] = ['basic', 'bang_tam_tram', 'phi_kiem', 'han_bang_tran'];
export function skillLoadout(p: PlayerSave): SkillId[] {
  const selected: SkillId[] = [
    'basic',
    ...(p.skillLoadout ?? DEFAULT_LOADOUT).filter(
      (id, i, a) =>
        id !== 'basic' &&
        id !== DASH_SKILL &&
        SKILLS[id] &&
        a.indexOf(id) === i &&
        skillUnlocked(p, id),
    ),
  ];
  for (const id of DEFAULT_LOADOUT)
    if (selected.length < 4 && !selected.includes(id)) selected.push(id);
  return selected.slice(0, 4);
}
export function skillUnlocked(p: PlayerSave, id: SkillId) {
  return skillLockReason(p, id) === null;
}
export function skillLockReason(p: PlayerSave, id: SkillId): string | null {
  const sk = SKILLS[id];
  if (!sk) return 'Không có kỹ năng này.';
  if (sk.character && sk.character !== (p.sex ?? 'female')) return 'Tuyệt kỹ riêng của Vương Lâm.';
  if (p.level < (sk.unlockLevel ?? 1)) return `Mở ở Lv.${sk.unlockLevel}`;
  if (sk.secret && !p.adventure?.learnedSecrets.includes(id)) return 'Học bí thuật từ trưởng lão trong mục Tông Môn.';
  return null;
}
export function chooseSkill(p: PlayerSave, slot: number, id: SkillId): PlayerSave | null {
  if (
    !Number.isInteger(slot) ||
    slot < 1 ||
    slot > 3 ||
    id === 'basic' ||
    id === DASH_SKILL ||
    !skillUnlocked(p, id)
  )
    return null;
  const slots = skillLoadout(p),
    old = slots.indexOf(id);
  if (old >= 0) [slots[old], slots[slot]] = [slots[slot], slots[old]];
  else slots[slot] = id;
  return { ...p, skillLoadout: slots };
}

export const SKILL_MAX_LEVEL = 10;
export const SKILL_BONUS_LEVEL = 5;

export type SkillLevels = Partial<Record<SkillId, number>>;

export interface EffectiveSkill extends SkillDef {
  level: number;
  /** Null until the skill reaches SKILL_BONUS_LEVEL. */
  active: SkillBonus | null;
}

export function skillLevel(levels: SkillLevels | undefined, id: SkillId): number {
  return Math.min(SKILL_MAX_LEVEL, Math.max(1, levels?.[id] ?? 1));
}

export function effectiveSkill(
  id: SkillId,
  level: number,
  defs: Record<SkillId, SkillDef> = SKILLS,
): EffectiveSkill {
  const def = defs[id];
  const steps = level - 1;
  const g = def.growth ?? {};
  return {
    ...def,
    level,
    multiplier: Math.round(def.multiplier * (1 + (g.multiplier ?? 0) * steps) * 100) / 100,
    cooldownMs: Math.round(def.cooldownMs * (1 + (g.cooldown ?? 0) * steps)),
    range: Math.round(def.range * (1 + (g.range ?? 0) * steps)),
    active: level >= SKILL_BONUS_LEVEL ? def.bonus : null,
  };
}

export interface UpgradeCost {
  linhKhi: number;
  linhThach: number;
  kiemPho: number;
  reqLevel: number;
}

/** Cost to go from `level` to `level + 1`, or null at max level. */
export function upgradeCost(level: number): UpgradeCost | null {
  if (level >= SKILL_MAX_LEVEL) return null;
  return {
    linhKhi: Math.round(80 * level ** 1.6),
    linhThach: level,
    kiemPho: Math.max(0, level - 3),
    reqLevel: level * 2,
  };
}

export interface Wallet {
  linhKhi: number;
  linhThach: number;
  kiemPho: number;
}

export type UpgradeCheck =
  { ok: true; cost: UpgradeCost } | { ok: false; reason: string; cost: UpgradeCost | null };

export function checkUpgrade(level: number, playerLevel: number, wallet: Wallet): UpgradeCheck {
  const cost = upgradeCost(level);
  if (!cost) return { ok: false, reason: 'Kỹ năng đã đạt cấp tối đa.', cost };
  if (playerLevel < cost.reqLevel)
    return { ok: false, reason: `Cần Lv.${cost.reqLevel} trước khi nâng kỹ năng.`, cost };
  if (wallet.linhKhi < cost.linhKhi) return { ok: false, reason: 'Không đủ Linh Khí.', cost };
  if (wallet.linhThach < cost.linhThach) return { ok: false, reason: 'Không đủ Linh Thạch.', cost };
  if (wallet.kiemPho < cost.kiemPho)
    return { ok: false, reason: 'Không đủ Kiếm Phổ Tàn Trang.', cost };
  return { ok: true, cost };
}
