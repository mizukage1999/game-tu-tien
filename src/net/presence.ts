import type { Dir } from '../game/types';
import { isHeroId, type HeroId } from '../data/heroes';
import { HERO_DIRECTIONS, type HeroDirection } from '../game/art/heroDirections';
import { parseCombatStats, parsePkMode, type CombatStats, type PkMode } from './worldProtocol';

export type Sex = 'female' | 'male';

/** What travels over the wire for one player's movement. */
export interface Pose {
  visualDir?: HeroDirection;
  dx?: number;
  dy?: number;
  mount?: 'sword' | 'crane' | null;
  showMount?: boolean;
  child?: boolean;
  realm?: string;
  sect?: string;
  pkMode?: PkMode;
  combat?: CombatStats;
  x: number;
  y: number;
  dir: Dir;
  moving: boolean;
}

/** One other player in the same map, as the renderer needs them. */
export interface RemotePlayerState extends Pose {
  joinedAt?: number;
  heroId?: HeroId;
  /** Presence key: unique per connection, so one account on two tabs is two players. */
  key: string;
  userId: string;
  name: string;
  sex: Sex;
  realm: string;
  /** Local clock when we last heard from them, used to drop silent connections. */
  updatedAt: number;
  /** Party id when known; missing until a social channel carries it. */
  party?: string;
}

const DIRS: Dir[] = ['down', 'up', 'left', 'right'];
export function poseExtras(r: Record<string, unknown>): Partial<Pose> {
  return {
    ...(HERO_DIRECTIONS.includes(r.visualDir as HeroDirection)
      ? { visualDir: r.visualDir as HeroDirection }
      : {}),
    ...(typeof r.dx === 'number' && Number.isFinite(r.dx) && Math.abs(r.dx) <= 1
      ? { dx: r.dx }
      : {}),
    ...(typeof r.dy === 'number' && Number.isFinite(r.dy) && Math.abs(r.dy) <= 1
      ? { dy: r.dy }
      : {}),
    ...(r.mount === 'sword' || r.mount === 'crane' || r.mount === null ? { mount: r.mount } : {}),
    ...(typeof r.showMount === 'boolean' ? { showMount: r.showMount } : {}),
    ...(typeof r.child === 'boolean' ? { child: r.child } : {}),
    ...(typeof r.realm === 'string' ? { realm: r.realm.slice(0, 50) } : {}),
    ...(r.sect === 'dai_thua_vien' || r.sect === 'linh_son_tong' ? { sect: r.sect } : {}),
    ...(r.pkMode !== undefined ? { pkMode: parsePkMode(r.pkMode) } : {}),
    ...(parseCombatStats(r.combat) ? { combat: parseCombatStats(r.combat) } : {}),
  };
}

export function parseDir(value: unknown): Dir {
  return DIRS.includes(value as Dir) ? (value as Dir) : 'down';
}

export function parseSex(value: unknown): Sex {
  return value === 'male' ? 'male' : 'female';
}

function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Network input is untrusted: anything missing or malformed is dropped rather than
 * rendered, so a broken client cannot put a sprite at NaN on everyone's screen.
 */
export function parseRemote(key: string, raw: unknown, now: number): RemotePlayerState | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const userId = typeof r.user_id === 'string' && r.user_id ? r.user_id : null;
  const x = finite(r.x);
  const y = finite(r.y);
  if (!userId || x === null || y === null) return null;
  const rawName = typeof r.name === 'string' ? r.name.trim().replace(/\s+/g, ' ') : '';
  return {
    key,
    userId,
    name: (rawName || 'Đạo hữu').slice(0, 16),
    sex: parseSex(r.sex),
    ...(isHeroId(r.hero_id) ? { heroId: r.hero_id } : {}),
    realm: typeof r.realm === 'string' ? r.realm.slice(0, 40) : '',
    ...(typeof r.party === 'string' ? { party: r.party.slice(0, 100) } : {}),
    x,
    y,
    dir: parseDir(r.dir),
    moving: r.moving === true,
    ...poseExtras(r),
    updatedAt: now,
    ...(typeof r.joinedAt === 'number' && Number.isFinite(r.joinedAt) && r.joinedAt >= 0
      ? { joinedAt: r.joinedAt }
      : {}),
  };
}

/** Flattens a Supabase presence state map into a roster, always excluding ourselves. */
export function parseRoster(
  state: Record<string, unknown[] | undefined>,
  selfKey: string,
  now: number,
): RemotePlayerState[] {
  const roster: RemotePlayerState[] = [];
  for (const [key, entries] of Object.entries(state)) {
    if (key === selfKey || !Array.isArray(entries) || entries.length === 0) continue;
    const merged = entries.length > 1 ? Object.assign({}, ...entries) : entries[0];
    const player = parseRemote(key, merged, now);
    if (player) roster.push(player);
  }
  return roster;
}

/** Hide closing connections immediately while the global lease logs out the old tab. */
export function uniqueWorldPlayers(roster: RemotePlayerState[], selfUserId: string) {
  const players = new Map<string, RemotePlayerState>();
  for (const player of roster) {
    if (player.userId === selfUserId) continue;
    const previous = players.get(player.userId);
    if (!previous || (player.joinedAt ?? 0) > (previous.joinedAt ?? 0) ||
      ((player.joinedAt ?? 0) === (previous.joinedAt ?? 0) && player.key > previous.key))
      players.set(player.userId, player);
  }
  return [...players.values()];
}

/**
 * A presence sync only re-reads identity, and it carries the pose each client tracked
 * when it joined. Taking that pose would snap everyone back to their spawn point
 * whenever anybody enters or leaves the map, so movement already received wins.
 */
export function mergePresence(
  prev: RemotePlayerState[],
  fresh: RemotePlayerState[],
): RemotePlayerState[] {
  if (prev.length === 0) return fresh;
  const known = new Map(prev.map((p) => [p.key, p]));
  return fresh.map((next) => {
    const old = known.get(next.key);
    if (!old) return next;
    return {
      ...next,
      ...poseExtras(old as unknown as Record<string, unknown>),
      x: old.x,
      y: old.y,
      dir: old.dir,
      moving: old.moving,
      updatedAt: old.updatedAt,
    };
  });
}

export interface PoseUpdate {
  [field: string]: unknown;
  key: string;
  x: unknown;
  y: unknown;
  dir: unknown;
  moving: unknown;
}

/** Applies one movement broadcast; unknown keys are ignored until presence arrives. */
export function applyPose(
  roster: RemotePlayerState[],
  update: PoseUpdate,
  now: number,
): RemotePlayerState[] {
  const x = finite(update.x);
  const y = finite(update.y);
  if (x === null || y === null) return roster;
  return roster.map((p) =>
    p.key === update.key
      ? {
          ...p,
          ...poseExtras(update),
          x,
          y,
          dir: parseDir(update.dir),
          moving: update.moving === true,
          updatedAt: now,
        }
      : p,
  );
}

/** Drops connections that stopped talking (closed laptop, lost network). */
export function pruneStale(
  roster: RemotePlayerState[],
  now: number,
  ttlMs = 15000,
): RemotePlayerState[] {
  return roster.filter((p) => now - p.updatedAt <= ttlMs);
}

export interface PublishOptions {
  /** Never send faster than this, even while running. */
  minGapMs?: number;
  /** Send at least this often while standing still, so remote players stay alive. */
  heartbeatMs?: number;
  /** Smaller moves are noise, not movement. */
  minStepPx?: number;
}

/** Decides whether a movement update is worth a network packet. */
export function shouldPublish(
  prev: Pose | null,
  next: Pose,
  sinceMs: number,
  opts: PublishOptions = {},
): boolean {
  const minGapMs = opts.minGapMs ?? 100;
  const heartbeatMs = opts.heartbeatMs ?? 1000;
  const minStepPx = opts.minStepPx ?? 2;
  if (sinceMs < minGapMs) return false;
  if (!prev) return true;
  if (prev.dir !== next.dir || prev.moving !== next.moving) return true;
  if (
    prev.visualDir !== next.visualDir ||
    prev.mount !== next.mount ||
    prev.showMount !== next.showMount ||
    prev.pkMode !== next.pkMode ||
    prev.child !== next.child ||
    prev.combat?.hp !== next.combat?.hp ||
    prev.realm !== next.realm
  )
    return true;
  if (Math.hypot(next.x - prev.x, next.y - prev.y) >= minStepPx) return true;
  return sinceMs >= heartbeatMs;
}

/** Frame-rate independent easing factor (half the gap closes every halfLifeMs). */
export function smoothing(dt: number, halfLifeMs = 90): number {
  if (dt <= 0) return 0;
  return 1 - Math.pow(0.5, dt / halfLifeMs);
}

/**
 * Moves a rendered sprite towards its last known position. A jump larger than
 * `snapDistance` is a teleport (map change, respawn), so it is applied directly.
 */
export function stepToward(
  from: { x: number; y: number },
  to: { x: number; y: number },
  dt: number,
  halfLifeMs = 90,
  snapDistance = 900,
): { x: number; y: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.hypot(dx, dy) > snapDistance) return { x: to.x, y: to.y };
  const k = smoothing(dt, halfLifeMs);
  return { x: from.x + dx * k, y: from.y + dy * k };
}
