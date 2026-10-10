import type { DungeonDef, WaveSpawn } from '../../data';

export const INTRO_MS = 2500;
export const WAVE_GAP_MS = 1800;

export type RunPhase = 'intro' | 'wave' | 'boss' | 'cleared' | 'failed';

export interface DungeonRun {
  id: string;
  phase: RunPhase;
  /** Index of the current wave, -1 before the first one. */
  wave: number;
  timeLeft: number;
  elapsed: number;
  introLeft: number;
  /** Countdown to the next wave once the current one is wiped; null while fighting. */
  nextIn: number | null;
}

export type RunEvent =
  | { type: 'spawnWave'; wave: number; spawns: WaveSpawn[] }
  | { type: 'spawnBoss'; boss: string }
  | { type: 'cleared' }
  | { type: 'failed' };

export function startRun(id: string, def: DungeonDef): DungeonRun {
  return {
    id,
    phase: 'intro',
    wave: -1,
    timeLeft: def.timeLimitSec * 1000,
    elapsed: 0,
    introLeft: INTRO_MS,
    nextIn: null,
  };
}

export function runOver(run: DungeonRun) {
  return run.phase === 'cleared' || run.phase === 'failed';
}

function advance(run: DungeonRun, def: DungeonDef): RunEvent {
  if (run.wave + 1 < def.waves.length) {
    run.wave += 1;
    run.phase = 'wave';
    return { type: 'spawnWave', wave: run.wave, spawns: def.waves[run.wave] };
  }
  run.phase = 'boss';
  return { type: 'spawnBoss', boss: def.boss };
}

/** Advances the run. `aliveEnemies` is the number of living monsters in the arena. */
export function tickRun(run: DungeonRun, def: DungeonDef, dt: number, aliveEnemies: number): RunEvent[] {
  if (runOver(run)) return [];
  if (run.phase === 'intro') {
    run.introLeft -= dt;
    if (run.introLeft > 0) return [];
    return [advance(run, def)];
  }

  run.elapsed += dt;
  run.timeLeft -= dt;
  if (run.timeLeft <= 0) {
    run.timeLeft = 0;
    run.phase = 'failed';
    return [{ type: 'failed' }];
  }
  if (aliveEnemies > 0) return [];

  if (run.phase === 'boss') {
    run.phase = 'cleared';
    return [{ type: 'cleared' }];
  }
  if (run.nextIn === null) {
    run.nextIn = WAVE_GAP_MS;
    return [];
  }
  run.nextIn -= dt;
  if (run.nextIn > 0) return [];
  run.nextIn = null;
  return [advance(run, def)];
}

export interface DungeonRecord {
  /** Local date (YYYY-MM-DD) the run counters belong to. */
  day: string;
  runs: Record<string, number>;
  clears: Record<string, number>;
}

export function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function emptyRecord(day = todayKey()): DungeonRecord {
  return { day, runs: {}, clears: {} };
}

export function attemptsLeft(rec: DungeonRecord | undefined, id: string, def: DungeonDef, day = todayKey()) {
  const used = rec && rec.day === day ? (rec.runs[id] ?? 0) : 0;
  return Math.max(0, def.attemptsPerDay - used);
}

export function consumeAttempt(rec: DungeonRecord | undefined, id: string, day = todayKey()): DungeonRecord {
  const base = rec ?? emptyRecord(day);
  const runs = base.day === day ? base.runs : {};
  return { day, runs: { ...runs, [id]: (runs[id] ?? 0) + 1 }, clears: base.clears };
}

export function recordClear(rec: DungeonRecord | undefined, id: string, day = todayKey()) {
  const base = rec ?? emptyRecord(day);
  const prev = base.clears[id] ?? 0;
  return { record: { ...base, clears: { ...base.clears, [id]: prev + 1 } }, first: prev === 0 };
}

export type EntryCheck = { ok: true } | { ok: false; reason: string };

export function canEnter(rec: DungeonRecord | undefined, id: string, def: DungeonDef, playerLevel: number, day = todayKey()): EntryCheck {
  if (playerLevel < def.minLevel) return { ok: false, reason: `Cần đạt cấp ${def.minLevel} để vào ${def.name}.` };
  if (attemptsLeft(rec, id, def, day) <= 0) return { ok: false, reason: 'Hôm nay đã hết lượt vào phó bản này.' };
  return { ok: true };
}
