import type { Rng, Vec2 } from '../types';

export interface DamageInput {
  atk: number;
  def: number;
  multiplier: number;
  critRate?: number;
  critMul?: number;
  rng?: Rng;
}

export interface DamageResult {
  amount: number;
  crit: boolean;
}

export function computeDamage({
  atk,
  def,
  multiplier,
  critRate = 0,
  critMul = 1.5,
  rng = Math.random,
}: DamageInput): DamageResult {
  const variance = 0.9 + rng() * 0.2;
  const crit = rng() < critRate;
  const raw = atk * multiplier * variance * (crit ? critMul : 1);
  const mitigated = raw * (100 / (100 + Math.max(0, def) * 1.5));
  return { amount: Math.max(1, Math.round(mitigated)), crit };
}

/** True if `target` lies within `range` of `origin` and inside a cone of `arcDeg` around `facing`. */
export function inAttackArc(
  origin: Vec2,
  facing: Vec2,
  target: Vec2,
  range: number,
  arcDeg: number,
  targetRadius = 0,
): boolean {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const d = Math.hypot(dx, dy);
  if (d - targetRadius > range) return false;
  if (arcDeg >= 360 || d < 1) return true;
  const fl = Math.hypot(facing.x, facing.y) || 1;
  const cos = (dx * facing.x + dy * facing.y) / (d * fl);
  return cos >= Math.cos(((arcDeg / 2) * Math.PI) / 180);
}
