import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabase';
import {
  applyPose,
  mergePresence,
  parseRoster,
  pruneStale,
  shouldPublish,
  type Pose,
  type RemotePlayerState,
  type Sex,
} from './presence';

export interface WorldChannelOptions {
  mapId: string;
  userId: string;
  name: string;
  sex: Sex;
  realm: string;
  pose: Pose;
}

export interface WorldChannel {
  readonly mapId: string;
  /** Cheap to call every frame: throttling and change detection happen inside. */
  publish(pose: Pose): void;
  onRoster(fn: (roster: RemotePlayerState[]) => void): () => void;
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

  // Unique per connection: the same account open in two tabs is two bodies, and we
  // must still be able to filter out exactly our own connection.
  const selfKey = `${opts.userId}:${Math.random().toString(36).slice(2, 8)}`;
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

  const emit = () => {
    for (const fn of listeners) fn(roster);
  };

  const readPresence = () => {
    if (closed) return;
    const state = channel.presenceState() as Record<string, unknown[] | undefined>;
    roster = mergePresence(roster, parseRoster(state, selfKey, Date.now()));
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
        { key: String(payload.key ?? ''), x: payload.x, y: payload.y, dir: payload.dir, moving: payload.moving },
        now,
      ),
      now,
    );
    emit();
  });

  channel.subscribe((status) => {
    ready = status === 'SUBSCRIBED';
    if (status === 'SUBSCRIBED') {
      void channel.track({
        user_id: opts.userId,
        name: opts.name,
        sex: opts.sex,
        realm: opts.realm,
        ...opts.pose,
      });
      return;
    }
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      console.warn('[net] realtime channel không kết nối được', status, opts.mapId);
    }
  });

  return {
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
    async leave() {
      closed = true;
      listeners.clear();
      await client.removeChannel(channel);
    },
  };
}
