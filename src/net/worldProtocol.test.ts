import { describe, it, expect } from 'vitest';
import { mayPk, parseWorldEvent, parseCombatStats } from './worldProtocol';
import { applyPose, shouldPublish, parseRemote } from './presence';
describe('world multiplayer protocol', () => {
  it('allows only the chosen PK modes and protects the opening children', () => {
    expect(mayPk({ mode: 'peace', sect: 'a' }, { sect: 'b' })).toBe(false);
    expect(mayPk({ mode: 'sect', sect: 'a' }, { sect: 'a' })).toBe(false);
    expect(mayPk({ mode: 'sect', sect: 'a' }, { sect: 'b' })).toBe(true);
    expect(mayPk({ mode: 'all', sect: 'a' }, { sect: 'a' })).toBe(true);
    expect(mayPk({ mode: 'all' }, { child: true })).toBe(false);
    expect(mayPk({ mode: 'all', child: true }, {})).toBe(false);
  });
  it('sends and applies changes in flight, eight-direction facing and HP while stationary', () => {
    const p = parseRemote('b', { user_id: 'b', x: 100, y: 200, dir: 'up', moving: false }, 0)!;
    const pose = {
      x: 100,
      y: 200,
      dir: 'up' as const,
      visualDir: 'up-left' as const,
      dx: -0.7071,
      dy: -0.7071,
      moving: false,
      mount: 'sword' as const,
      showMount: true,
      pkMode: 'all' as const,
    };
    expect(shouldPublish(p, pose, 100)).toBe(true);
    const next = applyPose([p], { key: 'b', ...pose }, 100)[0];
    expect(next.mount).toBe('sword');
    expect(next.visualDir).toBe('up-left');
    expect(next.pkMode).toBe('all');
    expect(applyPose([next], { key: 'b', ...pose, mount: null }, 200)[0].mount).toBeNull();
  });
  it('rejects malformed attacks, invalid monster HP and oversized chat packets', () => {
    const cast = { t: 'cast', seq: 1, skill: 'basic', x: 100, y: 100, dx: 1, dy: 0, combo: 1 };
    expect(parseWorldEvent(cast)).toEqual(cast);
    expect(parseWorldEvent({ ...cast, dx: NaN })).toBeNull();
    expect(parseWorldEvent({ ...cast, skill: '__proto__' })).toBeNull();
    expect(
      parseWorldEvent({ t: 'near-chat', id: '1', text: 'x'.repeat(201), x: 10, y: 10 }),
    ).toBeNull();
    expect(parseWorldEvent({ t: 'monsters', seq: 1, monsters: [{ id: 'x', hp: -1 }] })).toBeNull();
    expect(parseCombatStats({ hp: 1, maxHp: 0 })).toBeUndefined();
  });
});
