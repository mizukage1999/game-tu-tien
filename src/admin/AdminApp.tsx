import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../net/supabase';
import { signIn } from '../net/auth';
import { adminApi, adminError } from './adminApi';
import { AdminDashboard } from './AdminDashboard';
import './admin.css';

type Access = 'checking' | 'login' | 'allowed' | 'denied' | 'error' | 'offline';
export function AdminApp() {
  const [access, setAccess] = useState<Access>('checking'),
    [user, setUser] = useState<User | null>(null),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const client = supabase;
    if (!client) {
      setAccess('offline');
      return;
    }
    let live = true,
      sequence = 0,
      authEvents = 0;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const apply = async (account: User | null) => {
      if (!live) return;
      const ticket = ++sequence;
      setUser(account);
      setAccess(account ? 'checking' : 'login');
      setError('');
      if (!account) return;
      try {
        const allowed = await adminApi.allowed();
        if (live && ticket === sequence) setAccess(allowed === true ? 'allowed' : 'denied');
      } catch (e) {
        if (live && ticket === sequence) {
          setError(adminError(e));
          setAccess('error');
        }
      }
    };
    setAccess('checking');
    void client.auth
      .getSession()
      .then(({ data, error: failure }) => {
        if (!live || authEvents) return;
        if (failure) {
          setError(adminError(failure));
          setAccess('error');
          return;
        }
        void apply(data.session?.user ?? null);
      })
      .catch((e) => {
        if (live && !authEvents) {
          setError(adminError(e));
          setAccess('error');
        }
      });
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      authEvents++;
      const timer = setTimeout(() => {
        timers.delete(timer);
        void apply(session?.user ?? null);
      }, 0);
      timers.add(timer);
    });
    return () => {
      live = false;
      sequence++;
      timers.forEach(clearTimeout);
      data.subscription.unsubscribe();
    };
  }, [retry]);
  const logout = async () => {
    try {
      await supabase?.auth.signOut();
      setUser(null);
      setAccess('login');
    } catch (e) {
      setError(adminError(e));
    }
  };
  if (access === 'allowed' && user)
    return (
      <AdminDashboard
        key={user.id}
        user={user}
        onSignOut={() => void logout()}
        onRecheck={() => setRetry((n) => n + 1)}
      />
    );
  return (
    <div className="admin-root admin-auth">
      <section className="admin-auth-card">
        <div className="admin-brand">
          Cửu Huyền<small>NGHỊCH MỆNH TRƯỜNG SINH</small>
        </div>
        <h1>Admin Dashboard</h1>
        {access === 'checking' ? (
          <p role="status">Đang xác nhận quyền quản trị…</p>
        ) : access === 'login' ? (
          <AdminLogin onSuccess={() => setRetry((n) => n + 1)} />
        ) : (
          <>
            <p role="alert">
              {access === 'denied'
                ? 'Tài khoản này chưa được cấp quyền quản trị.'
                : access === 'offline'
                  ? 'Dashboard cần kết nối server. Bản build hiện chưa cấu hình Supabase.'
                  : error || 'Chưa xác nhận được quyền truy cập.'}
            </p>
            {access !== 'offline' && (
              <button className="admin-button gold" onClick={() => setRetry((n) => n + 1)}>
                Kiểm tra lại
              </button>
            )}
            {user && (
              <button className="admin-button" onClick={() => void logout()}>
                Đăng xuất tài khoản
              </button>
            )}
          </>
        )}
        <a className="admin-back" href="/">
          ← Về game
        </a>
      </section>
    </div>
  );
}
function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [identifier, setIdentifier] = useState(''),
    [password, setPassword] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setError('');
        try {
          const r = await signIn(identifier, password);
          if (r.ok) {
            setPassword('');
            onSuccess();
          } else setError(r.error);
        } catch (e) {
          setError(adminError(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      <p>Đăng nhập bằng tài khoản đã được cấp quyền admin.</p>
      <label>
        Tên đăng nhập hoặc email
        <input
          autoComplete="username"
          value={identifier}
          required
          onChange={(e) => setIdentifier(e.target.value)}
        />
      </label>
      <label>
        Mật khẩu
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          required
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      <button className="admin-button gold" disabled={busy}>
        {busy ? 'Đang đăng nhập…' : 'Vào trang quản trị'}
      </button>
    </form>
  );
}
