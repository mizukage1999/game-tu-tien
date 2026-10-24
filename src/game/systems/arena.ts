import { SKILLS, type SkillId } from '../../data';
import { effectiveSkill, DEFAULT_LOADOUT } from './skills';
import type { Duelist } from './duel';
export const ARENA_W = 720,
  ARENA_H = 400;
export const ARENA_ROCKS = [
  { x: 275, y: 120, r: 23 },
  { x: 445, y: 280, r: 23 },
];
export interface ArenaInput {
  seq: number;
  x: number;
  y: number;
  cast: SkillId | null;
}
export interface ArenaFighter extends Duelist {
  x: number;
  y: number;
  dx: number;
  dy: number;
  mp: number;
  maxMp: number;
  shield: number;
  shieldUntil: number;
  invulnUntil: number;
  cooldowns: Partial<Record<SkillId, number>>;
}
export interface ArenaEffect {
  id: number;
  owner: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  range: number;
  arc: number;
  kind: 'line' | 'circle' | 'cone';
  ready: number;
  expires: number;
  damage: number;
  resolved: boolean;
  skill: SkillId;
}
export interface ArenaSnapshot {
  nonce: string;
  phase: 'waiting' | 'countdown' | 'fighting' | 'finished';
  elapsed: number;
  remaining: number;
  fighters: [ArenaFighter, ArenaFighter];
  effects: ArenaEffect[];
  winner: string | null;
  reason: string;
}
function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}
export function validArenaInput(raw: unknown): raw is ArenaInput {
  if (!raw || typeof raw !== 'object') return false;
  const a = raw as ArenaInput;
  return (
    Number.isSafeInteger(a.seq) &&
    a.seq >= 0 &&
    Number.isFinite(a.x) &&
    Number.isFinite(a.y) &&
    Math.abs(a.x) <= 1 &&
    Math.abs(a.y) <= 1 &&
    (a.cast === null ||
      (typeof a.cast === 'string' && Object.prototype.hasOwnProperty.call(SKILLS, a.cast)))
  );
}
export function validateArenaSnapshot(raw: unknown, nonce: string): raw is ArenaSnapshot {
  if (!raw || typeof raw !== 'object') return false;
  const s = raw as ArenaSnapshot;
  return (
    s.nonce === nonce &&
    ['waiting', 'countdown', 'fighting', 'finished'].includes(s.phase) &&
    Number.isFinite(s.elapsed) &&
    s.elapsed >= 0 &&
    s.elapsed <= 123100 &&
    Number.isFinite(s.remaining) &&
    s.remaining >= 0 &&
    s.remaining <= 123000 &&
    typeof s.reason === 'string' &&
    s.reason.length <= 160 &&
    Array.isArray(s.fighters) &&
    s.fighters.length === 2 &&
    s.fighters.every(
      (f) =>
        !!f &&
        typeof f.userId === 'string' &&
        f.userId.length > 0 &&
        f.userId.length <= 64 &&
        typeof f.name === 'string' &&
        f.name.length <= 40 &&
        Number.isInteger(f.level) &&
        f.level >= 1 &&
        f.level <= 999 &&
        [
          f.x,
          f.y,
          f.dx,
          f.dy,
          f.hp,
          f.maxHp,
          f.mp,
          f.maxMp,
          f.atk,
          f.def,
          f.speed,
          f.shield,
          f.shieldUntil,
          f.invulnUntil,
        ].every(Number.isFinite) &&
        f.maxHp > 0 &&
        f.maxHp <= 10000000 &&
        f.maxMp >= 0 &&
        f.maxMp <= 100000 &&
        f.mp >= 0 &&
        f.mp <= f.maxMp &&
        Array.isArray(f.loadout) &&
        f.loadout.length >= 1 &&
        f.loadout.length <= 4 &&
        new Set(f.loadout).size === f.loadout.length &&
        f.loadout.every(
          (id) => typeof id === 'string' && Object.prototype.hasOwnProperty.call(SKILLS, id),
        ) &&
        !!f.cooldowns &&
        typeof f.cooldowns === 'object' &&
        Object.entries(f.cooldowns).every(
          ([id, v]) => Object.prototype.hasOwnProperty.call(SKILLS, id) && Number.isFinite(v),
        ) &&
        f.x >= 0 &&
        f.x <= ARENA_W &&
        f.y >= 0 &&
        f.y <= ARENA_H &&
        f.hp >= 0 &&
        f.hp <= f.maxHp,
    ) &&
    s.fighters[0].userId !== s.fighters[1].userId &&
    (s.winner === null || s.fighters.some((f) => f.userId === s.winner)) &&
    Array.isArray(s.effects) &&
    s.effects.length <= 40 &&
    s.effects.every(
      (e) =>
        !!e &&
        [e.id, e.x, e.y, e.dx, e.dy, e.arc, e.range, e.ready, e.expires, e.damage].every(
          Number.isFinite,
        ) &&
        e.range >= 0 &&
        e.range <= 1500 &&
        ['line', 'circle', 'cone'].includes(e.kind) &&
        typeof e.skill === 'string' &&
        Object.prototype.hasOwnProperty.call(SKILLS, e.skill) &&
        typeof e.resolved === 'boolean' &&
        s.fighters.some((f) => f.userId === e.owner),
    )
  );
}
function hit(e: ArenaEffect, p: ArenaFighter) {
  const x = p.x - e.x,
    y = p.y - e.y,
    d = Math.hypot(x, y);
  if (d > e.range + 15) return false;
  if (e.kind === 'circle') return true;
  const along = x * e.dx + y * e.dy,
    side = Math.abs(x * e.dy - y * e.dx);
  return e.kind === 'line'
    ? along >= -12 && side <= 24
    : along >= 0 && (d < 20 || along / d >= Math.cos((e.arc * Math.PI) / 360));
}
export class ArenaEngine {
  state: ArenaSnapshot;
  private inputs = new Map<string, { input: ArenaInput; at: number }>();
  private sequences = new Map<string, number>();
  private effect = 0;
  constructor(nonce: string, a: Duelist, b: Duelist) {
    const fighter = (p: Duelist, x: number, dx: number): ArenaFighter => ({
      ...p,
      loadout: [...(p.loadout?.length ? p.loadout : DEFAULT_LOADOUT)],
      hp: p.maxHp,
      x,
      y: 200,
      dx,
      dy: 0,
      mp: p.maxMp ?? 160,
      maxMp: p.maxMp ?? 160,
      shield: 0,
      shieldUntil: 0,
      invulnUntil: 0,
      cooldowns: {},
    });
    this.state = {
      nonce,
      phase: 'waiting',
      elapsed: 0,
      remaining: 123000,
      fighters: [fighter(a, 140, 1), fighter(b, 580, -1)],
      effects: [],
      winner: null,
      reason: '',
    };
  }
  start() {
    if (this.state.phase === 'waiting') this.state.phase = 'countdown';
  }
  input(id: string, raw: ArenaInput) {
    if (
      !validArenaInput(raw) ||
      !this.state.fighters.some((p) => p.userId === id) ||
      (this.sequences.get(id) ?? -1) >= raw.seq ||
      this.state.phase === 'finished'
    )
      return false;
    this.sequences.set(id, raw.seq);
    this.inputs.set(id, { input: { ...raw }, at: this.state.elapsed });
    return true;
  }
  forfeit(id: string, reason = 'Đối thủ rời trận') {
    if (this.state.phase === 'finished') return;
    this.state.phase = 'finished';
    this.state.winner = this.state.fighters.find((f) => f.userId !== id)?.userId ?? null;
    this.state.reason = reason;
  }
  step(ms: number) {
    const s = this.state;
    if (s.phase === 'waiting' || s.phase === 'finished') return;
    const dt = clamp(ms, 0, 100);
    s.elapsed += dt;
    s.remaining = Math.max(0, s.remaining - dt);
    if (s.phase === 'countdown') {
      if (s.elapsed < 3000) return;
      s.phase = 'fighting';
    }
    for (const f of s.fighters) {
      const input = this.inputs.get(f.userId),
        move = input && s.elapsed - input.at < 650 ? input.input : null;
      if (f.shieldUntil < s.elapsed) f.shield = 0;
      f.mp = Math.min(f.maxMp, f.mp + dt * 0.006);
      if (move) {
        const length = Math.hypot(move.x, move.y),
          speed = clamp(f.speed, 120, 240),
          dx = length ? move.x / Math.max(1, length) : 0,
          dy = length ? move.y / Math.max(1, length) : 0;
        if (length > 0.1) {
          f.dx = move.x / length;
          f.dy = move.y / length;
        }
        const nx = clamp(f.x + (dx * speed * dt) / 1000, 28, ARENA_W - 28),
          ny = clamp(f.y + (dy * speed * dt) / 1000, 28, ARENA_H - 28);
        if (!ARENA_ROCKS.some((r) => Math.hypot(nx - r.x, ny - r.y) < r.r + 14)) {
          f.x = nx;
          f.y = ny;
        }
        if (move.cast) {
          this.cast(f, move.cast);
          move.cast = null;
        }
      }
    }
    for (const e of s.effects) {
      if (e.resolved || e.ready > s.elapsed) continue;
      e.resolved = true;
      const target = s.fighters.find((f) => f.userId !== e.owner)!;
      if (hit(e, target) && target.invulnUntil <= s.elapsed) {
        const damage = Math.max(1, Math.round(e.damage - target.def * 0.55)),
          absorbed = Math.min(target.shield, damage);
        target.shield -= absorbed;
        target.hp = Math.max(0, target.hp - damage + absorbed);
      }
    }
    s.effects = s.effects.filter((e) => e.expires > s.elapsed);
    const dead = s.fighters.find((f) => f.hp <= 0);
    if (dead) {
      s.phase = 'finished';
      s.winner = s.fighters.every((f) => f.hp <= 0)
        ? null
        : s.fighters.find((f) => f.userId !== dead.userId)!.userId;
      s.reason = s.winner ? 'Hạ gục đối thủ' : 'Song vong';
    } else if (!s.remaining) {
      s.phase = 'finished';
      const [a, b] = s.fighters,
        ratio = a.hp / a.maxHp - b.hp / b.maxHp;
      s.winner = Math.abs(ratio) < 0.001 ? null : ratio > 0 ? a.userId : b.userId;
      s.reason = 'Hết giờ · so sánh tỷ lệ sinh lực';
    }
  }
  private cast(f: ArenaFighter, id: SkillId) {
    const s = this.state,
      allowed = f.loadout ?? DEFAULT_LOADOUT;
    if (!allowed.includes(id) || (f.cooldowns[id] ?? 0) > s.elapsed) return;
    const sk = effectiveSkill(id, f.skillLevels?.[id] ?? 1);
    if (f.mp < sk.mpCost) return;
    f.mp -= sk.mpCost;
    f.cooldowns[id] = s.elapsed + sk.cooldownMs;
    if (id === 'than_phap') {
      const nx = clamp(f.x + f.dx * 125, 28, ARENA_W - 28),
        ny = clamp(f.y + f.dy * 125, 28, ARENA_H - 28);
      // Sample the dash so it cannot jump through an obstacle.
      for (let i = 1; i <= 8; i++) {
        const x = f.x + ((nx - f.x) * i) / 8,
          y = f.y + ((ny - f.y) * i) / 8;
        if (ARENA_ROCKS.some((r) => Math.hypot(x - r.x, y - r.y) < r.r + 14)) return;
      }
      f.x = nx;
      f.y = ny;
      f.invulnUntil = s.elapsed + 350;
      return;
    }
    if (sk.kind === 'heal') {
      f.hp = Math.min(f.maxHp, f.hp + Math.round(f.maxHp * 0.24));
      return;
    }
    if (sk.kind === 'shield') {
      f.shield = Math.round(f.maxHp * 0.35);
      f.shieldUntil = s.elapsed + 6000;
      return;
    }
    const circle = id === 'han_bang_tran' || sk.kind === 'nova',
      line = id === 'phi_kiem' || sk.kind === 'projectile',
      windup = id === 'basic' ? 150 : line ? 400 : 600;
    s.effects.push({
      id: ++this.effect,
      owner: f.userId,
      x: f.x,
      y: f.y,
      dx: f.dx,
      dy: f.dy,
      range: id === 'basic' ? 80 : sk.range,
      arc: sk.arc || 100,
      kind: circle ? 'circle' : line ? 'line' : 'cone',
      ready: s.elapsed + windup,
      expires: s.elapsed + windup + 220,
      damage: f.atk * sk.multiplier,
      skill: id,
      resolved: false,
    });
  }
  snapshot(): ArenaSnapshot {
    return JSON.parse(JSON.stringify(this.state)) as ArenaSnapshot;
  }
}
