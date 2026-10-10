import { describe, expect, it } from 'vitest';
import { DUNGEONS, QUESTS } from '../../data';
import {
  attemptsLeft,
  canEnter,
  consumeAttempt,
  recordClear,
  startRun,
  tickRun,
  INTRO_MS,
  WAVE_GAP_MS,
  type RunEvent,
} from './dungeon';
import { checkUpgrade, effectiveSkill, skillLevel, upgradeCost, SKILL_MAX_LEVEL } from './skills';
import { acceptQuest, applyEvent } from './quest';

const def = DUNGEONS.bang_tuyet_dong;

describe('dungeon run', () => {
  it('goes intro -> every wave -> boss -> cleared', () => {
    const run = startRun('bang_tuyet_dong', def);
    const events: RunEvent[] = [];
    events.push(...tickRun(run, def, INTRO_MS, 0));
    expect(events[0]).toMatchObject({ type: 'spawnWave', wave: 0 });

    for (let w = 1; w < def.waves.length; w++) {
      expect(tickRun(run, def, 100, 3)).toEqual([]);
      tickRun(run, def, 16, 0); // wave wiped, breather starts
      const next = tickRun(run, def, WAVE_GAP_MS, 0);
      expect(next[0]).toMatchObject({ type: 'spawnWave', wave: w });
    }
    tickRun(run, def, 16, 0);
    expect(tickRun(run, def, WAVE_GAP_MS, 0)[0]).toEqual({ type: 'spawnBoss', boss: def.boss });
    expect(tickRun(run, def, 100, 1)).toEqual([]);
    expect(tickRun(run, def, 100, 0)).toEqual([{ type: 'cleared' }]);
    expect(tickRun(run, def, 100, 0)).toEqual([]);
  });

  it('fails when time runs out', () => {
    const run = startRun('bang_tuyet_dong', def);
    tickRun(run, def, INTRO_MS, 0);
    expect(tickRun(run, def, def.timeLimitSec * 1000, 5)).toEqual([{ type: 'failed' }]);
    expect(run.phase).toBe('failed');
  });

  it('limits daily attempts and resets on a new day', () => {
    let rec = undefined;
    for (let i = 0; i < def.attemptsPerDay; i++) rec = consumeAttempt(rec, 'bang_tuyet_dong', '2026-10-10');
    expect(attemptsLeft(rec, 'bang_tuyet_dong', def, '2026-10-10')).toBe(0);
    expect(canEnter(rec, 'bang_tuyet_dong', def, 20, '2026-10-10').ok).toBe(false);
    expect(attemptsLeft(rec, 'bang_tuyet_dong', def, '2026-10-11')).toBe(def.attemptsPerDay);
    expect(canEnter(undefined, 'bang_tuyet_dong', def, def.minLevel - 1).ok).toBe(false);
  });

  it('flags only the first clear', () => {
    const a = recordClear(undefined, 'bang_tuyet_dong');
    const b = recordClear(a.record, 'bang_tuyet_dong');
    expect(a.first).toBe(true);
    expect(b.first).toBe(false);
    expect(b.record.clears.bang_tuyet_dong).toBe(2);
  });

  it('counts dungeon clears and skill upgrades for quests', () => {
    let log = acceptQuest({}, QUESTS, 'side_5', { level: 5 });
    log = applyEvent(log, QUESTS, { type: 'dungeonClear', dungeon: 'hoa_diem_coc' }).log;
    expect(log.side_5.progress[0]).toBe(0);
    log = applyEvent(log, QUESTS, { type: 'dungeonClear', dungeon: 'bang_tuyet_dong' }).log;
    expect(log.side_5.status).toBe('ready');

    let log2 = acceptQuest({}, QUESTS, 'side_4', { level: 1 });
    for (let i = 0; i < 3; i++) log2 = applyEvent(log2, QUESTS, { type: 'skillUpgrade', skill: 'phi_kiem' }).log;
    expect(log2.side_4.status).toBe('ready');
  });
});

describe('skill upgrades', () => {
  it('scales damage and cooldown with level and unlocks the bonus at 5', () => {
    const l1 = effectiveSkill('bang_tam_tram', 1);
    const l5 = effectiveSkill('bang_tam_tram', 5);
    expect(l5.multiplier).toBeGreaterThan(l1.multiplier);
    expect(l5.cooldownMs).toBeLessThan(l1.cooldownMs);
    expect(l1.active).toBeNull();
    expect(l5.active?.echo).toBeGreaterThan(0);
  });

  it('defaults missing levels to 1 and clamps', () => {
    expect(skillLevel(undefined, 'phi_kiem')).toBe(1);
    expect(skillLevel({ phi_kiem: 99 }, 'phi_kiem')).toBe(SKILL_MAX_LEVEL);
  });

  it('requires player level, resources and book pages', () => {
    const rich = { linhKhi: 1e6, linhThach: 1e6, kiemPho: 1e6 };
    expect(checkUpgrade(1, 1, rich).ok).toBe(false);
    expect(checkUpgrade(1, 2, rich).ok).toBe(true);
    expect(checkUpgrade(4, 20, { ...rich, kiemPho: 0 }).ok).toBe(false);
    expect(upgradeCost(3)?.kiemPho).toBe(0);
    expect(upgradeCost(SKILL_MAX_LEVEL)).toBeNull();
  });
});
