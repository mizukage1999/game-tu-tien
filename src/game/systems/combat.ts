import type { Rng, Vec2 } from '../types';
import realms from '../../data/realms.json';

export function realmIndexAtLevel(level: number) {
  const index = realms.findIndex((realm) => level <= realm.maxLevel);
  return index < 0 ? realms.length - 1 : index;
}

/** Lower realms deal 75%, 50%, then at least 25% damage into a higher realm. */
export function realmDamageMultiplier(attacker = 0, defender = 0) {
  return Math.max(0.25, 1 - Math.max(0, Math.floor(defender) - Math.floor(attacker)) * 0.25);
}

export interface DamageInput {
  atk: number;
  def: number;
  multiplier: number;
  critRate?: number;
  critMul?: number;
  rng?: Rng;
  attackerRealm?: number;
  defenderRealm?: number;
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
  attackerRealm,
  defenderRealm,
}: DamageInput): DamageResult {
  const variance = 0.9 + rng() * 0.2;
  const crit = rng() < critRate;
  const raw = atk * multiplier * variance * (crit ? critMul : 1);
  const mitigated = raw * (100 / (100 + Math.max(0, def) * 1.5));
  const advantage =
    attackerRealm === undefined || defenderRealm === undefined
      ? 1
      : realmDamageMultiplier(attackerRealm, defenderRealm);
  return { amount: Math.max(1, Math.round(mitigated * advantage)), crit };
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
