import { SKILLS, type SkillBonus, type SkillDef, type SkillId } from '../../data';

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

export function effectiveSkill(id: SkillId, level: number, defs: Record<SkillId, SkillDef> = SKILLS): EffectiveSkill {
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

export type UpgradeCheck = { ok: true; cost: UpgradeCost } | { ok: false; reason: string; cost: UpgradeCost | null };

export function checkUpgrade(level: number, playerLevel: number, wallet: Wallet): UpgradeCheck {
  const cost = upgradeCost(level);
  if (!cost) return { ok: false, reason: 'Kỹ năng đã đạt cấp tối đa.', cost };
  if (playerLevel < cost.reqLevel) return { ok: false, reason: `Cần đạt cấp nhân vật ${cost.reqLevel}.`, cost };
  if (wallet.linhKhi < cost.linhKhi) return { ok: false, reason: 'Không đủ Linh Khí.', cost };
  if (wallet.linhThach < cost.linhThach) return { ok: false, reason: 'Không đủ Linh Thạch.', cost };
  if (wallet.kiemPho < cost.kiemPho) return { ok: false, reason: 'Không đủ Kiếm Phổ Tàn Trang.', cost };
  return { ok: true, cost };
}
