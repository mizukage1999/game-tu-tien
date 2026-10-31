import { expect, it } from 'vitest';
import { SkyRaceEngine, replaySkyRace, skyCourse, skyWeek, skyTime } from './skyRace';
function fly(seed: number) {
  const r = new SkyRaceEngine(seed);
  while (r.phase === 'flying') {
    const gate = r.gates[r.gate];
    r.step(gate ? Math.max(-1, Math.min(1, (gate.x - r.x) / 0.022)) : 0, r.elapsed % 7000 === 0);
  }
  return r;
}
it('uses Monday midnight Vietnam as the weekly course boundary', () => {
  const before = skyWeek(Date.parse('2026-11-01T16:59:59Z')),
    after = skyWeek(Date.parse('2026-11-01T17:00:00Z'));
  expect(before.week).toBe('2026-10-26');
  expect(after.week).toBe('2026-11-02');
  expect(after.seed - before.seed).toBe(604800);
  expect(skyCourse(after.seed)).toEqual(skyCourse(after.seed));
  expect(skyCourse(before.seed)).not.toEqual(skyCourse(after.seed));
  expect(skyTime(88560)).toBe('01:28.56');
});
it('can finish all gates across weekly tracks and replay the exact score including penalties and pickups', () => {
  for (let i = 0; i < 32; i++) {
    const run = fly(1792947600 + i * 604800);
    expect(run.phase).toBe('finished');
    expect(run.gate).toBe(9);
    const replay = replaySkyRace(run.seed, run.inputs);
    expect(replay?.score).toBe(run.score);
    expect(replay?.hits).toBe(run.hits);
    expect(replay?.energy).toBe(run.energy);
    expect(run.charges).toBe(0);
    expect(run.inputs.length).toBeLessThan(run.elapsed / 50);
  }
});
it('rejects unfinished traces, impossible input values, oversized traces and input after the finish', () => {
  const run = fly(1792947600);
  expect(replaySkyRace(run.seed, [])).toBeNull();
  expect(replaySkyRace(run.seed, [[1001, 0, 10]])).toBeNull();
  expect(replaySkyRace(run.seed, [[0, 2, 10]])).toBeNull();
  expect(replaySkyRace(run.seed, [[0, 0, 121]])).toBeNull();
  expect(replaySkyRace(run.seed, [[0, 0, 2.5]])).toBeNull();
  expect(replaySkyRace(run.seed, run.inputs.slice(0, -1))).toBeNull();
  expect(replaySkyRace(run.seed, [...run.inputs, [0, 0, 1]])).toBeNull();
});
it('applies one collision per obstacle, consumes a shield first, and makes missed gates require another approach', () => {
  const run = new SkyRaceEngine(1792947600),
    gate = run.gates[0];
  run.distance = gate.y - 222;
  run.x = gate.hazardX;
  run.shields = 1;
  run.step(0);
  expect(run.shields).toBe(0);
  expect(run.hits).toBe(0);
  run.step(0);
  expect(run.hits).toBe(0);
  const unshielded = new SkyRaceEngine(run.seed);
  unshielded.distance = gate.y - 222;
  unshielded.x = gate.hazardX;
  unshielded.step(0);
  expect(unshielded.hits).toBe(1);
  expect(unshielded.penalty).toBe(2000);
  unshielded.distance = gate.y - 2;
  unshielded.x = gate.x > 0.0 ? -1 : 1;
  unshielded.step(0);
  expect(unshielded.gate).toBe(0);
  expect(unshielded.distance).toBe(gate.y - 90);
  expect(unshielded.misses).toBe(1);
});
