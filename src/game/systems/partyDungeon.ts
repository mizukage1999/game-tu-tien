import { DUNGEONS } from '../../data';
import type { PlayerSave } from './save';
import { todayKey } from './dungeon';

export interface PartyRunTicket {
  id: string;
  party: string;
  leader: string;
  dungeon: string;
  members: { userId: string; name: string }[];
  expires: number;
}
export type PartyDungeonPacket =
  { kind: 'offer'; ticket: PartyRunTicket } | { kind: 'ready' | 'start' | 'cancel'; id: string };

export function parsePartyDungeonPacket(raw: unknown): PartyDungeonPacket | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as PartyDungeonPacket;
  const id = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 80;
  if (p.kind !== 'offer')
    return ['ready', 'start', 'cancel'].includes(p.kind) && id((p as { id?: string }).id)
      ? p
      : null;
  const t = p.ticket;
  if (
    !t ||
    !id(t.id) ||
    !id(t.party) ||
    !id(t.leader) ||
    !id(t.dungeon) ||
    !DUNGEONS[t.dungeon]?.tier ||
    DUNGEONS[t.dungeon].practice ||
    !Number.isFinite(t.expires) ||
    !Array.isArray(t.members) ||
    t.members.length < 2 ||
    t.members.length > 3 ||
    t.members.some(
      (m) =>
        !m || !id(m.userId) || typeof m.name !== 'string' || !m.name.trim() || m.name.length > 32,
    ) ||
    new Set(t.members.map((m) => m.userId)).size !== t.members.length ||
    !t.members.some((m) => m.userId === t.leader)
  )
    return null;
  return {
    kind: 'offer',
    ticket: { ...t, members: t.members.map((m) => ({ userId: m.userId, name: m.name })) },
  };
}

export function resolvePartyRun(
  player: PlayerSave,
  id: string,
  refund: boolean,
  day = todayKey(),
): PlayerSave {
  const pending = player.partyRun;
  if (!pending || pending.id !== id) return player;
  let dungeons = player.dungeons;
  if (refund && dungeons?.day === day && pending.day === day) {
    const runs = { ...dungeons.runs };
    runs[pending.dungeon] = Math.max(0, (runs[pending.dungeon] ?? 0) - 1);
    dungeons = { ...dungeons, runs };
  }
  return {
    ...player,
    dungeons,
    partyRun: undefined,
    partyRunReceipts: [...(player.partyRunReceipts ?? []).filter((old) => old !== id), id].slice(
      -24,
    ),
  };
}

/** A reload returns outside the instance; recover its one paid attempt without granting rewards. */
export function recoverPartyRun(player: PlayerSave): PlayerSave {
  return player.partyRun ? resolvePartyRun(player, player.partyRun.id, true) : player;
}
