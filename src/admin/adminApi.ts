import { supabase } from '../net/supabase';
import type { AlphaCampaign } from '../data/alphatest';

export interface AdminAccount {
  id: string;
  username: string;
  email: string | null;
  guest: boolean;
  admin: boolean;
  character_name: string | null;
  hero_id: string | null;
  level: number;
  realm_index: number;
  map_id: string | null;
  balance: number;
  recent: boolean;
  created_at: string;
  updated_at: string | null;
}
export interface AccountDetail {
  account: AdminAccount;
  inventory: Record<string, number>;
  equipment: Record<string, string>;
  quests: Record<string, { status?: string; progress?: number[] }>;
}
export interface AdminLog {
  id: string;
  created_at: string;
  kind: string;
  message: string;
  actor: string;
  target: string;
  delta: number | null;
  details: Record<string, unknown>;
}
export interface AdminOverview {
  accounts: number;
  characters: number;
  recent: number;
  jade: number;
  logs_today: number;
  plans: number;
  server_time: string;
}
export interface AdminPage<T> {
  total: number;
  rows: T[];
}
export interface EventPlan {
  id: string;
  title: string;
  description: string;
  starts_at: string | null;
  ends_at: string | null;
  map_id: string | null;
  status: 'draft' | 'archived';
  version: number;
  updated_at?: string;
}
export function adminError(error: unknown) {
  const r = error as { message?: string; code?: string } | null;
  const message = r?.message ?? String(error);
  if (message.includes('ADMIN_REQUIRED') || r?.code === '42501')
    return 'Tài khoản không có quyền quản trị.';
  if (message.includes('PLAN_CONFLICT'))
    return 'Kế hoạch đã được thay đổi ở nơi khác. Hãy tải lại trước khi lưu.';
  if (message.includes('CAMPAIGN_CONFLICT'))
    return 'Đợt Alphatest đã thay đổi ở nơi khác. Hãy làm mới trước khi lưu.';
  if (message.includes('ACCOUNT_NOT_FOUND')) return 'Không tìm thấy tài khoản.';
  if (r?.code === 'PGRST202' || message.includes('Could not find the function'))
    return 'Cần cài supabase/admin-dashboard.sql trên server để tải dữ liệu quản trị.';
  return message;
}
async function rpc<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new Error('Chưa cấu hình kết nối server.');
  const { data, error } = await supabase.rpc(name, args);
  if (
    error &&
    name.includes('alphatest') &&
    (error.code === 'PGRST202' || error.message.includes('Could not find the function'))
  )
    throw new Error('Cần cài supabase/alphatest-mail.sql trên server để quản lý Alphatest.');
  if (error) throw error;
  if (data === null) throw new Error('Server chưa trả dữ liệu.');
  return data as T;
}
export const adminApi = {
  alphatest: () => rpc<AlphaCampaign>('admin_alphatest_status'),
  setAlphatest: (enabled: boolean, version: number) =>
    rpc<AlphaCampaign>('admin_set_alphatest_delivery', { p_enabled: enabled, p_version: version }),
  allowed: () => rpc<boolean>('is_game_admin'),
  overview: () => rpc<AdminOverview>('admin_dashboard_overview'),
  accounts: (query: string, activity: string, offset: number, limit: number) =>
    rpc<AdminPage<AdminAccount>>('admin_dashboard_accounts', {
      p_query: query,
      p_activity: activity,
      p_offset: offset,
      p_limit: limit,
    }),
  account: (user: string) => rpc<AccountDetail>('admin_dashboard_account', { p_user: user }),
  logs: (query: string, kind: string, offset: number, limit: number) =>
    rpc<AdminPage<AdminLog>>('admin_dashboard_logs', {
      p_query: query,
      p_kind: kind,
      p_offset: offset,
      p_limit: limit,
    }),
  plans: () => rpc<EventPlan[]>('admin_dashboard_plans'),
  savePlan: (p: EventPlan) =>
    rpc<EventPlan>('admin_save_event_plan', {
      p_id: p.id,
      p_version: p.version,
      p_title: p.title.trim(),
      p_description: p.description,
      p_starts_at: p.starts_at,
      p_ends_at: p.ends_at,
      p_map_id: p.map_id,
      p_status: p.status,
    }),
  grant: (username: string, amount: number, note: string, request: string) =>
    rpc<{ ok: boolean; duplicate?: boolean }>('admin_grant_tien_ngoc', {
      target_username: username.trim(),
      amount,
      note: note.trim(),
      request_key: request,
    }),
};

/** Neutralize spreadsheet formulas in downloaded, user-controlled cells. */
export function adminCsv(rows: (string | number | null)[][]) {
  return (
    '\uFEFF' +
    rows
      .map((row) =>
        row
          .map((value) => {
            let s = String(value ?? '');
            if (typeof value === 'string' && /^[\s]*[=+\-@\t\r]/.test(s)) s = "'" + s;
            return '"' + s.replace(/"/g, '""') + '"';
          })
          .join(','),
      )
      .join('\r\n')
  );
}
export function downloadAdminCsv(name: string, rows: (string | number | null)[][]) {
  const url = URL.createObjectURL(new Blob([adminCsv(rows)], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
