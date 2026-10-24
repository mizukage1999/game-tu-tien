import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { supabase } from './supabase';
export interface PremiumState {
  balance: number;
  items: string[];
  admin: boolean;
  loaded: boolean;
  busy: boolean;
  error: string | null;
}
export const premiumStore = createStore<PremiumState>()(() => ({
  balance: 0,
  items: [],
  admin: false,
  loaded: false,
  busy: false,
  error: null,
}));
let epoch = 0;
function applyStatus(raw: unknown) {
  const r = raw as { balance?: number; items?: unknown; admin?: boolean };
  premiumStore.setState({
    balance: Math.max(0, Number(r.balance) || 0),
    items: Array.isArray(r.items) ? r.items.filter((i): i is string => typeof i === 'string') : [],
    admin: r.admin === true,
    loaded: true,
    error: null,
  });
}
export function resetPremium() {
  epoch++;
  premiumStore.setState({
    balance: 0,
    items: [],
    admin: false,
    loaded: false,
    busy: false,
    error: null,
  });
}
export async function refreshPremium() {
  if (!supabase) return;
  const requestEpoch = epoch;
  const { data, error } = await supabase.rpc('premium_status');
  if (requestEpoch !== epoch) return;
  if (error) {
    premiumStore.setState({ error: error.message, loaded: false });
    return;
  }
  applyStatus(data);
}
export async function exchangePremium() {
  if (!supabase || premiumStore.getState().busy) return false;
  const requestEpoch = epoch;
  premiumStore.setState({ busy: true, error: null });
  try {
    const { data, error } = await supabase.rpc('exchange_tien_ngoc', {
      offer: 'tien_phap_bao',
      request_key: crypto.randomUUID(),
    });
    if (requestEpoch !== epoch) return false;
    if (error) throw error;
    applyStatus(data);
    return true;
  } catch (error) {
    if (requestEpoch !== epoch) return false;
    premiumStore.setState({
      error:
        error instanceof Error
          ? error.message
          : String((error as { message?: string }).message ?? error),
    });
    return false;
  } finally {
    if (requestEpoch === epoch) premiumStore.setState({ busy: false });
  }
}
export async function grantPremium(username: string, amount: number, note: string) {
  if (!supabase || premiumStore.getState().busy) return;
  const requestEpoch = epoch;
  premiumStore.setState({ busy: true, error: null });
  try {
    const { error } = await supabase.rpc('admin_grant_tien_ngoc', {
      target_username: username,
      amount,
      note,
      request_key: crypto.randomUUID(),
    });
    if (requestEpoch !== epoch) return;
    if (error) throw error;
    await refreshPremium();
  } catch (error) {
    if (requestEpoch !== epoch) return;
    premiumStore.setState({ error: String((error as { message?: string }).message ?? error) });
  } finally {
    if (requestEpoch === epoch) premiumStore.setState({ busy: false });
  }
}
export function usePremium() {
  return useStore(premiumStore);
}
