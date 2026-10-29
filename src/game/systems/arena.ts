import { SKILLS, type SkillId } from '../../data';
import { effectiveSkill, DEFAULT_LOADOUT } from './skills';
import type { Duelist } from './duel';
import { wangEffect } from '../../data/wangSkills';
import { signatureHit } from './skillHit';
import { heroSpell, heroSpellHit } from '../../data/heroSkills';
import { heroFor, isHeroId } from '../../data/heroes';
import { ritualSkill, ritualControlMs, soulDrain } from './ritualSkills';
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
  moving?: boolean;
  lastSkill?: SkillId;
  actionUntil?: number;
  hurtUntil?: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  mp: number;
  maxMp: number;
  shield: number;
  shieldUntil: number;
  invulnUntil: number;
  rootUntil: number;
  weakenUntil: number;
  slowUntil: number;
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
  nextTick?: number;
  tickEnd?: number;
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
        (f.heroId === undefined || isHeroId(f.heroId)) &&
        (f.moving === undefined || typeof f.moving === 'boolean') &&
        (f.lastSkill === undefined || Object.prototype.hasOwnProperty.call(SKILLS,f.lastSkill)) &&
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
        f.loadout.length <= 7 &&
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
        f.hp <= f.maxHp &&
        [f.rootUntil, f.weakenUntil, f.slowUntil, f.actionUntil, f.hurtUntil].every(
          (v) => v === undefined || (Number.isFinite(v) && v >= 0 && v <= 130000),
        ),
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
        [e.nextTick, e.tickEnd].every(
          (v) => v === undefined || (Number.isFinite(v) && v >= 0 && v <= 130000),
        ) &&
        s.fighters.some((f) => f.userId === e.owner),
    )
  );
}
function hit(e: ArenaEffect, p: ArenaFighter) {
  const spell = heroSpell(e.skill);
  if (spell) return heroSpellHit(spell.shape,e,{x:e.dx,y:e.dy},e.range,e.arc,p);
  if (wangEffect(e.skill)) return signatureHit(e.skill, e, { x: e.dx, y: e.dy }, e.range, p);
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
      rootUntil: 0,
      weakenUntil: 0,
      slowUntil: 0,
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
      f.moving = false;
      const input = this.inputs.get(f.userId),
        move = input && s.elapsed - input.at < 650 ? input.input : null;
      if (f.shieldUntil < s.elapsed) f.shield = 0;
      f.mp = Math.min(f.maxMp, f.mp + dt * 0.006);
      if (move) {
        const length = Math.hypot(move.x, move.y),
          speed =
            (f.rootUntil > s.elapsed ? 0 : f.slowUntil > s.elapsed ? 0.55 : 1) *
            clamp(f.speed, 120, 240),
          dx = length ? move.x / Math.max(1, length) : 0,
          dy = length ? move.y / Math.max(1, length) : 0;
        if (length > 0.1) {
          f.dx = move.x / length;
          f.dy = move.y / length;
        }
        const nx = clamp(f.x + (dx * speed * dt) / 1000, 28, ARENA_W - 28),
          ny = clamp(f.y + (dy * speed * dt) / 1000, 28, ARENA_H - 28);
        const open = (x: number, y: number) =>
          !ARENA_ROCKS.some((r) => Math.hypot(x - r.x, y - r.y) < r.r + 14);
        const oldX=f.x,oldY=f.y;
        if (open(nx, ny)) {
          f.x = nx;
          f.y = ny;
        } else {
          if (open(nx, f.y)) f.x = nx;
          if (open(f.x, ny)) f.y = ny;
        }
        f.moving = Math.hypot(f.x-oldX,f.y-oldY)>.1;
        if (move.cast) {
          this.cast(f, move.cast);
          move.cast = null;
        }
      }
    }
    for (const e of s.effects) {
      if (e.resolved || (e.nextTick ?? e.ready) > s.elapsed) continue;
      if (e.tickEnd) {
        e.nextTick = (e.nextTick ?? e.ready) + (ritualSkill(e.skill)?.tickMs || 500);
        e.resolved = e.nextTick >= e.tickEnd;
      } else e.resolved = true;
      const target = s.fighters.find((f) => f.userId !== e.owner)!;
      if (hit(e, target) && target.invulnUntil <= s.elapsed) {
        const rootMs=heroSpell(e.skill)?.rootMs;
        if(rootMs)target.rootUntil=Math.max(target.rootUntil,s.elapsed+rootMs);
        target.hurtUntil=s.elapsed+220;
        if (e.skill === 'dinh_than_thuat') {
          target.rootUntil = s.elapsed + 1000;
          continue;
        }
        if (e.skill === 'dich_linh_an')
          target.rootUntil = Math.max(target.rootUntil, s.elapsed + 350);
        if (e.skill === 'dao_hoa_hoang_tuyen') {
          target.weakenUntil = s.elapsed + 800;
          target.slowUntil = s.elapsed + 800;
        }
        const ritual = ritualSkill(e.skill);
        const control=ritualControlMs(e.skill);
        if (control) target.rootUntil = Math.max(target.rootUntil,s.elapsed+control);
        if (e.skill === 'luyen_hon_thuat') target.weakenUntil = s.elapsed+650;
        const damage = Math.max(
            1,
            Math.round(e.damage - target.def * (ritual ? 1-ritual.armorPierce : target.weakenUntil > s.elapsed ? 0.8 : 1) * 0.55),
          ),
          absorbed = Math.min(target.shield, damage);
        target.shield -= absorbed;
        const healthLost = Math.min(target.hp,damage-absorbed);
        target.hp = Math.max(0, target.hp - damage + absorbed);
        if (e.skill === 'luyen_hon_thuat') {
          const owner = s.fighters.find(f=>f.userId===e.owner)!;
          if (owner.hp>0) owner.hp=Math.min(owner.maxHp,owner.hp+soulDrain(healthLost,owner.maxHp));
        }
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
    if (f.rootUntil > s.elapsed) return;
    if ((id !== 'than_phap' && !allowed.includes(id)) || (f.cooldowns[id] ?? 0) > s.elapsed) return;
    const sk = effectiveSkill(id, f.skillLevels?.[id] ?? 1);
    const spell = heroSpell(id);
    if (sk.hero && (sk.hero !== heroFor(f).id || f.level < (sk.unlockLevel ?? 1))) return;
    if (f.mp < sk.mpCost) return;
    f.mp -= sk.mpCost;
    f.cooldowns[id] = s.elapsed + sk.cooldownMs;
    f.lastSkill=id;
    f.actionUntil=s.elapsed+(id==='than_phap'?350:500);
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
    if (sk.kind === 'heal' || sk.kind === 'shield') {
      s.effects.push({id:++this.effect,owner:f.userId,x:f.x,y:f.y,dx:f.dx,dy:f.dy,range:0,arc:0,kind:'circle',ready:s.elapsed,expires:s.elapsed+(spell?.duration ?? 900),damage:0,resolved:true,skill:id});
    }
    if (sk.kind === 'heal') {
      f.hp = Math.min(f.maxHp, f.hp + Math.round(f.maxHp * (spell?.healFraction ?? 0.24)));
      return;
    }
    if (sk.kind === 'shield') {
      f.shield = Math.round(f.maxHp * (spell?.shieldFraction ?? 0.35));
      f.shieldUntil = s.elapsed + (spell?.shieldMs ?? 6000);
      return;
    }
    const painted = wangEffect(id);
    const ritual = ritualSkill(id);
    const circle = id === 'han_bang_tran' || sk.kind === 'nova',
      line = id === 'phi_kiem' || sk.kind === 'projectile',
      windup = id === 'basic' ? 150 : ritual?.windup ?? spell?.windupMs ?? (line ? 400 : 600);
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
      expires:
        s.elapsed +
        Math.max(windup + 600, spell?.duration ?? (painted?.duration ?? 0) + (id === 'dinh_than_thuat' ? windup : 0)),
      damage: f.atk * sk.multiplier,
      skill: id,
      resolved: false,
      ...(id === 'dao_hoa_hoang_tuyen'
        ? { nextTick: s.elapsed + 500, tickEnd: s.elapsed + 4500, expires: s.elapsed + 4500 }
        : {}),
      ...(ritual && ritual.ticks > 1
        ? { nextTick:s.elapsed+ritual.windup,tickEnd:s.elapsed+ritual.windup+ritual.ticks*ritual.tickMs,expires:s.elapsed+painted!.duration }
        : {}),
    });
  }
  snapshot(): ArenaSnapshot {
    return JSON.parse(JSON.stringify(this.state)) as ArenaSnapshot;
  }
}
