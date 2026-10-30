import { expect, it } from 'vitest';
import { activityPlan, ACTIVITY_PERIOD, ruinRooms } from './worldActivities';
import { ancientRuins } from '../maps/ancientRuins';
import { findPath } from './path';
it('shares the same scheduled event between clients and respects exact closing boundaries', () => {
  const now = Date.UTC(2026, 9, 30, 17),
    a = activityPlan('treasure', now);
  expect(a.open).toBe(true);
  expect(activityPlan('treasure', now + 1499999).id).toBe(a.id);
  expect(activityPlan('treasure', now + 1500000).open).toBe(false);
  expect(activityPlan('treasure', now + ACTIVITY_PERIOD).id).not.toBe(a.id);
  expect(activityPlan('ruins', now).open).toBe(false);
  expect(activityPlan('ruins', now + 3600000).open).toBe(true);
});
it('builds varying mazes with reachable switches, treasure, exit and boss for every tested opening', () => {
  const layouts = new Set<string>();
  for (let n = 0; n < 60; n++) {
    const seed = 1790000000 + n * 10800,
      r = ruinRooms(seed),
      m = ancientRuins(seed);
    layouts.add(JSON.stringify(r.edges));
    expect(r.edges).toHaveLength(23);
    for (const p of [...m.points!, ...m.monsters]) {
      expect(m.blocked[p.y][p.x]).toBe(false);
      expect(findPath(m.blocked, 3, 3, p.x, p.y, 0).reached).toBe(true);
    }
  }
  expect(layouts.size).toBeGreaterThan(55);
});
