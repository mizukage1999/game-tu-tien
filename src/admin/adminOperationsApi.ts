import { supabase } from '../net/supabase';
import { adminRpc } from './adminApi';
export type CommandKind =
  | 'auth_create'
  | 'auth_delete'
  | 'auth_ban'
  | 'auth_unban'
  | 'item_grant'
  | 'item_remove'
  | 'save_edit'
  | 'maintenance'
  | 'boss_reset'
  | 'dungeon_reset';
export interface AdminCommand {
  id: string;
  kind: CommandKind;
  target: string | null;
  payload: Record<string, unknown>;
  reason: string;
  confirm: string;
  token: string | null;
  password?: string;
  username?: string;
  email?: string;
}
export interface PendingAuth {
  id: string;
  kind: CommandKind;
  target: string;
  payload: { username?: string; email?: string };
  reason: string;
}
export interface OperationsStatus {
  maintenance: boolean;
  maintenance_at?: string | null;
  maintenance_notice_seconds?: number;
  item_delivery?: 'mail' | 'unavailable';
  message: string;
  bosses: { id: string; map: string; monster: string }[];
  pending_auth: PendingAuth[];
}
export interface SnapshotRead {
  backups?: { command_id: string; created_at: string }[];
  snapshot: Record<string, unknown> | null;
  token: string | null;
  blocked: boolean;
  protected: boolean;
}
export const operationsError = (error: unknown) => {
  const m = String((error as { message?: string })?.message ?? error);
  for (const [code, label] of Object.entries({
    SAVE_CONFLICT: 'Save đã thay đổi. Hãy tải lại và xem lại nội dung trước khi sửa.',
    PROTECTED_ADMIN: 'Không thể xóa hoặc khóa tài khoản quản trị.',
    INSUFFICIENT_ITEM: 'Không đủ số lượng vật phẩm để xóa.',
    SAVE_NOT_FOUND: 'Tài khoản chưa có nhân vật/save.',
    MAIL_DELIVERY_NOT_INSTALLED: 'Cần cài supabase/admin-delivery.sql để gửi vật phẩm qua thư.',
    INVALID_ADMIN_SAVE: 'Save không hợp lệ. Giữ tên, revision thư và kiểm tra cấp/cảnh giới.',
    INVALID_ADMIN_INVENTORY: 'Túi đồ chứa vật phẩm hoặc số lượng không hợp lệ.',
    INVALID_ADMIN_EQUIPMENT: 'Trang bị không đúng ô hoặc không còn trong túi.',
    PREMIUM_ENTITLEMENT_REQUIRED: 'Dùng lệnh cấp Tiên pháp bảo để tạo quyền sở hữu trên server.',
    USERNAME_UNAVAILABLE: 'Tên đăng nhập đã được dùng hoặc không hợp lệ.',
    REQUEST_CONFLICT: 'Mã yêu cầu này đã dùng với nội dung khác. Hãy xem lại yêu cầu.',
    AUTH_OPERATION_PENDING:
      'Auth chưa xác nhận hoàn tất. Thử lại cùng yêu cầu; yêu cầu chờ có thể mở lại ở cuối trang.',
    INVALID_AUTH_INPUT: 'Tên đăng nhập/email không hợp lệ hoặc mật khẩu chưa đủ 8 ký tự.',
    ADMIN_REQUIRED: 'Tài khoản không có quyền quản trị.',
    CONFIRMATION_REQUIRED: 'Chưa xác nhận đúng đối tượng.',
    ACCOUNT_NOT_FOUND: 'Không tìm thấy tài khoản.',
  }))
    if (m.includes(code)) return label;
  if (m.includes('Could not find the function') || m.includes('PGRST202'))
    return 'Cần cài admin-operations.sql và admin-catalog.sql trên server.';
  return m;
};
export const operationsApi = {
  backup: (id: string, user: string) =>
    adminRpc<Record<string, unknown>>('admin_read_backup', { p_id: id, p_user: user }),
  status: () => adminRpc<OperationsStatus>('admin_operations_status'),
  snapshot: (user: string) => adminRpc<SnapshotRead>('admin_read_snapshot', { p_user: user }),
  async execute(command: AdminCommand) {
    if (!command.kind.startsWith('auth_'))
      return adminRpc('admin_apply_command', {
        p_id: command.id,
        p_kind: command.kind,
        p_user: command.target,
        p_payload: command.payload,
        p_reason: command.reason,
        p_confirm: command.confirm,
        p_token: command.token,
      });
    if (!supabase) throw new Error('Chưa kết nối server.');
    const { data, error } = await supabase.functions.invoke('admin-auth', {
      body: {
        id: command.id,
        kind: command.kind,
        target: command.target,
        reason: command.reason,
        confirm: command.confirm,
        password: command.password,
        username: command.username,
        email: command.email,
      },
    });
    if (error) {
      const context = (error as { context?: Response }).context;
      if (context) {
        try {
          const body = await context.json();
          if (typeof body.error === 'string') throw new Error(body.error);
        } catch (e) {
          if (e instanceof Error && !(e instanceof SyntaxError)) throw e;
        }
      }
      throw new Error(
        'Không gọi được admin-auth. Kiểm tra Edge Function đã triển khai; thử lại cùng yêu cầu.',
      );
    }
    if (data?.error) throw new Error(data.error);
    if (data?.ok !== true) throw new Error('AUTH_OPERATION_PENDING');
    return data;
  },
};
