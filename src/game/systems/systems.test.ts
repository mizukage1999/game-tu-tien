import { describe, expect, it } from 'vitest';
import { computeDamage, inAttackArc } from './combat';
import { createBrain, provoke, stepMonsterAI, type AIParams } from './monsterAI';
import { canAct, canBeHit, createLife, knockDown, tickLife, DOWNED_DURATION_MS } from './respawn';
import { rollLoot } from './loot';
import { addExp, applyBreakthrough, checkBreakthrough, computeStats, expToNext } from './progression';
import { acceptQuest, applyEvent, availableQuests, completeQuest, turnInQuests } from './quest';
import { meditateGain, zoneAt } from './cultivation';
import { deserialize, serialize } from './save';
import { QUESTS, type QuestDef } from '../../data';

const fixed = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe('combat', () => {
  it('reduces damage by defence and never goes below 1', () => {
    const low = computeDamage({ atk: 100, def: 0, multiplier: 1, rng: fixed(0.5, 0.99) });
    const high = computeDamage({ atk: 100, def: 100, multiplier: 1, rng: fixed(0.5, 0.99) });
    expect(low.amount).toBe(100);
    expect(high.amount).toBeLessThan(low.amount);
    expect(computeDamage({ atk: 1, def: 9999, multiplier: 1, rng: fixed(0) }).amount).toBe(1);
  });

  it('applies crits', () => {
    const r = computeDamage({ atk: 100, def: 0, multiplier: 1, critRate: 1, critMul: 2, rng: fixed(0.5, 0) });
    expect(r.crit).toBe(true);
    expect(r.amount).toBe(200);
  });

  it('checks attack cones', () => {
    const o = { x: 0, y: 0 };
    const right = { x: 1, y: 0 };
    expect(inAttackArc(o, right, { x: 50, y: 0 }, 60, 90)).toBe(true);
    expect(inAttackArc(o, right, { x: -50, y: 0 }, 60, 90)).toBe(false);
    expect(inAttackArc(o, right, { x: 100, y: 0 }, 60, 90)).toBe(false);
    expect(inAttackArc(o, right, { x: -50, y: 0 }, 60, 360)).toBe(true);
  });
});

describe('monster AI', () => {
  const p: AIParams = { speed: 100, aggroRadius: 150, attackRange: 50, attackInterval: 1000, leashRadius: 400 };

  it('chases a player inside aggro range and attacks on an interval', () => {
    const brain = createBrain({ x: 0, y: 0 });
    stepMonsterAI(brain, p, { pos: { x: 0, y: 0 }, player: { x: 100, y: 0 }, dt: 16 });
    expect(brain.state).toBe('chase');
    const chase = stepMonsterAI(brain, p, { pos: { x: 0, y: 0 }, player: { x: 100, y: 0 }, dt: 16 });
    expect(chase.velocity.x).toBeGreaterThan(0);

    stepMonsterAI(brain, p, { pos: { x: 70, y: 0 }, player: { x: 100, y: 0 }, dt: 16 });
    expect(brain.state).toBe('attack');
    const first = stepMonsterAI(brain, p, { pos: { x: 70, y: 0 }, player: { x: 100, y: 0 }, dt: 16 });
    expect(first.attack).toBe(true);
    const tooSoon = stepMonsterAI(brain, p, { pos: { x: 70, y: 0 }, player: { x: 100, y: 0 }, dt: 500 });
    expect(tooSoon.attack).toBe(false);
    const again = stepMonsterAI(brain, p, { pos: { x: 70, y: 0 }, player: { x: 100, y: 0 }, dt: 600 });
    expect(again.attack).toBe(true);
  });

  it('returns home when the player is downed or leashed', () => {
    const brain = createBrain({ x: 0, y: 0 });
    brain.state = 'attack';
    stepMonsterAI(brain, p, { pos: { x: 40, y: 0 }, player: null, dt: 16 });
    expect(brain.state).toBe('return');

    const b2 = createBrain({ x: 0, y: 0 });
    b2.state = 'chase';
    stepMonsterAI(b2, p, { pos: { x: 500, y: 0 }, player: { x: 520, y: 0 }, dt: 16 });
    expect(b2.state).toBe('return');
  });

  it('is provoked by damage even outside aggro range', () => {
    const brain = createBrain({ x: 0, y: 0 });
    provoke(brain);
    expect(brain.state).toBe('chase');
    stepMonsterAI(brain, p, { pos: { x: 0, y: 0 }, player: { x: 280, y: 0 }, dt: 16 });
    expect(brain.state).toBe('chase');
  });
});

describe('downed state', () => {
  it('blocks actions for 2.5s, then revives with invulnerability', () => {
    const life = createLife();
    knockDown(life);
    expect(canAct(life)).toBe(false);
    expect(canBeHit(life)).toBe(false);
    expect(tickLife(life, DOWNED_DURATION_MS - 1)).toBe(false);
    expect(tickLife(life, 1)).toBe(true);
    expect(canAct(life)).toBe(true);
    expect(canBeHit(life)).toBe(false);
    tickLife(life, 5000);
    expect(canBeHit(life)).toBe(true);
  });
});

describe('loot', () => {
  it('rolls each entry independently', () => {
    const table = [
      { item: 'linh_khi', qty: [10, 30] as [number, number], chance: 0.8 },
      { item: 'linh_thach', qty: [1, 1] as [number, number], chance: 0.35 },
    ];
    expect(rollLoot(table, fixed(0.1, 0, 0.1, 0))).toEqual([
      { item: 'linh_khi', qty: 10 },
      { item: 'linh_thach', qty: 1 },
    ]);
    expect(rollLoot(table, fixed(0.99))).toEqual([]);
  });
});

describe('progression', () => {
  it('levels up and stops at the realm bottleneck', () => {
    const s = { level: 1, exp: 0, realmIndex: 0 };
    const r = addExp(s, expToNext(1) + 5);
    expect(r.levelsGained).toBe(1);
    expect(s.exp).toBe(5);

    const capped = { level: 9, exp: 0, realmIndex: 0 };
    const res = addExp(capped, 999999);
    expect(res.bottleneck).toBe(true);
    expect(capped.level).toBe(9);
    expect(capped.exp).toBe(expToNext(9));
  });

  it('requires resources to break through', () => {
    const s = { level: 9, exp: expToNext(9), realmIndex: 0 };
    expect(checkBreakthrough(s, 0, 0).ok).toBe(false);
    const ok = checkBreakthrough(s, 10000, 100);
    expect(ok.ok).toBe(true);
    applyBreakthrough(s);
    expect(s).toEqual({ level: 10, exp: 0, realmIndex: 1 });
  });

  it('adds equipment bonuses', () => {
    const base = computeStats(5, 0, {});
    const ringed = computeStats(5, 0, { ring: 'nhan_bac' });
    expect(ringed.atk).toBe(base.atk + 8);
  });
});

describe('quests', () => {
  const defs: Record<string, QuestDef> = {
    a: { kind: 'main', name: 'A', desc: '', objectives: [{ type: 'kill', target: 'x', count: 2 }], turnIn: 'npc', giver: 'npc', rewards: {} },
    b: { kind: 'main', name: 'B', desc: '', giver: 'npc', requires: 'a', objectives: [{ type: 'reachLevel', count: 3 }], rewards: {} },
  };

  it('tracks kills until ready, then turns in', () => {
    let log = acceptQuest({}, defs, 'a', { level: 1 });
    log = applyEvent(log, defs, { type: 'kill', target: 'x' }).log;
    expect(log.a.progress).toEqual([1]);
    const res = applyEvent(log, defs, { type: 'kill', target: 'x' });
    expect(res.finished).toEqual(['a']);
    expect(res.log.a.status).toBe('ready');
    expect(turnInQuests(res.log, defs, 'npc')).toEqual(['a']);
    log = completeQuest(res.log, 'a');
    expect(log.a.status).toBe('done');
    expect(availableQuests(log, defs, 'npc')).toEqual(['b']);
  });

  it('completes reachLevel immediately when already satisfied', () => {
    const log = acceptQuest({}, defs, 'b', { level: 5 });
    expect(log.b.status).toBe('done');
  });

  it('ships a consistent quest chain', () => {
    for (const [id, q] of Object.entries(QUESTS)) {
      if (q.requires) expect(QUESTS[q.requires], `${id}.requires`).toBeDefined();
      expect(q.objectives.length).toBeGreaterThan(0);
    }
  });
});

describe('cultivation', () => {
  it('meditating in a zone is faster', () => {
    expect(meditateGain(5, 3).linhKhi).toBeGreaterThan(meditateGain(5, null).linhKhi);
    expect(zoneAt([{ id: 'z', name: 'Z', rect: [2, 2, 3, 3], rate: 2 }], 3, 3)?.id).toBe('z');
    expect(zoneAt([{ id: 'z', name: 'Z', rect: [2, 2, 3, 3], rate: 2 }], 5, 3)).toBeNull();
  });
});

describe('save', () => {
  it('round-trips and rejects garbage', () => {
    const raw = serialize({
      player: { name: 'A', level: 2, exp: 3, realmIndex: 0, hp: 1, mp: 1, linhKhi: 5, inventory: {}, equipment: {} },
      quests: {},
      mapId: 'm',
      pos: null,
    });
    expect(deserialize(raw)?.player.level).toBe(2);
    expect(deserialize('{oops')).toBeNull();
    expect(deserialize(JSON.stringify({ v: 999 }))).toBeNull();
  });
});
