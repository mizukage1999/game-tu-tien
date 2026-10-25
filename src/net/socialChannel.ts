import type { SupabaseClient } from '@supabase/supabase-js';
import { resetSupabaseChannel } from './channelReset';
import { supabase } from './supabase';
import {
  parseProfile,
  parseSocialMessage,
  parseSocialRoster,
  type PublicProfile,
  type SocialMessage,
  type SocialPresence,
} from './social';

export interface SocialChannel {
  readonly selfKey: string;
  /** Re-tracks presence after level, realm, map or party changed. Only the fields given are patched. */
  update(patch: Partial<PublicProfile>): void;
  /** Sends one message addressed to a single other player. */
  send(message: SocialMessage): void;
  onRoster(fn: (roster: SocialPresence[]) => void): () => void;
  onMessage(fn: (message: SocialMessage) => void): () => void;
  /** Raw Supabase presence map — diagnostics only, the roster above is the parsed view. */
  presenceState(): Record<string, unknown[]>;
  leave(): Promise<void>;
}

/**
 * One global presence channel for the whole game, separate from the per-map world
 * channel: parties and friendships must survive walking through a portal.
 *
 * Presence carries identity only (who is online, at which level, in which party);
 * everything else is a targeted broadcast, dropped unless `to` names us, so a
 * stranger cannot spam an invite without first being on our screen.
 */
export function joinSocialChannel(
  profile: PublicProfile,
  client: SupabaseClient | null = supabase,
): SocialChannel | null {
  if (!client) return null;

  // Keyed by account, so opening a second tab updates the same slot instead of
  // showing the same player twice.
  const selfKey = profile.userId;
  resetSupabaseChannel(client, 'social');
  const channel = client.channel('social', {
    config: { presence: { key: selfKey }, broadcast: { self: false } },
  });

  let roster: SocialPresence[] = [];
  let closed = false;
  let ready = false;
  const rosterListeners = new Set<(roster: SocialPresence[]) => void>();
  const messageListeners = new Set<(message: SocialMessage) => void>();

  const emitRoster = () => {
    for (const fn of rosterListeners) fn(roster);
  };
  const emitMessage = (message: SocialMessage) => {
    for (const fn of messageListeners) fn(message);
  };

  const readPresence = () => {
    if (closed) return;
    const state = channel.presenceState() as Record<string, unknown[] | undefined>;
    roster = parseSocialRoster(state, selfKey, Date.now());
    emitRoster();
  };

  channel.on('presence', { event: 'sync' }, readPresence);
  channel.on('presence', { event: 'join' }, readPresence);
  channel.on('presence', { event: 'leave' }, readPresence);
  channel.on('broadcast', { event: 'social' }, (message) => {
    if (closed) return;
    const payload = message.payload as Record<string, unknown> | undefined;
    if (!payload) return;
    const parsed = parseSocialMessage(payload);
    if (!parsed || parsed.to !== selfKey) return;
    emitMessage(parsed);
  });

  let current = { ...profile };
  /**
   * The wire format is snake_case, matching the world channel and `parseProfile`:
   * tracking camelCase fields made every entry look like it had no account id, so
   * the roster stayed empty while broadcast still worked.
   */
  const presencePayload = () => ({
    user_id: current.userId,
    name: current.name,
    sex: current.sex,
    hero_id: current.heroId,
    level: current.level,
    realm: current.realm,
    map_id: current.mapId,
    party: current.party,
    sect: current.sect ?? null,
  });
  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      ready = true;
      void channel.track(presencePayload());
      return;
    }
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      ready = false;
      console.warn('[net] social channel không kết nối được', status);
    }
  });

  return {
    selfKey,
    update(patch) {
      current = { ...current, ...patch };
      if (closed || !ready) return;
      void channel.track(presencePayload());
    },
    send(message) {
      if (closed || !ready) return;
      void channel.send({ type: 'broadcast', event: 'social', payload: message });
    },
    onRoster(fn) {
      rosterListeners.add(fn);
      fn(roster);
      return () => {
        rosterListeners.delete(fn);
      };
    },
    onMessage(fn) {
      messageListeners.add(fn);
      return () => {
        messageListeners.delete(fn);
      };
    },
    presenceState() {
      return channel.presenceState() as Record<string, unknown[]>;
    },
    async leave() {
      closed = true;
      rosterListeners.clear();
      messageListeners.clear();
      await client.removeChannel(channel);
    },
  };
}

/** Re-exported so callers only need one import for the channel and its profile type. */
export { parseProfile };
export type { PublicProfile };
