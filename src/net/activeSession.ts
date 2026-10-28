import { supabase } from './supabase';
import { SessionLease, type LeaseBackend } from './sessionLease';

export const SESSION_REPLACED = 'Phiên chơi đã kết thúc do đăng nhập mới hoặc dữ liệu được admin cập nhật. Hãy tải lại game để đồng bộ.';
let current: { userId: string; lease: SessionLease; ready: Promise<boolean> } | undefined;

export function activeSessionId(userId: string) {
  return current?.userId === userId && current.lease.active ? current.lease.instance : null;
}
export function stopActiveSession() {
  current?.lease.stop();
  current = undefined;
}

export function activateSession(userId: string, replaced: () => void): Promise<boolean> {
  if (!supabase) return Promise.resolve(false);
  if (current?.userId === userId) return current.ready;
  stopActiveSession();
  const client = supabase;
  // A new page gets a new instance; refreshing or signing in again is a takeover.
  const instance = crypto.randomUUID();
  const backend: LeaseBackend = {
    claim: (id) => client.rpc('claim_game_session', { p_instance_id: id }),
    check: (id) => client.rpc('check_game_session', { p_instance_id: id }),
    watch(changed) {
      const channel = client
        .channel(`account-session:${userId}:${instance}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'game_sessions', filter: `user_id=eq.${userId}` },
          changed,
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') changed();
        });
      const local =
        typeof BroadcastChannel === 'undefined'
          ? null
          : new BroadcastChannel(`game-session:${userId}`);
      if (local) {
        local.onmessage = changed;
        local.postMessage('changed');
      }
      const visible = () => {
        if (document.visibilityState === 'visible') changed();
      };
      window.addEventListener('focus', changed);
      document.addEventListener('visibilitychange', visible);
      return () => {
        void client.removeChannel(channel);
        local?.close();
        window.removeEventListener('focus', changed);
        document.removeEventListener('visibilitychange', visible);
      };
    },
  };
  const lease = new SessionLease(instance, backend, replaced);
  const ready = lease.start();
  current = { userId, lease, ready };
  return ready;
}
