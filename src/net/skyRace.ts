import { supabase } from './supabase';
import { getAccountState } from './session';
import { activeSessionId } from './activeSession';
import type { SkyInput } from '../game/systems/skyRace';
import { EventBus } from '../game/EventBus';
import { flushCloudSave } from './cloudSave';
export interface SkyRankingRow {
  userId: string;
  name: string;
  score: number;
  energy: number;
  hits: number;
}
export interface SkyRacePage {
  week: string;
  seed: number;
  rows: SkyRankingRow[];
  self: SkyRankingRow | null;
  run: { id: string; seed: number; week: string } | null;
  result: { score: number; energy: number; hits: number } | null;
}
export function parseSkyRacePage(data: unknown): SkyRacePage | null {
  if (!data || typeof data !== 'object') return null;
  const p = data as SkyRacePage;
  const result = (r: SkyRacePage['result']) =>
    !!r &&
    Number.isInteger(r.score) &&
    r.score >= 1000 &&
    r.score <= 10000000 &&
    Number.isInteger(r.energy) &&
    r.energy >= 0 &&
    r.energy <= 9 &&
    Number.isInteger(r.hits) &&
    r.hits >= 0 &&
    r.hits <= 9;
  const row = (r: SkyRankingRow) =>
    !!r &&
    typeof r.userId === 'string' &&
    typeof r.name === 'string' &&
    r.name.length <= 24 &&
    result(r);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(p.week) ||
    !Number.isSafeInteger(p.seed) ||
    !Array.isArray(p.rows) ||
    p.rows.length > 50 ||
    !p.rows.every(row) ||
    (p.self !== null && !row(p.self)) ||
    (p.result !== null && !result(p.result))
  )
    return null;
  if (
    p.run !== null &&
    (!p.run || typeof p.run.id !== 'string' || p.run.seed !== p.seed || p.run.week !== p.week)
  )
    return null;
  return p;
}
export async function skyRaceAction(
  action: 'status' | 'start' | 'finish' | 'cancel',
  payload: { id?: string; inputs?: SkyInput[] } = {},
): Promise<SkyRacePage> {
  const user = getAccountState().user?.id,
    instance = user ? activeSessionId(user) : null;
  if (!supabase || !user || !instance)
    throw Error('Bảng tốc độ tuần cần tài khoản online. Bạn vẫn có thể bay thử.');
  if (action === 'start') {
    EventBus.emit('cmd:save');
    await flushCloudSave(user);
    if (getAccountState().user?.id !== user || activeSessionId(user) !== instance)
      throw Error('Phiên đăng nhập đã thay đổi.');
  }
  const { data, error } = await supabase
    .rpc('game_sky_race', { p_instance_id: instance, p_action: action, p_payload: payload })
    .abortSignal(AbortSignal.timeout(15000));
  if (getAccountState().user?.id !== user || activeSessionId(user) !== instance)
    throw Error('Phiên đăng nhập đã thay đổi.');
  if (error)
    throw Error(
      error.code === 'PGRST202'
        ? 'Server chưa mở bảng tốc độ tuần. Chọn Bay thử để trải nghiệm.'
        : error.message.includes('RUN_') || error.message.includes('REPLAY_')
          ? 'Lượt bay không còn hợp lệ hoặc mất kết nối quá lâu. Hãy bắt đầu lượt mới.'
          : 'Không kết nối được bảng tốc độ. Bạn có thể thử lại.',
    );
  const page = parseSkyRacePage(data);
  if (!page) throw Error('Dữ liệu đường đua không hợp lệ.');
  return page;
}
