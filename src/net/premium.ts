import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { supabase } from './supabase';
export interface PremiumTransaction {
  id: string;
  delta: number;
  reason: string;
  created_at: string;
}
export interface PremiumState {
  balance: number;
  items: string[];
  admin: boolean;
  loaded: boolean;
  busy: boolean;
  error: string | null;
  ledger: PremiumTransaction[];
  ledgerLoaded: boolean;
  ledgerBusy: boolean;
  ledgerError: string | null;
}
export const premiumStore = createStore<PremiumState>()(() => ({
  balance: 0,
  items: [],
  admin: false,
  loaded: false,
  busy: false,
  error: null,
  ledger: [],
  ledgerLoaded: false,
  ledgerBusy: false,
  ledgerError: null,
}));
let epoch = 0;
let statusRequest = 0;
function applyStatus(raw: unknown) {
  if (!raw || typeof raw !== 'object') throw new Error('Chưa đọc được số dư tài khoản.');
  const r = raw as { balance?: number | string; items?: unknown; admin?: boolean };
  const balance =
    typeof r.balance === 'number' || (typeof r.balance === 'string' && /^\d+$/.test(r.balance))
      ? Number(r.balance)
      : NaN;
  if (!Number.isSafeInteger(balance) || balance < 0)
    throw new Error('Chưa đọc được số dư tài khoản.');
  premiumStore.setState({
    balance,
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
    ledger: [],
    ledgerLoaded: false,
    ledgerBusy: false,
    ledgerError: null,
  });
}
export async function refreshPremium(duringGrant = false) {
  if (!supabase || (premiumStore.getState().busy && !duringGrant)) return;
  const requestEpoch = epoch;
  const request = ++statusRequest;
  try {
    const { data, error } = await supabase.rpc('premium_status');
    if (requestEpoch !== epoch || request !== statusRequest) return;
    if (error) throw error;
    applyStatus(data);
  } catch (error) {
    if (requestEpoch !== epoch || request !== statusRequest) return;
    premiumStore.setState({ error: errorMessage(error), loaded: false });
  }
}
const errorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : String((error as { message?: string })?.message ?? error);

/** Read-only history; RLS limits rows to the signed-in wallet owner. */
export async function refreshPremiumHistory() {
  if (!supabase || premiumStore.getState().ledgerBusy) return;
  const requestEpoch = epoch;
  premiumStore.setState({ ledgerBusy: true, ledgerError: null });
  try {
    const { data, error } = await supabase
      .from('premium_ledger')
      .select('id,delta,reason,created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    if (requestEpoch !== epoch) return;
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error('Chưa đọc được lịch sử Tiên Ngọc.');
    const ledger = data.flatMap((row) => {
      if (
        !row ||
        !Number.isSafeInteger(Number(row.delta)) ||
        typeof row.reason !== 'string' ||
        typeof row.created_at !== 'string' ||
        !Number.isFinite(Date.parse(row.created_at)) ||
        !['string', 'number'].includes(typeof row.id)
      )
        return [];
      return [
        {
          id: String(row.id),
          delta: Number(row.delta),
          reason: row.reason,
          created_at: row.created_at,
        },
      ];
    });
    premiumStore.setState({ ledger, ledgerLoaded: true });
  } catch (error) {
    if (requestEpoch === epoch) premiumStore.setState({ ledgerError: errorMessage(error) });
  } finally {
    if (requestEpoch === epoch) premiumStore.setState({ ledgerBusy: false });
  }
}
export async function exchangePremium() {
  if (!supabase || premiumStore.getState().busy) return false;
  const requestEpoch = epoch;
  statusRequest++;
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
  statusRequest++;
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
    await refreshPremium(true);
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
