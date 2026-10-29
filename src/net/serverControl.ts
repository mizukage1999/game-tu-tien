import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { supabase } from './supabase';
import { EventBus } from '../game/EventBus';
export interface BossReset {
  map_id: string;
  monster_id: string;
  revision: number;
}
export interface ServerControl {
  maintenance: boolean;
  maintenance_at?: string | null;
  blocked: boolean;
  admin: boolean;
  message: string;
  boss_resets: BossReset[];
}
export const serverControlStore = createStore<ServerControl>(() => ({
  maintenance: false,
  blocked: false,
  admin: false,
  message: '',
  boss_resets: [],
}));
export const useServerControl = () => useStore(serverControlStore);
export function maintenancePending(
  control: Pick<ServerControl, 'maintenance' | 'maintenance_at'>,
  now = Date.now(),
) {
  return (
    control.maintenance && !!control.maintenance_at && Date.parse(control.maintenance_at) > now
  );
}
export function maintenanceBlocks(
  control: Pick<ServerControl, 'maintenance' | 'maintenance_at' | 'admin'>,
  now = Date.now(),
) {
  return control.maintenance && !control.admin && !maintenancePending(control, now);
}
export async function refreshServerControl(map = ''): Promise<ServerControl | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('game_control_status', { p_map: map });
  if (error || !data) return null;
  return {
    ...data,
    maintenance_at: typeof data.maintenance_at === 'string' ? data.maintenance_at : null,
  } as ServerControl;
}
/** Polling also works when Realtime is disabled. Never infer a ban from a network error. */
export function watchServerControl(map: () => string, onBlocked: () => void) {
  let stopped = false,
    busy = false,
    lastMap = '',
    seen = new Map<string, number>();
  const poll = async () => {
    if (stopped || busy) return;
    busy = true;
    try {
      const current = map(),
        data = await refreshServerControl(current);
      if (stopped || !data) return;
      serverControlStore.setState(data);
      if (data.blocked || maintenanceBlocks(data)) {
        onBlocked();
        return;
      }
      if (lastMap === current) {
        for (const r of data.boss_resets ?? [])
          if (r.revision > (seen.get(r.monster_id) ?? 0))
            EventBus.emit('cmd:adminBossReset', { map: r.map_id, monster: r.monster_id });
      }
      seen = new Map((data.boss_resets ?? []).map((r) => [r.monster_id, r.revision]));
      lastMap = current;
    } catch {
      /* Keep playing through temporary connection errors. */
    } finally {
      busy = false;
    }
  };
  void poll();
  const timer = setInterval(() => void poll(), 2000);
  return () => {
    stopped = true;
    clearInterval(timer);
  };
}
