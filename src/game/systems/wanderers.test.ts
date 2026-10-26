import { describe, expect, it } from 'vitest';
import { seeded } from '../art/canvas';
import { getMap } from '../maps';
import { REALMS } from '../../data';
import { rollWandererLevel, wandererRealmWeights, wandererRoster } from './wanderers';

describe('map-weighted wandering cultivators', () => {
  it('makes high realms more likely in high maps while retaining rare travelers of every realm', () => {
    const low = { level: { min: 1, max: 10 }, monsters: [] },
      high = { level: { min: 91, max: 99 }, monsters: [] };
    const rng = seeded(412),
      sample = (map: typeof low) => Array.from({ length: 5000 }, () => rollWandererLevel(map, rng));
    const a = sample(low),
      b = sample(high),
      mean = (xs: number[]) => xs.reduce((x, y) => x + y, 0) / xs.length;
    expect(mean(b) - mean(a)).toBeGreaterThan(65);
    expect(b.filter((n) => n >= 81).length).toBeGreaterThan(3700);
    expect(a.filter((n) => n >= 81).length).toBeLessThan(150);
    expect(Math.max(...b)).toBeGreaterThan(110);
    expect([...a, ...b].every((n) => Number.isInteger(n) && n >= 1 && n <= 120)).toBe(true);
    for (const map of [low, high]) expect(wandererRealmWeights(map).every((w) => w > 0)).toBe(true);
  });
  it('can roll every realm including Tịnh Niết and Toái Niết without the old level-100 cap', () => {
    const map = { level: { min: 91, max: 99 }, monsters: [] },
      weights = wandererRealmWeights(map);
    const total = weights.reduce((a, b) => a + b, 0);
    let cumulative = 0;
    REALMS.forEach((realm, i) => {
      const roll = (cumulative + weights[i] / 2) / total;
      let call = 0;
      const level = rollWandererLevel(map, () => (call++ === 0 ? roll : 0.9999));
      expect(level).toBe(realm.maxLevel);
      cumulative += weights[i];
    });
  });
  it('keeps identical identities and combat strength on peers entering the same map', () => {
    const map = getMap('thien_kiep_nhai');
    expect(wandererRoster(map, 107)).toEqual(wandererRoster(map, 107));
    expect(wandererRoster(map, 107).some((n) => n.cultivation >= 81)).toBe(true);
    const liveSeed = [...map.id].reduce((sum, c) => sum + c.charCodeAt(0) * 31, 0);
    expect(wandererRoster(map, liveSeed).some((n) => n.cultivation >= 81)).toBe(true);
  });
});
