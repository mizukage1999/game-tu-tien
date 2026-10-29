import { disableSaving, setSaveScope } from '../game/systems/save';
import type { User } from '@supabase/supabase-js';
import { onlineEnabled } from './config';
import { supabase } from './supabase';
import { setAccountState } from './session';
import { refreshServerControl, serverControlStore } from './serverControl';
import { attachCloudSync, detachCloudSync, hydrateFromCloud } from './cloudSave';
import {
  activateSession,
  stopActiveSession,
  activeSessionId,
  SESSION_REPLACED,
} from './activeSession';

let started = false;
let hydratedFor: string | null = null;
let epoch = 0;
let replaced = false;

/** End only this page's game session; keep Supabase Auth available to the admin dashboard. */
export function endGameSession(message = SESSION_REPLACED) {
  replaced = true;
  epoch++;
  stopActiveSession();
  detachCloudSync();
  disableSaving();
  setAccountState({ user: null, booting: false, status: 'idle', error: message });
}

function onReplaced() {
  void refreshServerControl()
    .then((data) => {
      if (data) serverControlStore.setState(data);
    })
    .catch(() => {});
  // Do not call auth.signOut(): shared browser storage could log out the winning tab.
  endGameSession();
}

async function applySession(user: User | null) {
  if (replaced) return;
  const version = ++epoch;
  const userId = user?.id ?? null;
  if (!userId || !user) {
    detachCloudSync();
    stopActiveSession();
    hydratedFor = null;
    setSaveScope(null);
    setAccountState({ user: null, booting: false });
    return;
  }
  try {
    if (!(await activateSession(userId, onReplaced))) return;
  } catch (error) {
    if (version !== epoch) return;
    if (String((error as { message?: string })?.message).includes('GAME_ACCESS_BLOCKED')) {
      const control = await refreshServerControl();
      if (version !== epoch) return;
      if (control) serverControlStore.setState(control);
    }
    stopActiveSession();
    detachCloudSync();
    console.warn('[net] account session unavailable', error);
    setAccountState({
      user: null,
      booting: false,
      status: 'error',
      error:
        'Không xác nhận được phiên chơi. Hãy kiểm tra kết nối, thử lại hoặc liên hệ quản trị viên.',
    });
    return;
  }
  if (version !== epoch || !activeSessionId(userId)) return;
  setSaveScope(userId);
  attachCloudSync(userId);
  if (hydratedFor !== userId) {
    hydratedFor = userId;
    await hydrateFromCloud(userId);
  }
  if (version === epoch && activeSessionId(userId)) setAccountState({ user, booting: false });
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
    await applySession(data.session?.user ?? null);
  } catch (err) {
    // Offline or a bad project URL: fall back to local play instead of a blank screen.
    console.error('[net] session lookup failed', err);
    setAccountState({ booting: false, status: 'offline', error: 'Không kết nối được server.' });
  }

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') hydratedFor = null;
    // Deferred: supabase-js can deadlock when its own API is awaited inside this callback.
    setTimeout(() => void applySession(session?.user ?? null), 0);
  });
}
