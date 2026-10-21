import { setSaveScope } from '../game/systems/save';
import { onlineEnabled } from './config';
import { supabase } from './supabase';
import { setAccountState } from './session';
import { attachCloudSync, detachCloudSync, hydrateFromCloud } from './cloudSave';

let started = false;
let hydratedFor: string | null = null;

async function applySession(userId: string | null) {
  setSaveScope(userId);
  if (!userId) {
    detachCloudSync();
    return;
  }
  attachCloudSync(userId);
  if (hydratedFor === userId) return;
  hydratedFor = userId;
  await hydrateFromCloud(userId);
}

/**
 * Resolves who is playing and reconciles their save. Must run before the store
 * module is imported, because the store reads localStorage once at import time.
 */
export async function bootOnline(): Promise<void> {
  if (started) return;
  started = true;

  if (!onlineEnabled || !supabase) {
    setAccountState({ booting: false, status: 'offline' });
    return;
  }

  try {
    const { data } = await supabase.auth.getSession();
    setAccountState({ user: data.session?.user ?? null, booting: false });
    await applySession(data.session?.user.id ?? null);
  } catch (err) {
    // Offline or a bad project URL: fall back to local play instead of a blank screen.
    console.error('[net] session lookup failed', err);
    setAccountState({ booting: false, status: 'offline', error: 'Không kết nối được server.' });
  }

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') hydratedFor = null;
    setAccountState({ user: session?.user ?? null, booting: false });
    // Deferred: supabase-js can deadlock when its own API is awaited inside this callback.
    const userId = session?.user.id ?? null;
    setTimeout(() => void applySession(userId), 0);
  });
}
