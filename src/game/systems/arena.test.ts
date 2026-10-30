import { describe, it, expect } from 'vitest';
import { ArenaEngine, validArenaInput, validateArenaSnapshot } from './arena';
import { buildDuelist } from './duel';
import { newPlayer } from '../../store/gameStore';
import { playerStats } from './progression';
import type { SkillId } from '../../data';
import { adventure } from './adventure';

function match(loadout: SkillId[] = ['basic', 'ly_mo_uyen_1', 'ly_mo_uyen_3']) {
  const p = {
      ...newPlayer(),
      level: 10,
      skillLoadout: loadout,
      adventure: {
        ...adventure(newPlayer()),
        learnedSecrets: ['loi_kich', 'phong_nhan'] as SkillId[],
      },
    },
    a = buildDuelist(p, playerStats(p), 'Luyện Khí', 'a'),
    b = { ...a, userId: 'b', name: 'B' };
  const e = new ArenaEngine('test', a, b);
  e.start();
  for (let n = 0; n < 30; n++) e.step(100);
  return e;
}
function step(e: ArenaEngine, ms: number) {
  for (let n = 0; n < ms / 50; n++) e.step(50);
}
describe('manual PK arena', () => {
  it('buffers a tap shortly before cooldown expiry without spending MP early or casting twice',()=>{
    const e=match(),a=e.state.fighters[0];
    a.cooldowns.ly_mo_uyen_3=e.state.elapsed+150;
    e.input('a',{seq:1,x:0,y:0,cast:'ly_mo_uyen_3'});e.step(50);
    expect(a.shield).toBe(0);e.step(50);expect(a.shield).toBe(0);e.step(50);
    expect(a.shield).toBeGreaterThan(0);expect(e.state.effects.filter(f=>f.skill==='ly_mo_uyen_3')).toHaveLength(1);
    e.step(100);expect(e.state.effects.filter(f=>f.skill==='ly_mo_uyen_3')).toHaveLength(1);
  });
  it('does not deal automatic damage when nobody presses an attack', () => {
    const e = match(),
      before = e.state.fighters.map((p) => p.hp);
    step(e, 10000);
    expect(e.state.phase).toBe('fighting');
    expect(e.state.fighters.map((p) => p.hp)).toEqual(before);
  });
  it('resolves a manual attack after windup, with cooldown and sequence replay protection', () => {
    const e = match(),
      [a, b] = e.state.fighters;
    a.x = 200;
    b.x = 250;
    const before = b.hp;
    e.input('a', { seq: 1, x: 0, y: 0, cast: 'basic' });
    e.step(50);
    expect(b.hp).toBe(before);
    step(e, 200);
    expect(b.hp).toBeLessThan(before);
    const after = b.hp;
    expect(e.input('a', { seq: 1, x: 0, y: 0, cast: 'basic' })).toBe(false);
    e.input('a', { seq: 2, x: 0, y: 0, cast: 'basic' });
    step(e, 200);
    expect(b.hp).toBe(after);
  });
  it('lets movement dodge a telegraphed line attack', () => {
    const e = match(['basic', 'ly_mo_uyen_1', 'ly_mo_uyen_3']),
      [a, b] = e.state.fighters;
    a.x = 200;
    b.x = 360;
    a.dx = 1;
    a.dy = 0;
    const before = b.hp;
    e.input('a', { seq: 1, x: 0, y: 0, cast: 'ly_mo_uyen_1' });
    e.input('b', { seq: 1, x: 0, y: -1, cast: null });
    e.step(50);
    expect(e.state.effects.some((e) => e.skill === 'ly_mo_uyen_1')).toBe(true);
    step(e, 550);
    expect(b.y).toBeLessThan(150);
    expect(b.hp).toBe(before);
  });
  it('rejects malformed input and limits movement even with a huge frame delta', () => {
    const e = match(),
      a = e.state.fighters[0],
      x = a.x;
    expect(validArenaInput({ seq: 0, x: NaN, y: 0, cast: null })).toBe(false);
    expect(validArenaInput({ seq: 0, x: 2, y: 0, cast: null })).toBe(false);
    e.input('a', { seq: 1, x: 1, y: 0, cast: null });
    e.step(100000);
    expect(a.x - x).toBeLessThanOrEqual(24);
    step(e, 1200);
    const stopped = a.x;
    step(e, 1200);
    expect(a.x).toBe(stopped);
  });
  it('cannot cast a fifth skill outside the chosen loadout', () => {
    const e = match(),
      a = e.state.fighters[0],
      mp = a.mp;
    e.input('a', { seq: 1, x: 0, y: 0, cast: 'hoa_lien' });
    e.step(50);
    expect(a.mp).toBe(mp);
    expect(e.state.effects).toHaveLength(0);
  });
  it('absorbs damage with a manually cast shield', () => {
    const e = match(),
      [a, b] = e.state.fighters;
    a.x = 200;
    b.x = 250;
    const before = b.hp;
    e.input('b', { seq: 1, x: 0, y: 0, cast: 'ly_mo_uyen_3' });
    e.step(50);
    expect(b.shield).toBeGreaterThan(0);
    e.input('a', { seq: 1, x: 0, y: 0, cast: 'basic' });
    step(e, 250);
    expect(b.hp).toBe(before);
    expect(b.shield).toBeLessThan(b.maxHp * 0.35);
  });
  it('ends a tie fairly and handles surrender without simulating a fight', () => {
    const e = match();
    e.state.remaining = 50;
    e.step(50);
    expect(e.state.phase).toBe('finished');
    expect(e.state.winner).toBeNull();
    const next = match();
    next.forfeit('a');
    expect(next.state.winner).toBe('b');
  });
  it('validates network snapshots and keeps health changes in engine snapshots', () => {
    const e = match(),
      s = e.snapshot();
    expect(validateArenaSnapshot(s, 'test')).toBe(true);
    expect(validateArenaSnapshot(s, 'another')).toBe(false);
    expect(
      validateArenaSnapshot(
        { ...s, fighters: [{ ...s.fighters[0], level: {} }, s.fighters[1]] },
        'test',
      ),
    ).toBe(false);
    expect(
      validateArenaSnapshot(
        { ...s, fighters: [{ ...s.fighters[0], loadout: [{ toString: {} }] }, s.fighters[1]] },
        'test',
      ),
    ).toBe(false);
    expect(validArenaInput({ seq: 1, x: 0, y: 0, cast: 'constructor' })).toBe(false);
    s.fighters[0].hp = Infinity;
    expect(validateArenaSnapshot(s, 'test')).toBe(false);
    expect(Number.isFinite(e.state.fighters[0].hp)).toBe(true);
  });
});
