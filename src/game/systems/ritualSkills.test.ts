import { afterEach, expect, it, vi } from 'vitest';
import { ArenaEngine } from './arena';
import { newPlayer } from '../../store/gameStore';
import { playerStats } from './progression';
import { buildDuelist } from './duel';
import { chooseSkill, skillLoadout } from './skills';
import { serialize, deserialize } from './save';
import { soulDrain } from './ritualSkills';
import type { SkillId } from '../../data';

afterEach(() => vi.restoreAllMocks());
const advance = (e: ArenaEngine, ms: number) => {
  for (let i = 0; i < ms / 50; i++) e.step(50);
};
function arena(id: SkillId) {
  const p = {
    ...newPlayer({ sex: 'male' }),
    heroId: 'wang_lam' as const,
    level: 99,
    admitted: true,
  };
  const chosen = chooseSkill(p, 1, id)!;
  const duel = {
    ...buildDuelist(chosen, playerStats(chosen), 'Khuy Niết', 'a'),
    atk: 100,
    maxHp: 10000,
    maxMp: 2000,
    def: 200,
  };
  const e = new ArenaEngine('ritual', duel, { ...duel, userId: 'b' });
  e.start();
  advance(e, 3000);
  Object.assign(e.state.fighters[0], { x: 160, y: 200 });
  Object.assign(e.state.fighters[1], { x: 300, y: 200 });
  return e;
}
it('assigns, saves and restores both new arts while preserving the six combat slots', () => {
  for (const id of ['tich_diet_chi', 'luyen_hon_thuat'] as const) {
    const p = chooseSkill({ ...newPlayer({ sex: 'male' }), level: 99 }, 2, id)!;
    const restored = deserialize(
      serialize({ player: p, quests: {}, mapId: 'rung_linh_thu', pos: null }),
    )!;
    expect(skillLoadout(restored.player)[2]).toBe(id);
    expect(skillLoadout(restored.player)).toHaveLength(7);
    expect(chooseSkill({ ...p, heroId: 'hong_lien' }, 2, id)).toBeNull();
  }
});
it('pierces half the armor, spends MP once, applies a chance stun and can be dodged', () => {
  vi.spyOn(Math, 'random').mockReturnValue(0.1);
  const e = arena('tich_diet_chi'),
    [a, b] = e.state.fighters;
  e.input('a', { seq: 1, x: 0, y: 0, cast: 'tich_diet_chi' });
  advance(e, 650);
  expect(b.maxHp - b.hp).toBe(405);
  expect(b.rootUntil).toBeGreaterThan(e.state.elapsed);
  expect(a.mp).toBeLessThan(1800);
  const hp = b.hp;
  e.input('a', { seq: 2, x: 0, y: 0, cast: 'tich_diet_chi' });
  advance(e, 500);
  expect(b.hp).toBe(hp);
  const dodge = arena('tich_diet_chi');
  dodge.input('a', { seq: 1, x: 0, y: 0, cast: 'tich_diet_chi' });
  dodge.input('b', { seq: 1, x: 0, y: -1, cast: null });
  advance(dodge, 700);
  expect(dodge.state.fighters[1].hp).toBe(dodge.state.fighters[1].maxHp);
});
it('ticks the banner six times, heals only health damage and stops when the zone ends', () => {
  const e = arena('luyen_hon_thuat'),
    [a, b] = e.state.fighters;
  a.hp = 5000;
  b.def = 0;
  e.input('a', { seq: 1, x: 0, y: 0, cast: 'luyen_hon_thuat' });
  advance(e, 3700);
  expect(b.maxHp - b.hp).toBe(330);
  expect(a.hp).toBe(5066);
  expect(b.weakenUntil).toBeGreaterThan(e.state.elapsed);
  const hp = b.hp;
  advance(e, 1000);
  expect(b.hp).toBe(hp);
  expect(e.state.effects).toHaveLength(0);
  const shielded = arena('luyen_hon_thuat'),
    [c, d] = shielded.state.fighters;
  c.hp = 5000;
  d.shield = 10000;
  d.shieldUntil = 99999;
  shielded.input('a', { seq: 1, x: 0, y: 0, cast: 'luyen_hon_thuat' });
  advance(shielded, 3700);
  expect(c.hp).toBe(5000);
  expect(d.hp).toBe(d.maxHp);
  expect(soulDrain(100000, 10000)).toBe(200);
  expect(soulDrain(0, 10000)).toBe(0);
});
