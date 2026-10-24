import { describe, it, expect } from 'vitest';
import { ArenaEngine, validateArenaSnapshot } from './arena';
import { arenaSteer } from './arenaNavigation';
import { newPlayer } from '../../store/gameStore';
import { buildDuelist } from './duel';
import { playerStats } from './progression';
import { chooseSkill, skillLoadout } from './skills';
import { deserialize, serialize } from './save';
import type { SkillId } from '../../data';
import { GridNavigator, gridLineClear } from './gridNavigation';

function arena(id: SkillId) {
  const p = {
    ...newPlayer({ sex: 'male' }),
    skillLoadout: ['basic', id, 'phi_kiem', 'han_bang_tran'] as SkillId[],
  };
  const a = {
    ...buildDuelist(p, playerStats(p), 'Luyện Khí', 'a'),
    maxMp: 1000,
    maxHp: 10000,
    atk: 100,
    def: 0,
  };
  const e = new ArenaEngine('wang', a, { ...a, userId: 'b' });
  e.start();
  for (let i = 0; i < 30; i++) e.step(100);
  e.state.fighters[0].x = 160;
  e.state.fighters[1].x = 300;
  return e;
}
function advance(e: ArenaEngine, ms: number) {
  for (let i = 0; i < ms / 50; i++) e.step(50);
}
describe('Wương Lâm signature skills', () => {
  it('saves all five assignable arts without displacing basic or independent dash', () => {
    let p = newPlayer({ sex: 'male' });
    for (const id of [
      'hoa_ma_chi',
      'dao_hoa_hoang_tuyen',
      'dinh_than_thuat',
      'tram_la_quyet',
      'dich_linh_an',
    ] as SkillId[]) {
      p = chooseSkill(p, 2, id)!;
      const loaded = deserialize(
        serialize({ player: p, quests: {}, mapId: 'dai_thua_vien', pos: null }),
      )!;
      expect(skillLoadout(loaded.player)[2]).toBe(id);
      expect(skillLoadout(loaded.player)).toHaveLength(4);
      expect(skillLoadout(loaded.player)[0]).toBe('basic');
    }
    expect(chooseSkill(newPlayer({ sex: 'female' }), 1, 'hoa_ma_chi')).toBeNull();
  });
  it('roots for one second in PK without damage, then permits movement again', () => {
    const e = arena('dinh_than_thuat'),
      [a, b] = e.state.fighters;
    e.input('a', { seq: 1, x: 0, y: 0, cast: 'dinh_than_thuat' });
    advance(e, 500);
    expect(b.rootUntil).toBeGreaterThan(e.state.elapsed);
    expect(b.hp).toBe(b.maxHp);
    expect(a.mp).toBeLessThan(925);
    const y = b.y;
    e.input('b', { seq: 1, x: 0, y: 1, cast: 'than_phap' });
    advance(e, 400);
    expect(b.y).toBe(y);
    expect(b.cooldowns.than_phap).toBeUndefined();
    advance(e, 700);
    e.input('b', { seq: 2, x: 0, y: 1, cast: null });
    advance(e, 100);
    expect(b.y).toBeGreaterThan(y);
    expect(validateArenaSnapshot(e.snapshot(), 'wang')).toBe(true);
  });
  it('ticks Hoàng Tuyền eight times and stops dealing damage after it fades', () => {
    const e = arena('dao_hoa_hoang_tuyen'),
      [a, b] = e.state.fighters;
    e.input('a', { seq: 1, x: 0, y: 0, cast: 'dao_hoa_hoang_tuyen' });
    advance(e, 500);
    expect(b.hp).toBe(b.maxHp);
    advance(e, 50);
    const first = b.maxHp - b.hp;
    expect(first).toBeGreaterThan(0);
    advance(e, 3550);
    expect(b.maxHp - b.hp).toBe(first * 8);
    const hp = b.hp;
    advance(e, 1000);
    expect(b.hp).toBe(hp);
    expect(a.cooldowns.dao_hoa_hoang_tuyen).toBeGreaterThan(e.state.elapsed);
  });
  it('makes the red beam directional, pierces at range and allows sideways dodging', () => {
    for (const id of ['hoa_ma_chi', 'tram_la_quyet'] as SkillId[]) {
      const e = arena(id),
        b = e.state.fighters[1];
      e.input('a', { seq: 1, x: 0, y: 0, cast: id });
      advance(e, 500);
      expect(b.hp).toBeLessThan(b.maxHp);
      const dodged = arena(id),
        target = dodged.state.fighters[1];
      dodged.input('a', { seq: 1, x: 0, y: 0, cast: id });
      dodged.input('b', { seq: 1, x: 0, y: -1, cast: null });
      advance(dodged, 500);
      expect(target.hp).toBe(target.maxHp);
    }
  });
  it('requires melee distance for the golden palm and applies a light stun', () => {
    const e = arena('dich_linh_an'),
      [a, b] = e.state.fighters;
    b.x = a.x + 80;
    e.input('a', { seq: 1, x: 0, y: 0, cast: 'dich_linh_an' });
    advance(e, 650);
    expect(b.hp).toBeLessThan(b.maxHp);
    expect(b.rootUntil).toBeGreaterThan(e.state.elapsed);
    const far = arena('dich_linh_an');
    far.state.fighters[1].x = 500;
    far.input('a', { seq: 1, x: 0, y: 0, cast: 'dich_linh_an' });
    advance(far, 800);
    expect(far.state.fighters[1].hp).toBe(far.state.fighters[1].maxHp);
  });
});
describe('combat obstacle navigation', () => {
  it('routes the practice opponent around either rock from all four approaches', () => {
    for (const [from, to] of [
      [
        { x: 275, y: 50 },
        { x: 275, y: 200 },
      ],
      [
        { x: 200, y: 120 },
        { x: 350, y: 120 },
      ],
      [
        { x: 445, y: 350 },
        { x: 445, y: 200 },
      ],
      [
        { x: 520, y: 280 },
        { x: 370, y: 280 },
      ],
      [
        { x: 275, y: 157.01 },
        { x: 275, y: 60 },
      ],
      [
        { x: 312.01, y: 120 },
        { x: 210, y: 120 },
      ],
    ]) {
      const e = arena('hoa_ma_chi'),
        bot = e.state.fighters[1];
      Object.assign(bot, from);
      for (let i = 0; i < 200 && Math.hypot(bot.x - to.x, bot.y - to.y) > 10; i++) {
        const v = arenaSteer(bot, to);
        e.input('b', { seq: i + 1, ...v, cast: null });
        e.step(50);
      }
      expect(Math.hypot(bot.x - to.x, bot.y - to.y)).toBeLessThan(10);
    }
  });
  it('routes a world enemy around a wall without clipping its collision body', () => {
    const grid = Array.from({ length: 9 }, (_, y) =>
      Array.from(
        { length: 10 },
        (_, x) => x === 0 || y === 0 || x === 9 || y === 8 || (x === 4 && y < 6),
      ),
    );
    const nav = new GridNavigator(),
      pos = { x: 120, y: 120 },
      goal = { x: 312, y: 120 };
    for (let i = 0; i < 450 && Math.hypot(pos.x - goal.x, pos.y - goal.y) > 6; i++) {
      const v = nav.steer(grid, 48, pos, goal, 100, 50),
        next = { x: pos.x + v.x * 0.05, y: pos.y + v.y * 0.05 };
      expect(gridLineClear(grid, 48, pos, next), JSON.stringify({ i, pos, next, v })).toBe(true);
      Object.assign(pos, next);
    }
    expect(Math.hypot(pos.x - goal.x, pos.y - goal.y)).toBeLessThan(6);
  });
});
