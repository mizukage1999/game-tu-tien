import {
  RANKING_CATEGORIES,
  type RankingCategory,
  type RankingEntry,
} from '../game/systems/rankingUi';
import { parseInspection } from './inspection';
import { supabase } from './supabase';
import { getAccountState } from './session';
import { activeSessionId } from './activeSession';

export const LEADERBOARD_PAGE_SIZE = 8;
export interface LeaderboardPage {
  category: RankingCategory;
  supported: boolean;
  population: number;
  total: number;
  offset: number;
  limit: number;
  serverTime: string;
  top: RankingEntry[];
  rows: RankingEntry[];
  self: RankingEntry | null;
}
type ObjectValue = Record<string, unknown>;
const object = (v: unknown): ObjectValue | null =>
  v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as ObjectValue) : null;
const uint = (v: unknown, max = 100000000) =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 && v <= max;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function parseRanked(value: unknown, own = false): RankingEntry | null {
  const row = object(value),
    entry = object(row?.entry);
  if (!row || !entry || (!(own && row.rank === null) && (!uint(row.rank) || row.rank === 0)))
    return null;
  const inspection = parseInspection(entry.inspection);
  if (
    !inspection ||
    typeof entry.id !== 'string' ||
    !uuid.test(entry.id) ||
    inspection.userId !== entry.id ||
    typeof entry.name !== 'string' ||
    !entry.name.trim() ||
    entry.name.length > 24 ||
    !uint(entry.contribution, 10000000) ||
    !uint(entry.reputation, 10000000) ||
    !uint(entry.bossKills, 10000000) ||
    typeof entry.title !== 'string' ||
    entry.title.length > 120 ||
    typeof entry.updatedAt !== 'string' ||
    !Number.isFinite(Date.parse(entry.updatedAt))
  )
    return null;
  return {
    id: entry.id,
    name: entry.name,
    inspection,
    contribution: entry.contribution as number,
    reputation: entry.reputation as number,
    title: entry.title,
    bossKills: entry.bossKills as number,
    serverRank: row.rank as number | null,
    updatedAt: entry.updatedAt,
  };
}

/** Reconstruct only explicitly public fields; never forward the raw server object to the UI. */
export function parseLeaderboard(
  value: unknown,
  category: RankingCategory,
): LeaderboardPage | null {
  const data = object(value);
  if (
    !data ||
    data.category !== category ||
    !RANKING_CATEGORIES.some((c) => c.id === category) ||
    typeof data.supported !== 'boolean' ||
    !uint(data.population) ||
    !uint(data.total) ||
    (data.total as number) > (data.population as number) ||
    !uint(data.offset, 100000) ||
    !uint(data.limit, 20) ||
    data.limit === 0 ||
    typeof data.serverTime !== 'string' ||
    !Number.isFinite(Date.parse(data.serverTime)) ||
    !Array.isArray(data.top) ||
    data.top.length > 3 ||
    !Array.isArray(data.rows) ||
    data.rows.length > (data.limit as number) ||
    data.rows.length > (data.total as number) ||
    data.top.length > (data.population as number)
  )
    return null;
  const top = data.top.map((v) => parseRanked(v)),
    rows = data.rows.map((v) => parseRanked(v));
  const self = data.self === null ? null : parseRanked(data.self, true);
  if (
    top.some((e, i) => !e || e.serverRank !== i + 1) ||
    rows.some(
      (e, i) =>
        !e ||
        e.serverRank! > (data.population as number) ||
        (i > 0 && e.serverRank! <= rows[i - 1]!.serverRank!),
    ) ||
    (data.self !== null && !self) ||
    [top, rows].some((list) => new Set(list.map((e) => e?.id)).size !== list.length) ||
    (self?.serverRank != null && self.serverRank > (data.population as number)) ||
    (!data.supported && (data.total !== 0 || top.length || rows.length || self))
  )
    return null;
  return {
    category,
    supported: data.supported,
    population: data.population as number,
    total: data.total as number,
    offset: data.offset as number,
    limit: data.limit as number,
    serverTime: data.serverTime,
    top: top as RankingEntry[],
    rows: rows as RankingEntry[],
    self,
  };
}

export function leaderboardError(error: unknown): string {
  const e = object(error),
    message = typeof e?.message === 'string' ? e.message : String(error);
  if (
    e?.code === 'PGRST202' ||
    /game_leaderboard.*(not find|does not exist)|LEADERBOARD_NOT_INSTALLED/i.test(message)
  )
    return 'Bảng xếp hạng toàn server đang chờ kích hoạt. Bạn vẫn có thể xem hồ sơ cá nhân.';
  if (/SESSION_REPLACED|GAME_ACCESS_BLOCKED/.test(message))
    return 'Phiên chơi đã kết thúc. Hãy đăng nhập lại để xem Tiên Bảng.';
  if (/LOGIN_REQUIRED/.test(message)) return 'Đăng nhập để xem bảng xếp hạng toàn server.';
  if (/AbortError|TimeoutError|aborted|timeout/i.test(message))
    return 'Kết nối quá lâu. Hãy thử làm mới Tiên Bảng.';
  return 'Chưa tải được bảng xếp hạng. Hãy kiểm tra kết nối và thử lại.';
}

export async function fetchLeaderboard(
  category: RankingCategory,
  query: string,
  page: number,
  signal: AbortSignal,
): Promise<LeaderboardPage> {
  const user = getAccountState().user,
    instance = user && activeSessionId(user.id);
  if (!supabase || !user) throw new Error('LOGIN_REQUIRED');
  if (!instance) throw new Error('SESSION_REPLACED');
  const { data, error } = await supabase
    .rpc('game_leaderboard', {
      p_instance_id: instance,
      p_category: category,
      p_query: query.trim().slice(0, 32),
      p_offset: Math.min(100000, Math.max(0, Math.floor(page)) * LEADERBOARD_PAGE_SIZE),
      p_limit: LEADERBOARD_PAGE_SIZE,
    })
    .abortSignal(signal);
  if (error) throw error;
  if (getAccountState().user?.id !== user.id || activeSessionId(user.id) !== instance)
    throw new Error('SESSION_REPLACED');
  const parsed = parseLeaderboard(data, category);
  if (!parsed || (parsed.self && parsed.self.id !== user.id))
    throw new Error('INVALID_LEADERBOARD');
  return parsed;
}
