import { onlineEnabled } from '../net/config';
import { accountLabel, isGuest, useAccount } from '../net/session';

const STATUS_LABEL: Record<string, string> = {
  idle: 'đã kết nối',
  syncing: 'đang lưu',
  saved: 'đã lưu',
  error: 'lỗi lưu',
};

/**
 * The only always-visible proof of what the build is doing: offline builds say so
 * instead of silently dropping the player into a local-only game.
 */
export function CloudBadge() {
  const account = useAccount();

  if (!onlineEnabled) {
    return (
      <div
        className="cloud-badge offline"
        title="Bản build này chưa có VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY nên chạy offline: không có đăng nhập, tiến trình chỉ nằm trong trình duyệt này."
      >
        <span className="dot" />
        Offline · chưa cấu hình cloud
      </div>
    );
  }

  if (account.booting) return null;
  if (!account.user) {
    return (
      <div className="cloud-badge offline" title="Chưa có phiên đăng nhập.">
        <span className="dot" />
        Chưa đăng nhập
      </div>
    );
  }

  const guest = isGuest(account.user);
  const name = accountLabel(account.user);
  const status = STATUS_LABEL[account.status] ?? '';
  return (
    <div
      className={`cloud-badge${account.status === 'error' ? ' error' : ' online'}`}
      title={`${name}${guest ? ' (khách)' : ''} — ${status || 'cloud'}`}
    >
      <span className="dot" />
      {name}
      {guest && name !== 'Khách' ? ' · khách' : ''}
      {status ? ` · ${status}` : ''}
    </div>
  );
}
