import { expect, it } from 'vitest';
import { computeDamage, realmDamageMultiplier, realmIndexAtLevel } from './combat';
import { statsForLevel, statsForWanderer } from './scale';

it('halves damage from Vấn Đỉnh into Dương Thực without weakening the higher realm attack', () => {
  const vanDinh = realmIndexAtLevel(65),
    duongThuc = realmIndexAtLevel(85);
  expect(duongThuc - vanDinh).toBe(2);
  const damage = (attackerRealm: number, defenderRealm: number) =>
    computeDamage({
      atk: 1000,
      def: 0,
      multiplier: 1,
      rng: () => 0.5,
      attackerRealm,
      defenderRealm,
    }).amount;
  expect(damage(vanDinh, vanDinh)).toBe(1000);
  expect(damage(vanDinh, vanDinh + 1)).toBe(750);
  expect(damage(vanDinh, duongThuc)).toBe(500);
  expect(damage(duongThuc, vanDinh)).toBe(1000);
  expect(realmDamageMultiplier(0, 11)).toBe(0.25);
  expect(
    computeDamage({
      atk: 1000,
      def: 0,
      multiplier: 2,
      critRate: 1,
      critMul: 1.8,
      rng: () => 0.5,
      attackerRealm: vanDinh,
      defenderRealm: duongThuc,
    }).amount,
  ).toBe(1800);
});
it('boosts wanderer health, attack and defense by 1.5 without changing their experience reward baseline', () => {
  for (const level of [1, 15, 65, 85, 120]) {
    const old = statsForLevel(level, 0.75),
      upgraded = statsForWanderer(level);
    expect(upgraded.hp).toBe(Math.round(old.hp * 1.5));
    expect(upgraded.atk).toBe(Math.round(old.atk * 1.5));
    expect(upgraded.def).toBe(Math.round(old.def * 1.5));
    expect(upgraded.exp).toBe(old.exp);
  }
});
