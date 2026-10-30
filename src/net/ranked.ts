import { createStore } from 'zustand/vanilla';
import { supabase } from './supabase';
import { activeSessionId } from './activeSession';
import { getAccountState } from './session';
import { flushCloudSave } from './cloudSave';
import { EventBus } from '../game/EventBus';
import { parseDuelist } from './social';
import type { Duelist } from '../game/systems/duel';

export interface RankedMatch {
  id: string;
  a: Duelist;
  b: Duelist;
  expiresAt: string;
}
export interface RankedProfile {
  userId: string;
  name: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
}
export interface RankedPage {
  result?: { id: string; status: string; winner: string | null; scored: boolean } | null;
  season: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  queue: boolean;
  match: RankedMatch | null;
  rows: RankedProfile[];
  status: string;
}
export const rankedStore = createStore<{
  page: RankedPage | null;
  searching: boolean;
  error: string;
  busy: boolean;
}>(() => ({ page: null, searching: false, error: '', busy: false }));
export function rankedTier(rating: number) {
  return rating >= 1600
    ? 'Thiên Tôn'
    : rating >= 1400
      ? 'Tông Sư'
      : rating >= 1200
        ? 'Chân Nhân'
        : rating >= 1100
          ? 'Tinh Anh'
          : 'Tân Tú';
}
export function parseRankedPage(raw: unknown): RankedPage | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as RankedPage;
  if (
    d.result &&
    (typeof d.result.id !== 'string' ||
      !['finished', 'disputed', 'expired', 'cancelled'].includes(d.result.status) ||
      typeof d.result.scored !== 'boolean' ||
      (d.result.winner !== null && typeof d.result.winner !== 'string'))
  )
    return null;
  const count = (n: unknown) =>
    typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 && n <= 10000000;
  if (
    typeof d.season !== 'string' ||
    !count(d.rating) ||
    ![d.wins, d.losses, d.draws].every(count) ||
    typeof d.queue !== 'boolean' ||
    typeof d.status !== 'string' ||
    !Array.isArray(d.rows) ||
    d.rows.length > 50
  )
    return null;
  if (
    d.rows.some(
      (r) =>
        !r ||
        typeof r.userId !== 'string' ||
        typeof r.name !== 'string' ||
        ![r.rating, r.wins, r.losses, r.draws].every(count),
    )
  )
    return null;
  if (d.match) {
    const a = parseDuelist(d.match.a),
      b = parseDuelist(d.match.b);
    if (
      !a ||
      !b ||
      a.userId === b.userId ||
      !d.match.id ||
      !Number.isFinite(Date.parse(d.match.expiresAt))
    )
      return null;
    d.match = { ...d.match, a, b };
  } else if (d.match !== null) return null;
  return d;
}
let generation = 0;
let pending: Promise<unknown> = Promise.resolve();
export function rankedAction(
  action: 'status' | 'join' | 'poll' | 'leave' | 'report' | 'ready',
  payload: Record<string, unknown> = {},
): Promise<RankedPage | null> {
  const version = generation,
    user = getAccountState().user?.id,
    instance = user ? activeSessionId(user) : null;
  const run = () =>
    version === generation ? requestRanked(action, payload, user, instance, version) : null;
  const result = pending.then(run, run);
  pending = result;
  return result;
}
async function requestRanked(
  action: string,
  payload: Record<string, unknown>,
  user: string | undefined,
  instance: string | null,
  request: number,
) {
  if (!supabase || !user || !instance) {
    rankedStore.setState({
      error: 'Tỷ võ xếp hạng cần kết nối tài khoản online.',
      searching: false,
    });
    return null;
  }
  rankedStore.setState({ busy: true, error: '' });
  try {
    if (action === 'join') {
      EventBus.emit('cmd:save');
      await flushCloudSave(user);
      if (getAccountState().user?.id !== user || instance !== activeSessionId(user)) return null;
    }
    const { data, error } = await supabase
      .rpc('game_ranked', { p_instance_id: instance, p_action: action, p_payload: payload })
      .abortSignal(AbortSignal.timeout(12000));
    if (error) throw error;
    const page = parseRankedPage(data);
    if (!page) throw new Error('Dữ liệu xếp hạng không hợp lệ.');
    if (
      request !== generation ||
      getAccountState().user?.id !== user ||
      instance !== activeSessionId(user)
    )
      return null;
    rankedStore.setState({ page, searching: page.queue || !!page.match, busy: false });
    return page;
  } catch (error) {
    if (request !== generation) return null;
    const missing = String((error as { code?: string })?.code) === 'PGRST202';
    rankedStore.setState({
      busy: false,
      error: missing
        ? 'Server chưa kích hoạt tỷ võ xếp hạng.'
        : 'Không kết nối được xếp hạng. Hãy thử lại.',
    });
    return null;
  }
}
export function resetRanked() {
  generation++;
  pending = Promise.resolve();
  rankedStore.setState({ page: null, searching: false, error: '', busy: false });
}
