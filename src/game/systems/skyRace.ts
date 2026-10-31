/** Fixed-step flight rules shared by the playable preview and its replay checks. */
export const SKY_STEP = 50;
export const SKY_LENGTH = 4800;
export const SKY_LIMIT = 180000;
export type SkyInput = [axis: number, boost: number, ticks: number];
export interface SkyGate {
  x: number;
  y: number;
  hazardX: number;
  hazard: number;
  orb: number;
}
export function skyCourse(seed: number): SkyGate[] {
  let state = Math.max(1, Math.floor(seed) % 2147483647);
  const next = () => (state = (state * 16807) % 2147483647);
  return Array.from({ length: 9 }, (_, i) => ({
    x: ((next() % 5) - 2) * 0.3,
    y: (i + 1) * 500,
    hazardX: ((next() % 7) - 3) * 0.25,
    hazard: next() % 5,
    orb: i % 4,
  }));
}
export function skyWeek(now = Date.now()) {
  const d = new Date(now + 7 * 3600000);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return {
    week: d.toISOString().slice(0, 10),
    seed: Math.floor((d.getTime() - 7 * 3600000) / 1000),
  };
}
export function skyTime(ms: number) {
  return `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${((ms % 60000) / 1000).toFixed(2).padStart(5, '0')}`;
}
export class SkyRaceEngine {
  readonly gates: SkyGate[];
  readonly inputs: SkyInput[] = [];
  readonly pickups = new Set<number>();
  readonly obstacles = new Set<number>();
  x = 0;
  distance = 0;
  previousX = 0;
  previousDistance = 0;
  elapsed = 0;
  penalty = 0;
  energy = 0;
  gate = 0;
  hits = 0;
  misses = 0;
  charges = 3;
  shields = 0;
  boostUntil = 0;
  cooldownUntil = 0;
  slowUntil = 0;
  flashUntil = 0;
  phase: 'flying' | 'finished' | 'failed' = 'flying';
  constructor(
    readonly seed: number,
    private record = true,
  ) {
    this.gates = skyCourse(seed);
  }
  get score() {
    return Math.max(1000, this.elapsed + this.penalty - this.energy * 250);
  }
  step(axis: number, boost = false) {
    if (this.phase !== 'flying') return;
    if (!Number.isFinite(axis)) axis = 0;
    const input = Math.round(Math.max(-1, Math.min(1, axis)) * 1000);
    if (this.record) {
      const last = this.inputs[this.inputs.length - 1];
      if (last && last[0] === input && last[1] === Number(boost) && last[2] < 120) last[2]++;
      else this.inputs.push([input, Number(boost), 1]);
    }
    this.elapsed += SKY_STEP;
    this.previousX = this.x;
    this.previousDistance = this.distance;
    this.x = Math.max(-1, Math.min(1, this.x + (input / 1000) * 0.022));
    if (boost && this.charges > 0 && this.elapsed >= this.cooldownUntil) {
      this.charges--;
      this.boostUntil = this.elapsed + 1500;
      this.cooldownUntil = this.elapsed + 5000;
    }
    const before = this.distance;
    this.distance +=
      5 * (this.elapsed < this.boostUntil ? 1.65 : 1) * (this.elapsed < this.slowUntil ? 0.55 : 1);
    for (const [i, g] of this.gates.entries()) {
      if (!this.obstacles.has(i) && before < g.y - 220 && this.distance >= g.y - 220) {
        this.obstacles.add(i);
        if (Math.abs(this.x - g.hazardX) < 0.16) {
          if (this.shields) this.shields--;
          else {
            this.hits++;
            this.penalty += 2000;
            this.slowUntil = this.elapsed + 700;
            this.flashUntil = this.elapsed + 400;
          }
        }
      }
      if (
        !this.pickups.has(i) &&
        before < g.y - 110 &&
        this.distance >= g.y - 110 &&
        Math.abs(this.x - g.x) < 0.2
      ) {
        this.pickups.add(i);
        this.energy++;
        if (g.orb === 3) this.shields = 1;
      }
    }
    const next = this.gates[this.gate];
    if (next && this.distance >= next.y) {
      if (Math.abs(this.x - next.x) <= 0.23) this.gate++;
      else {
        this.distance = next.y - 90;
        this.penalty += 2000;
        this.misses++;
        this.flashUntil = this.elapsed + 400;
      }
    }
    if (this.distance >= SKY_LENGTH && this.gate === this.gates.length) this.phase = 'finished';
    else if (this.elapsed >= SKY_LIMIT) this.phase = 'failed';
  }
}
export function replaySkyRace(seed: number, inputs: unknown) {
  if (!Array.isArray(inputs) || !inputs.length || inputs.length > 3600) return null;
  const engine = new SkyRaceEngine(seed, false);
  let total = 0;
  for (const entry of inputs) {
    if (!Array.isArray(entry) || entry.length !== 3 || !entry.every(Number.isInteger)) return null;
    const [axis, boost, ticks] = entry;
    if (
      Math.abs(axis) > 1000 ||
      ![0, 1].includes(boost) ||
      ticks < 1 ||
      ticks > 120 ||
      (total += ticks) > 3600
    )
      return null;
    for (let i = 0; i < ticks; i++) {
      if (engine.phase !== 'flying') return null;
      engine.step(axis / 1000, !!boost);
    }
  }
  return engine.phase === 'finished' ? engine : null;
}
