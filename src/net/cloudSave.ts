import type { SaveData } from '../game/systems/save';
import { loadGame, setSaveSink, writeSnapshot } from '../game/systems/save';
import { supabase } from './supabase';
import { setAccountState } from './session';
import { pickNewer } from './merge';

/** Row shape in public.saves: one row per player. */
interface SaveRow {
  user_id: string;
  data: SaveData;
  updated_at: string;
}

let activeUser: string | null = null;
let pushing = false;
let queued: SaveData | null = null;
let lastError: string | null = null;

export async function pullCloudSave(userId: string): Promise<SaveData | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('saves').select('data').eq('user_id', userId).maybeSingle();
  if (error) {
    lastError = error.message;
    setAccountState({ status: 'error', error: `Không tải được save trên cloud: ${error.message}` });
    return null;
  }
  return (data as { data: SaveData } | null)?.data ?? null;
}

async function pushNow(userId: string, data: SaveData) {
  if (!supabase) return;
  const row: SaveRow = { user_id: userId, data, updated_at: new Date().toISOString() };
  const { error } = await supabase.from('saves').upsert(row, { onConflict: 'user_id' });
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
  if (pushing) {
    queued = data;
    return;
  }
  pushing = true;
  setAccountState({ status: 'syncing' });
  try {
    await pushNow(userId, data);
    while (queued) {
      const next = queued;
      queued = null;
      await pushNow(userId, next);
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
  setSaveSink(null);
}

export async function deleteCloudSave(userId: string): Promise<void> {
  if (!supabase) return;
  await supabase.from('saves').delete().eq('user_id', userId);
}

/**
 * Reconciles the browser cache with the server before the game world starts.
 * The newer snapshot is written back into localStorage, which is what the store
 * reads when it initialises.
 */
export async function hydrateFromCloud(userId: string): Promise<void> {
  const cloud = await pullCloudSave(userId);
  const local = loadGame();
  const winner = pickNewer(local, cloud);
  if (!winner) {
    // Keep a pull error visible instead of overwriting it with a cheerful status.
    if (!lastError) setAccountState({ status: 'idle', error: null });
    return;
  }
  if (winner !== local) writeSnapshot(winner);
  // The local cache was ahead (played offline or on another tab): push it up.
  if (local && winner === local) void pushSave(userId, local);
}
