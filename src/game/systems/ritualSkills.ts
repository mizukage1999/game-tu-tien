import type { SkillId } from '../../data';

/** Mechanics shared by local maps, the map authority and the manual arena. */
export function ritualSkill(id: SkillId) {
  if (id === 'tich_diet_chi')
    return { windup: 600, armorPierce: 0.5, singleTarget: true, ticks: 1, tickMs: 0 };
  if (id === 'luyen_hon_thuat')
    return { windup: 600, armorPierce: 0.2, singleTarget: false, ticks: 6, tickMs: 600 };
  return undefined;
}
export function ritualControlMs(id: SkillId, rng: () => number = Math.random) {
  return id === 'tich_diet_chi' && rng() < 0.25 ? 350 : 0;
}
export function soulDrain(damage: number, maxHp: number) {
  return Math.max(0, Math.min(Math.floor(damage * 0.2), Math.floor(maxHp * 0.02)));
}
