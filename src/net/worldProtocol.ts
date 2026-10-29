import { SKILLS, MONSTERS, ITEMS, type SkillId } from '../data';
import type { SharedAward } from '../game/systems/contribution';
import type { DungeonRun } from '../game/systems/dungeon';
import { DUNGEONS } from '../data';
import type { HeroId } from '../data/heroes';
import { heroSpell, heroSpellHit } from '../data/heroSkills';
import { signatureHit } from '../game/systems/skillHit';
import type { EffectiveSkill } from '../game/systems/skills';

export type PkMode = 'peace' | 'sect' | 'all';
export function isSanctuary(mapId: string): boolean {
  return ['vuong_gia_thon', 'ngoai_mon', 'dai_thua_vien', 'linh_son_tong', 'sect_archive', 'sect_sacred', 'dinh_ta', 'dong_phu'].includes(mapId);
}
export function parsePkMode(value: unknown): PkMode {
  return value === 'sect' || value === 'all' ? value : 'peace';
}
export interface CombatStats {
  atk: number;
  def: number;
  maxHp: number;
  hp: number;
  maxMp: number;
  mp: number;
  critRate: number;
  critMul: number;
  level: number;
  loadout: SkillId[];
  skills: Partial<Record<SkillId, number>>;
}
export interface WorldMonsterState {
  id: string;
  type: string;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  hp: number;
  alive: boolean;
  flip: boolean;
  anim: 'idle' | 'run' | 'attack' | 'hurt' | 'die';
  root: number;
  slow: number;
  generation: number;
  respawnAt: number;
}
export type WorldEvent =
  | {
      t: 'cast';
      seq: number;
      skill: SkillId;
      x: number;
      y: number;
      dx: number;
      dy: number;
      combo: number;
    }
  | { t: 'monsters'; seq: number; monsters: WorldMonsterState[] }
  | { t: 'dungeon-run'; seq: number; room: string; run: DungeonRun; eligible: string[]; waiting: boolean }
  | { t: 'support'; seq: number; to: string; kind: 'heal' | 'shield'; amount: number; duration: number }
  | {
      t: 'damage';
      seq: number;
      to: string;
      amount: number;
      crit: boolean;
      x: number;
      y: number;
      rootMs: number;
    }
  | { t: 'kill'; id: string; generation: number; killer: string; awards?: SharedAward[] }
  | { t: 'aux-hit'; seq: number; id: string; amount: number }
  | {
      t: 'monster-attack';
      id: string;
      to: string;
      radius: number;
      windup: number;
      x: number;
      y: number;
    }
  | { t: 'near-chat'; id: string; text: string; x: number; y: number };

const num = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const text = (v: unknown, max: number): v is string =>
  typeof v === 'string' && v.length > 0 && v.length <= max;
const seq = (v: unknown) => Number.isSafeInteger(v) && num(v, 0, Number.MAX_SAFE_INTEGER);
export function parseCombatStats(raw: unknown): CombatStats | undefined {
  if (!raw || typeof raw !== 'object') return;
  const p = raw as CombatStats;
  if (
    ![p.atk, p.def, p.maxHp, p.hp, p.maxMp, p.mp].every((v) => num(v, 0, 10000000)) ||
    p.maxHp < 1 ||
    p.hp > p.maxHp ||
    p.mp > p.maxMp ||
    !num(p.level, 1, 999) ||
    !num(p.critRate, 0, 1) ||
    !num(p.critMul, 1, 10)
  )
    return;
  const known = (id: unknown): id is SkillId =>
    typeof id === 'string' && Object.prototype.hasOwnProperty.call(SKILLS, id);
  return {
    ...p,
    loadout: Array.isArray(p.loadout)
      ? [...new Set(p.loadout.filter(known))].slice(0, 7)
      : ['basic'],
    skills: Object.fromEntries(
      Object.entries(p.skills ?? {}).filter(
        ([id, n]) => known(id) && Number.isInteger(n) && num(n, 1, 10),
      ),
    ),
  };
}
export function parseWorldEvent(raw: unknown): WorldEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const e = raw as WorldEvent;
  switch (e.t) {
    case 'dungeon-run':
      return seq(e.seq) && text(e.room, 80) && e.run && Object.prototype.hasOwnProperty.call(DUNGEONS, e.run.id) &&
        ['intro', 'wave', 'boss', 'cleared', 'failed'].includes(e.run.phase) &&
        Number.isInteger(e.run.wave) && num(e.run.wave, -1, 20) &&
        [e.run.timeLeft, e.run.elapsed].every(v => num(v, 0, 3600000)) && num(e.run.introLeft, -100, 10000) &&
        (e.run.nextIn === null || num(e.run.nextIn, -100, 10000)) && typeof e.waiting === 'boolean' &&
        Array.isArray(e.eligible) && e.eligible.length <= 3 && e.eligible.every(id => text(id, 80)) ? e : null;
    case 'support':
      return seq(e.seq) && text(e.to, 100) && ['heal', 'shield'].includes(e.kind) &&
        num(e.amount, 0, 10000000) && num(e.duration, 0, 30000) ? e : null;
    case 'cast':
      return seq(e.seq) &&
        Object.prototype.hasOwnProperty.call(SKILLS, e.skill) &&
        [e.x, e.y].every((v) => num(v, 0, 100000)) &&
        [e.dx, e.dy].every((v) => num(v, -1, 1)) &&
        Math.hypot(e.dx, e.dy) > 0.9 &&
        Math.hypot(e.dx, e.dy) < 1.01 &&
        num(e.combo, 1, 3)
        ? e
        : null;
    case 'monsters':
      return seq(e.seq) &&
        Array.isArray(e.monsters) &&
        e.monsters.length <= 250 &&
        e.monsters.every(
          (m) =>
            m &&
            text(m.id, 80) &&
            (m.type === 'wanderer' || Object.prototype.hasOwnProperty.call(MONSTERS, m.type)) &&
            [m.x, m.y, m.homeX, m.homeY].every((v) => num(v, 0, 100000)) &&
            num(m.hp, 0, 10000000) &&
            typeof m.alive === 'boolean' &&
            typeof m.flip === 'boolean' &&
            ['idle', 'run', 'attack', 'hurt', 'die'].includes(m.anim) &&
            num(m.root, 0, 10000) &&
            num(m.slow, 0, 10000) &&
            seq(m.generation) &&
            num(m.respawnAt, 0, Number.MAX_SAFE_INTEGER),
        )
        ? e
        : null;
    case 'damage':
      return seq(e.seq) &&
        text(e.to, 100) &&
        num(e.amount, 0, 10000000) &&
        typeof e.crit === 'boolean' &&
        [e.x, e.y].every((v) => num(v, 0, 100000)) &&
        num(e.rootMs, 0, 2000)
        ? e
        : null;
    case 'kill':
      return text(e.id, 80) && seq(e.generation) && text(e.killer, 100) &&
        (e.awards === undefined || (Array.isArray(e.awards) && e.awards.length <= 32 &&
          new Set(e.awards.map(a => a?.to)).size === e.awards.length && e.awards.every(a =>
            a && text(a.to, 100) && seq(a.exp) && a.exp <= 10000000 &&
            Array.isArray(a.drops) && a.drops.length <= 64 && a.drops.every(d =>
              d && Object.prototype.hasOwnProperty.call(ITEMS, d.item) && seq(d.qty) && d.qty > 0 && d.qty <= 1000000)) )) ? e : null;
    case 'aux-hit':
      return seq(e.seq) && text(e.id, 80) && num(e.amount, 0, 1000000) ? e : null;
    case 'monster-attack':
      return text(e.id, 80) &&
        text(e.to, 100) &&
        num(e.radius, 0, 1000) &&
        num(e.windup, 0, 10000) &&
        [e.x, e.y].every((v) => num(v, 0, 100000))
        ? e
        : null;
    case 'near-chat':
      return text(e.id, 100) &&
        text(e.text, 200) &&
        e.text.trim().length > 0 &&
        [e.x, e.y].every((v) => num(v, 0, 100000))
        ? { ...e, text: e.text.trim() }
        : null;
    default:
      return null;
  }
}

export function mayPk(
  attacker: { mode?: PkMode; sect?: string; child?: boolean; mapId?: string },
  target: { sect?: string; child?: boolean },
) {
  if (attacker.child || target.child || (attacker.mapId && isSanctuary(attacker.mapId))) return false;
  return (
    attacker.mode === 'all' ||
    (attacker.mode === 'sect' && !!attacker.sect && !!target.sect && attacker.sect !== target.sect)
  );
}

export function worldSkillHit(
  id: SkillId,
  sk: EffectiveSkill,
  from: { x: number; y: number },
  facing: { x: number; y: number },
  target: { x: number; y: number },
  combo = 1,
) {
  const art = heroSpell(id);
  if (art) return heroSpellHit(art.shape, from, facing, sk.range, sk.arc, target);
  if (
    [
      'hoa_ma_chi',
      'dao_hoa_hoang_tuyen',
      'dinh_than_thuat',
      'tram_la_quyet',
      'dich_linh_an',
      'tich_diet_chi',
      'luyen_hon_thuat',
    ].includes(id)
  )
    return signatureHit(id, from, facing, sk.range, target);
  const shape =
    sk.kind === 'heal' || sk.kind === 'shield' || id === 'than_phap'
      ? 'self'
      : sk.kind === 'nova' || id === 'han_bang_tran'
        ? 'circle'
        : sk.kind === 'projectile' || id === 'phi_kiem'
          ? 'line'
          : 'cone';
  return heroSpellHit(
    shape,
    from,
    facing,
    id === 'basic' ? sk.range + (combo === 3 ? 16 : 0) : sk.range,
    sk.arc || 100,
    target,
  );
}
export type ActorIdentity = { heroId?: HeroId; sect?: string; mode?: PkMode; child?: boolean };
