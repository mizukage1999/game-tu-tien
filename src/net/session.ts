import { useSyncExternalStore } from 'react';
import type { User } from '@supabase/supabase-js';
import { onlineEnabled } from './config';

export type CloudStatus = 'offline' | 'idle' | 'syncing' | 'saved' | 'error';

export interface AccountState {
  user: User | null;
  status: CloudStatus;
  error: string | null;
  /** True until the first session check finished, so the UI does not flash the login screen. */
  booting: boolean;
}

let state: AccountState = {
  user: null,
  status: onlineEnabled ? 'idle' : 'offline',
  error: null,
  booting: onlineEnabled,
};

const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

export function getAccountState(): AccountState {
  return state;
}

export function setAccountState(patch: Partial<AccountState>) {
  state = { ...state, ...patch };
  emit();
}

export function subscribeAccount(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useAccount(): AccountState {
  return useSyncExternalStore(subscribeAccount, getAccountState, getAccountState);
}

/** Guest = anonymous account: progress is on the server, but there are no credentials yet. */
export function isGuest(user: User | null): boolean {
  return Boolean(user?.is_anonymous);
}

export function accountLabel(user: User | null): string {
  if (!user) return 'Khách';
  const username = (user.user_metadata?.username as string | undefined)?.trim();
  if (username) return username;
  if (user.email && !user.email.endsWith('@players.tutien.invalid')) return user.email;
  return 'Khách';
}
