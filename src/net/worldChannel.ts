import type { SupabaseClient } from '@supabase/supabase-js';
import type { HeroId } from '../data/heroes';
import { resetSupabaseChannel } from './channelReset';
import { supabase } from './supabase';
import { parseWorldEvent, type WorldEvent } from './worldProtocol';
import {
  applyPose,
  mergePresence,
  parseRoster,
  pruneStale,
  shouldPublish,
  uniqueWorldPlayers,
  type Pose,
  type RemotePlayerState,
  type Sex,
} from './presence';

export interface WorldChannelOptions {
  heroId?: HeroId;
  mapId: string;
  userId: string;
  name: string;
  sex: Sex;
  realm: string;
  party?: string | null;
  pose: Pose;
}

export interface WorldChannel {
  readonly selfKey: string;
  readonly authority: string | null;
  readonly connected: boolean;
  send(event: WorldEvent): void;
  onEvent(fn: (event: WorldEvent, from: string) => void): () => void;
  readonly mapId: string;
  /** Cheap to call every frame: throttling and change detection happen inside. */
  publish(pose: Pose): void;
  onRoster(fn: (roster: RemotePlayerState[]) => void): () => void;
  setParty(partyId: string | null): void;
  leave(): Promise<void>;
}

/**
 * One Realtime channel per map: presence carries identity (joined once), broadcast
 * carries movement (~10 updates/s). Dungeons are instanced per player, so callers
 * skip them instead of sharding the channel further.
 */
export function joinWorldChannel(
  opts: WorldChannelOptions,
  client: SupabaseClient | null = supabase,
): WorldChannel | null {
  if (!client) return null;

  // Unique per connection while the global account lease removes the prior session.
  // Rejoining another map must still be distinguishable from an old connection.
  const selfKey = `${opts.userId}:${Math.random().toString(36).slice(2, 8)}`;
  const joinedAt = Date.now();
  const elect = () =>
    [
      { key: selfKey, joinedAt },
      ...roster.map((p) => ({ key: p.key, joinedAt: p.joinedAt ?? 0 })),
    ].sort((a, b) => a.joinedAt - b.joinedAt || a.key.localeCompare(b.key))[0].key;
  resetSupabaseChannel(client, `world:${opts.mapId}`);
  const channel = client.channel(`world:${opts.mapId}`, {
    config: { presence: { key: selfKey }, broadcast: { self: false } },
  });

  let roster: RemotePlayerState[] = [];
  let lastPose: Pose | null = null;
  let lastSentAt = 0;
  let closed = false;
  // Before SUBSCRIBED, send() silently falls back to the REST API; wait for the socket.
  let ready = false;
  const listeners = new Set<(roster: RemotePlayerState[]) => void>();
  const events = new Set<(event: WorldEvent, from: string) => void>();
  let authority: string | null = null;

  const emit = () => {
    for (const fn of listeners) fn(roster);
  };

  const readPresence = () => {
    if (closed) return;
    const state = channel.presenceState() as Record<string, unknown[] | undefined>;
    roster = uniqueWorldPlayers(mergePresence(roster, parseRoster(state, selfKey, Date.now())), opts.userId);
    authority = elect();
    emit();
  };

  channel.on('presence', { event: 'sync' }, readPresence);
  channel.on('presence', { event: 'join' }, readPresence);
  channel.on('presence', { event: 'leave' }, readPresence);
  channel.on('broadcast', { event: 'pose' }, (message) => {
    if (closed) return;
    const payload = message.payload as Record<string, unknown> | undefined;
    if (!payload || payload.key === selfKey) return;
    const now = Date.now();
    roster = pruneStale(
      applyPose(
        roster,
        {
          ...payload,
          key: String(payload.key ?? ''),
          x: payload.x,
          y: payload.y,
          dir: payload.dir,
          moving: payload.moving,
        },
        now,
      ),
      now,
    );
    authority = elect();
    emit();
  });
  channel.on('broadcast', { event: 'combat' }, (message) => {
    if (closed) return;
    const payload = message.payload as { key?: unknown; event?: unknown } | undefined;
    if (!payload || typeof payload.key !== 'string' || !roster.some((p) => p.key === payload.key))
      return;
    const event = parseWorldEvent(payload.event);
    if (event) for (const fn of events) fn(event, payload.key);
  });

  channel.subscribe((status) => {
    if (closed) return;
    ready = status === 'SUBSCRIBED';
    if (status === 'SUBSCRIBED') {
      void channel.track({
        user_id: opts.userId,
        joinedAt,
        name: opts.name,
        sex: opts.sex,
        hero_id: opts.heroId,
        realm: opts.realm,
        party: opts.party ?? null,
        ...opts.pose,
      });
      return;
    }
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      console.warn('[net] realtime channel không kết nối được', status, opts.mapId);
    }
  });

  let currentParty: string | null = opts.party ?? null;
  return {
    selfKey,
    get authority() {
      return ready ? authority : null;
    },
    get connected() {
      return ready;
    },
    send(event) {
      if (closed || !ready) return;
      void channel.send({ type: 'broadcast', event: 'combat', payload: { key: selfKey, event } });
      for (const fn of events) fn(event, selfKey);
    },
    onEvent(fn) {
      events.add(fn);
      return () => {
        events.delete(fn);
      };
    },
    mapId: opts.mapId,
    publish(pose) {
      if (closed || !ready) return;
      const now = Date.now();
      if (!shouldPublish(lastPose, pose, now - lastSentAt)) return;
      lastPose = pose;
      lastSentAt = now;
      void channel.send({ type: 'broadcast', event: 'pose', payload: { key: selfKey, ...pose } });
    },
    onRoster(fn) {
      listeners.add(fn);
      fn(roster);
      return () => {
        listeners.delete(fn);
      };
    },
    setParty(partyId) {
      currentParty = partyId ?? null;
      if (closed || !ready) return;
      void channel.track({
        user_id: opts.userId,
        joinedAt,
        name: opts.name,
        sex: opts.sex,
        hero_id: opts.heroId,
        realm: opts.realm,
        ...(lastPose ?? opts.pose),
        party: currentParty,
      });
    },
    async leave() {
      closed = true;
      ready = false;
      authority = null;
      listeners.clear();
      events.clear();
      await client.removeChannel(channel);
    },
  };
}
