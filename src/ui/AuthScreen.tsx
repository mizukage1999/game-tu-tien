import { useState } from 'react';
import { register, signIn, signInGuest, type AuthResult } from '../net/auth';
import type { RegisterMode } from '../net/identity';

type Tab = 'guest' | 'login' | 'register';

const TABS: { id: Tab; label: string }[] = [
  { id: 'guest', label: 'Chơi ngay' },
  { id: 'login', label: 'Đăng nhập' },
  { id: 'register', label: 'Đăng ký' },
];

export function AuthScreen() {
  const [tab, setTab] = useState<Tab>('guest');
  const [mode, setMode] = useState<RegisterMode>('username');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (action: () => Promise<AuthResult>) => {
    if (busy) return;
    setBusy(true);
    setError('');
    const result = await action();
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    // A reload re-runs the boot sequence so the store loads this account's save.
    window.location.reload();
  };

  const submitLogin = () => run(() => signIn(username, password));
  const submitRegister = () =>
    run(() => register({ username, mode, email, password }));

  return (
    <div className="create-screen">
      <div className="create-card panel-ornate">
        <h1>Tu Tiên</h1>
        <p className="muted">Nhập vai tu luyện — tiến trình lưu trên cloud.</p>

        <div className="auth-tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`auth-tab${tab === t.id ? ' on' : ''}`}
              onClick={() => {
                setTab(t.id);
                setError('');
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'guest' ? (
          <div className="auth-body">
            <p className="muted auth-note">
              Chơi ngay không cần tài khoản. Tiến trình vẫn được lưu trên server, nhưng chỉ trên trình
              duyệt này — xóa dữ liệu trình duyệt là mất nhân vật. Vào <b>Cài đặt</b> để tạo tài khoản
              và giữ tiến trình.
            </p>
            <button className="btn gold" type="button" disabled={busy} onClick={() => run(signInGuest)}>
              {busy ? 'Đang vào...' : 'Vào thế giới'}
            </button>
          </div>
        ) : null}

        {tab === 'login' ? (
          <form
            className="auth-body"
            onSubmit={(e) => {
              e.preventDefault();
              void submitLogin();
            }}
          >
            <label className="create-name">
              Tên đăng nhập hoặc email
              <input
                value={username}
                autoFocus
                autoComplete="username"
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError('');
                }}
              />
            </label>
            <label className="create-name">
              Mật khẩu
              <input
                type="password"
                value={password}
                autoComplete="current-password"
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
              />
            </label>
            <button className="btn gold" type="submit" disabled={busy}>
              {busy ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>
        ) : null}

        {tab === 'register' ? (
          <form
            className="auth-body"
            onSubmit={(e) => {
              e.preventDefault();
              void submitRegister();
            }}
          >
            <div className="auth-modes">
              <button
                type="button"
                className={`auth-mode${mode === 'username' ? ' on' : ''}`}
                onClick={() => setMode('username')}
              >
                Bằng username
              </button>
              <button
                type="button"
                className={`auth-mode${mode === 'email' ? ' on' : ''}`}
                onClick={() => setMode('email')}
              >
                Bằng email
              </button>
            </div>
            <label className="create-name">
              Tên đăng nhập
              <input
                value={username}
                maxLength={16}
                autoFocus
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError('');
                }}
              />
            </label>
            {mode === 'email' ? (
              <label className="create-name">
                Email
                <input
                  type="email"
                  value={email}
                  autoComplete="email"
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                />
              </label>
            ) : null}
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
            <p className="muted auth-note">
              {mode === 'username'
                ? 'Đăng nhập về sau bằng username. Không cần email, nhưng cũng không khôi phục được mật khẩu.'
                : 'Đăng nhập về sau bằng email. Có thể khôi phục mật khẩu qua email.'}
            </p>
            <button className="btn gold" type="submit" disabled={busy}>
              {busy ? 'Đang tạo...' : 'Tạo tài khoản'}
            </button>
          </form>
        ) : null}

        {/* Shared so the guest tab reports failures too, not just the forms. */}
        {error ? <p className="create-error auth-error">{error}</p> : null}
      </div>
    </div>
  );
}
