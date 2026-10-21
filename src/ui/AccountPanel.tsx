import { useState } from 'react';
import { signOutPlayer, upgradeGuest } from '../net/auth';
import { accountLabel, isGuest, useAccount } from '../net/session';
import { PLAYER_EMAIL_DOMAIN } from '../net/identity';

const STATUS_TEXT: Record<string, string> = {
  offline: 'Chế độ offline: tiến trình chỉ nằm trong trình duyệt này.',
  idle: 'Đã kết nối cloud.',
  syncing: 'Đang lưu lên cloud...',
  saved: 'Đã đồng bộ lên cloud.',
  error: 'Lỗi đồng bộ.',
};

export function AccountPanel() {
  const account = useAccount();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  if (account.status === 'offline' && !account.user) {
    return (
      <div className="account">
        <p className="muted">
          Bản build này chưa cấu hình Supabase nên game chạy offline: <b>không có đăng nhập</b>, tiến
          trình chỉ lưu trong trình duyệt này.
        </p>
        <p className="muted account-hint">
          Để bật đăng nhập và cloud save: tạo project Supabase, chạy <code>supabase/schema.sql</code>{' '}
          trong SQL Editor, bật <b>Anonymous sign-ins</b> và tắt <b>Confirm email</b>, rồi tạo{' '}
          <code>.env.local</code> với <code>VITE_SUPABASE_URL</code> và{' '}
          <code>VITE_SUPABASE_ANON_KEY</code>. Sau đó khởi động lại <code>npm run dev</code>.
        </p>
      </div>
    );
  }

  const user = account.user;
  if (!user) {
    return (
      <div className="account">
        <p className="muted">Chưa có phiên đăng nhập. Tải lại trang để đăng nhập.</p>
      </div>
    );
  }

  const guest = isGuest(user);
  const label = accountLabel(user);
  const loginEmail = user.email ?? '';
  const synthetic = loginEmail.endsWith(`@${PLAYER_EMAIL_DOMAIN}`);

  const upgrade = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    const result = await upgradeGuest({
      username,
      mode: email.trim() ? 'email' : 'username',
      email,
      password,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNotice(result.notice ?? 'Đã nâng cấp tài khoản.');
    setPassword('');
  };

  return (
    <div className="account">
      <p>
        <b>{label}</b>
        {guest && label !== 'Khách' ? <span className="account-badge">Khách</span> : null}
      </p>
      {!guest && loginEmail ? (
        <p className="muted">
          {synthetic
            ? `Đăng nhập bằng username: ${accountLabel(user)}`
            : `Đăng nhập bằng email: ${loginEmail}`}
        </p>
      ) : null}
      <p className={account.status === 'error' ? 'create-error' : 'muted'}>
        {STATUS_TEXT[account.status] ?? ''} {account.error ?? ''}
      </p>

      {guest ? (
        <>
          <p className="muted account-hint">
            Tạo tài khoản để giữ nhân vật này. Bỏ trống email nếu chỉ muốn đăng nhập bằng username.
          </p>
          <label className="create-name">
            Tên đăng nhập
            <input
              value={username}
              maxLength={16}
              onChange={(e) => {
                setUsername(e.target.value);
                setError('');
              }}
            />
          </label>
          <label className="create-name">
            Email (không bắt buộc)
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
            />
          </label>
          <label className="create-name">
            Mật khẩu
            <input
              type="password"
              value={password}
              autoComplete="new-password"
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
            />
          </label>
          {error ? <p className="create-error">{error}</p> : null}
          {notice ? <p className="account-ok">{notice}</p> : null}
          <button className="btn gold" type="button" disabled={busy} onClick={() => void upgrade()}>
            {busy ? 'Đang lưu...' : 'Nâng cấp thành tài khoản'}
          </button>
        </>
      ) : null}

      <button
        className="btn"
        type="button"
        onClick={() => {
          void signOutPlayer().then(() => window.location.reload());
        }}
      >
        Đăng xuất
      </button>
    </div>
  );
}
