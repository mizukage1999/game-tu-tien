import type { Duelist } from '../game/systems/duel';
import { parsePartyDungeonPacket, type PartyDungeonPacket } from '../game/systems/partyDungeon';
import type { FriendRef, Sex } from '../game/systems/save';
import { SKILLS, type SkillId } from '../data';
import { isHeroId, type HeroId } from '../data/heroes';
import { parseWhisperKey, type WhisperKey } from './whisperCrypto';
import { parseInspection, type PlayerInspection } from './inspection';
import {
  validArenaInput,
  validateArenaSnapshot,
  type ArenaInput,
  type ArenaSnapshot,
} from '../game/systems/arena';

/** The save file owns the shape; re-exported here so social code needs one import. */
export type { FriendRef };

/** One account as everyone else can see it. Kept small: this rides on presence. */
export interface PublicProfile {
  chatKey?: WhisperKey;
  heroId?: HeroId;
  userId: string;
  name: string;
  sex: Sex;
  level: number;
  realm: string;
  mapId: string;
  /** Party id shared by every member, or null when solo. */
  party: string | null;
  /** Registered sect, when supplied by newer clients. Never infer it from the current map. */
  sect?: 'dai_thua_vien' | 'linh_son_tong';
}

export interface SocialPresence extends PublicProfile {
  key: string;
  updatedAt: number;
}

export type SocialMessage =
  | { t: 'dungeon'; to: string; from: string; packet: PartyDungeonPacket }
  | { t: 'inspect:ask'; to: string; from: string; nonce: string }
  | { t: 'inspect:result'; to: string; from: string; nonce: string; inspection: PlayerInspection }
  | {
      t: 'chat:private';
      to: string;
      from: FriendRef;
      id: string;
      key: WhisperKey;
      iv: string;
      data: string;
    }
  | { t: 'arena:ready'; to: string; from: string; nonce: string }
  | { t: 'arena:input'; to: string; from: string; nonce: string; input: ArenaInput }
  | { t: 'arena:state'; to: string; from: string; nonce: string; snapshot: ArenaSnapshot }
  | { t: 'arena:leave'; to: string; from: string; nonce: string }
  | { t: 'duel:ask'; to: string; from: FriendRef; nonce: string; duelist: Duelist }
  | { t: 'duel:ok'; to: string; from: FriendRef; nonce: string; duelist: Duelist }
  | { t: 'duel:no'; to: string; from: string }
  | { t: 'party:invite'; to: string; from: FriendRef; partyId: string }
  | { t: 'party:join'; to: string; from: FriendRef; partyId: string }
  | { t: 'party:end'; to: string; from: string; partyId: string }
  | { t: 'friend:ask'; to: string; from: FriendRef }
  | { t: 'friend:ok'; to: string; from: FriendRef }
  | { t: 'friend:no'; to: string; from: string };

export const FRIEND_CAP = 30;
/** A challenge nobody answers should not stay clickable forever. */
export const INVITE_TTL_MS = 45000;

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

function ref(value: unknown): FriendRef | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const userId = text(raw.userId, 64);
  if (!userId) return null;
  return { userId, name: text(raw.name, 16).trim() || 'Đạo hữu' };
}

function number(value: unknown, fallback: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(Math.max(value, 0), max)
    : fallback;
}

function duelist(value: unknown): Duelist | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const userId = text(raw.userId, 64);
  if (!userId) return null;
  const maxHp = Math.round(number(raw.maxHp, 100, 10_000_000));
  return {
    userId,
    ...(isHeroId(raw.heroId) ? { heroId: raw.heroId } : {}),
    sex: raw.sex === 'male' ? 'male' : 'female',
    maxMp: number(raw.maxMp, 160, 100000),
    loadout: Array.isArray(raw.loadout)
      ? [...new Set(raw.loadout)]
          .filter(
            (id): id is SkillId =>
              typeof id === 'string' && Object.prototype.hasOwnProperty.call(SKILLS, id),
          )
          .slice(0, 7)
      : undefined,
    skillLevels:
      raw.skillLevels && typeof raw.skillLevels === 'object'
        ? Object.fromEntries(
            Object.entries(raw.skillLevels).filter(
              ([id, v]) =>
                Object.prototype.hasOwnProperty.call(SKILLS, id) &&
                typeof v === 'number' &&
                Number.isInteger(v) &&
                v >= 1 &&
                v <= 10,
            ),
          )
        : undefined,
    name: text(raw.name, 16).trim() || 'Đạo hữu',
    level: Math.round(number(raw.level, 1, 999)),
    realm: text(raw.realm, 40),
    hp: maxHp,
    maxHp,
    atk: number(raw.atk, 10, 1_000_000),
    def: number(raw.def, 0, 1_000_000),
    critRate: number(raw.critRate, 0, 1),
    critMul: number(raw.critMul, 1.5, 10),
    speed: number(raw.speed, 100, 10_000),
  };
}

/**
 * Everything arriving here was written by another player's browser, so every field
 * is validated and clamped; a malformed message is dropped instead of applied.
 */
export function parseSocialMessage(raw: unknown): SocialMessage | null {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw as Record<string, unknown>;
  const t = text(m.t, 20);
  const to = text(m.to, 64);
  if (!to) return null;
  if (t === 'dungeon') {
    const from = text(m.from, 64), packet = parsePartyDungeonPacket(m.packet);
    return from && packet ? { t, to, from, packet } : null;
  }
  if (t === 'inspect:ask' || t === 'inspect:result') {
    const from = text(m.from, 64),
      nonce = text(m.nonce, 64);
    if (!from || !nonce) return null;
    if (t === 'inspect:ask') return { t, to, from, nonce };
    const inspection = parseInspection(m.inspection);
    return inspection && inspection.userId === from ? { t, to, from, nonce, inspection } : null;
  }
  if (t === 'chat:private') {
    const from = ref(m.from),
      key = parseWhisperKey(m.key),
      id = text(m.id, 100),
      iv = text(m.iv, 30),
      data = text(m.data, 2048);
    if (
      !from ||
      !key ||
      !id ||
      !/^[A-Za-z0-9+/]{16}$/.test(iv) ||
      data.length < 24 ||
      data.length >= 2048 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(data)
    )
      return null;
    return { t, to, from, key, id, iv, data };
  }
  if (t.startsWith('arena:')) {
    const from = text(m.from, 64),
      nonce = text(m.nonce, 32);
    if (!from || !nonce) return null;
    if (t === 'arena:ready' || t === 'arena:leave') return { t, to, from, nonce };
    if (t === 'arena:input' && validArenaInput(m.input))
      return { t, to, from, nonce, input: m.input };
    if (t === 'arena:state' && validateArenaSnapshot(m.snapshot, nonce))
      return { t, to, from, nonce, snapshot: m.snapshot };
    return null;
  }

  if (t === 'duel:ask' || t === 'duel:ok') {
    const from = ref(m.from);
    const fighter = duelist(m.duelist);
    const nonce = text(m.nonce, 32);
    if (!from || !fighter || !nonce || fighter.userId !== from.userId || fighter.maxHp < 1)
      return null;
    return { t, to, from, nonce, duelist: fighter };
  }
  if (t === 'party:invite' || t === 'party:join') {
    const from = ref(m.from);
    const partyId = text(m.partyId, 64);
    if (!from || !partyId) return null;
    return { t, to, from, partyId };
  }
  if (t === 'duel:no' || t === 'friend:no' || t === 'party:end') {
    const from = text(m.from, 64);
    if (!from) return null;
    if (t === 'party:end') {
      const partyId = text(m.partyId, 64);
      if (!partyId) return null;
      return { t, to, from, partyId };
    }
    return { t, to, from };
  }
  if (t === 'friend:ask' || t === 'friend:ok') {
    const from = ref(m.from);
    if (!from) return null;
    return { t, to, from };
  }
  return null;
}

export function parseProfile(key: string, raw: unknown, now: number): SocialPresence | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  const userId = text(p.user_id, 64);
  if (!userId) return null;
  const party = text(p.party, 64);
  return {
    key,
    userId,
    name: text(p.name, 16).trim() || 'Đạo hữu',
    ...(parseWhisperKey(p.chat_key) ? { chatKey: parseWhisperKey(p.chat_key) } : {}),
    sex: p.sex === 'male' ? 'male' : 'female',
    ...(isHeroId(p.hero_id) ? { heroId: p.hero_id } : {}),
    level: Math.round(number(p.level, 1, 999)),
    realm: text(p.realm, 40),
    mapId: text(p.map_id, 40) || 'dai_thua_vien',
    party: party || null,
    ...(p.sect === 'dai_thua_vien' || p.sect === 'linh_son_tong' ? { sect: p.sect } : {}),
    updatedAt: now,
  };
}

/** Flattens Supabase presence state, always dropping our own account. */
export function parseSocialRoster(
  state: Record<string, unknown[] | undefined>,
  selfUserId: string,
  now: number,
): SocialPresence[] {
  const roster: SocialPresence[] = [];
  for (const [key, entries] of Object.entries(state)) {
    if (!Array.isArray(entries) || entries.length === 0) continue;
    const merged = entries.length > 1 ? Object.assign({}, ...entries) : entries[0];
    const profile = parseProfile(key, merged, now);
    if (profile && profile.userId !== selfUserId) roster.push(profile);
  }
  return roster;
}

/** Party members currently visible, leader included only if present. */
export function partyMembers(roster: SocialPresence[], partyId: string): SocialPresence[] {
  return roster.filter((p) => p.party === partyId).sort((a, b) => a.name.localeCompare(b.name));
}

export function isOnline(roster: SocialPresence[], userId: string): boolean {
  return roster.some((p) => p.userId === userId);
}

export function canAddFriend(friends: FriendRef[], userId: string): boolean {
  if (friends.length >= FRIEND_CAP) return false;
  return !friends.some((f) => f.userId === userId);
}

export function addFriend(friends: FriendRef[], next: FriendRef): FriendRef[] {
  if (!canAddFriend(friends, next.userId)) return friends;
  return [...friends, next];
}

export function removeFriend(friends: FriendRef[], userId: string): FriendRef[] {
  return friends.filter((f) => f.userId !== userId);
}

/** Drops stale invitations and keeps only the newest one per sender + kind. */
export function freshInvites<
  T extends { id: string; from: { userId: string }; kind: string; createdAt: number },
>(invites: T[], now: number, ttl = INVITE_TTL_MS): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const invite of [...invites].sort((a, b) => b.createdAt - a.createdAt)) {
    if (now - invite.createdAt > ttl) continue;
    const key = `${invite.kind}:${invite.from.userId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(invite);
  }
  return out.reverse();
}

/** The party id a leader hands out; the timestamp keeps rejoins from colliding. */
export function newPartyId(leaderId: string, now: number): string {
  return `${leaderId.slice(0, 8)}-${now.toString(36)}`;
}
