import type { SupabaseClient } from '@supabase/supabase-js';

interface LiveChannel {
  topic: string;
  unsubscribe: () => Promise<unknown>;
}

/**
 * Supabase keeps exactly one channel instance per topic, and a channel that has
 * already been subscribed refuses new callbacks ("cannot add `presence` callbacks
 * … after `subscribe()`"). After a scene restart, a fast re-login or a hot reload
 * the old instance is still registered, so `channel()` handed it back, the
 * callback registration threw, and both the world roster and the social channel
 * went dead — which is why neither remote players nor friend requests arrived.
 *
 * Dropping the stale instance (and unsubscribing it) before subscribing a fresh
 * one keeps every join a clean slate.
 */
export function resetSupabaseChannel(client: SupabaseClient, topic: string): void {
  const fullTopic = `realtime:${topic}`;
  const registry = client.getChannels() as unknown as LiveChannel[];
  for (let i = registry.length - 1; i >= 0; i--) {
    const existing = registry[i];
    if (existing.topic !== fullTopic && existing.topic !== topic) continue;
    void existing.unsubscribe();
    // Remove from the client's own registry now, not when unsubscribe resolves:
    // channel() would otherwise hand the dying instance straight back to us.
    registry.splice(i, 1);
  }
}
