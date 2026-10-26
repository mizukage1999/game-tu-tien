import type { SaveData } from '../game/systems/save';
import { loadGame, setSaveSink, writeSnapshot } from '../game/systems/save';
import { supabase } from './supabase';
import { setAccountState } from './session';
import { pickNewer } from './merge';
import { activeSessionId } from './activeSession';

let activeUser: string | null = null;
let pushing = false;
let queued: { userId: string; data: SaveData } | null = null;
let lastError: string | null = null;

export async function pullCloudSave(userId: string): Promise<SaveData | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('saves')
    .select('data')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    if (activeUser !== userId || !activeSessionId(userId)) return null;
    lastError = error.message;
    setAccountState({ status: 'error', error: `Không tải được save trên cloud: ${error.message}` });
    return null;
  }
  return (data as { data: SaveData } | null)?.data ?? null;
}

async function pushNow(userId: string, data: SaveData) {
  if (!supabase) return;
  const instance = activeSessionId(userId);
  if (!instance || activeUser !== userId) return;
  const { error } = await supabase.rpc('save_game_snapshot', {
    p_instance_id: instance,
    p_snapshot: data,
  });
  if (activeSessionId(userId) !== instance || activeUser !== userId) return;
  if (error) {
    lastError = error.message;
    setAccountState({ status: 'error', error: `Chưa lưu được lên cloud: ${error.message}` });
    return;
  }
  lastError = null;
  setAccountState({ status: 'saved', error: null });
}

/**
 * One request at a time; saves that land while a push is running are merged into
 * a single follow-up push so the newest snapshot always ends up on the server.
 */
async function pushSave(userId: string, data: SaveData) {
  if (activeUser !== userId || !activeSessionId(userId)) return;
  if (pushing) {
    queued = { userId, data };
    return;
  }
  pushing = true;
  setAccountState({ status: 'syncing' });
  try {
    await pushNow(userId, data);
    while (queued) {
      const next = queued;
      queued = null;
      await pushNow(next.userId, next.data);
    }
  } finally {
    pushing = false;
  }
}

/** Registers the sync sink. Called once per sign-in, before the game boots. */
export function attachCloudSync(userId: string) {
  activeUser = userId;
  setSaveSink((data) => {
    if (activeUser) void pushSave(activeUser, data);
  });
}

export function detachCloudSync() {
  activeUser = null;
  queued = null;
  setSaveSink(null);
}

export async function deleteCloudSave(userId: string): Promise<void> {
  if (!supabase) return;
  const instance = activeSessionId(userId);
  if (!instance) return;
  const { error } = await supabase.rpc('delete_game_snapshot', { p_instance_id: instance });
  if (error) throw new Error(error.message);
}

/**
 * Reconciles the browser cache with the server before the game world starts.
 * The newer snapshot is written back into localStorage, which is what the store
 * reads when it initialises.
 */
export async function hydrateFromCloud(userId: string): Promise<void> {
  const cloud = await pullCloudSave(userId);
  if (activeUser !== userId || !activeSessionId(userId)) return;
  const local = loadGame();
  let winner = pickNewer(local, cloud);
  const localWon = !!local && winner === local;
  if (!winner) {
    // Keep a pull error visible instead of overwriting it with a cheerful status.
    if (!lastError) setAccountState({ status: 'idle', error: null });
    return;
  }
  // The server may have resolved a legacy duplicate name. Progress still merges
  // by timestamp, but a newer browser cache cannot restore the old duplicate.
  if (cloud?.player?.name && winner.player.name !== cloud.player.name)
    winner = { ...winner, player: { ...winner.player, name: cloud.player.name } };
  if (winner !== local) writeSnapshot(winner);
  // The local cache was ahead (played offline or on another tab): push it up.
  if (localWon) void pushSave(userId, winner);
}
