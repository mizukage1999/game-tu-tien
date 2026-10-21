import { supabase } from './supabase';
import { setAccountState } from './session';
import {
  authEmailFor,
  checkPassword,
  checkUsername,
  usernameKey,
  type RegisterMode,
} from './identity';

export type AuthResult = { ok: true; notice?: string } | { ok: false; error: string };

/** Supabase returns English messages; players only ever see these. */
export function translateAuthError(message: string): string {
  const text = message.toLowerCase();
  if (text.includes('invalid login credentials')) return 'Sai tên đăng nhập hoặc mật khẩu.';
  if (text.includes('email not confirmed'))
    return 'Email chưa được xác nhận. Hãy bấm link trong thư xác nhận rồi đăng nhập lại.';
  if (text.includes('user already registered')) return 'Tên đăng nhập hoặc email này đã được dùng.';
  if (text.includes('password should be at least')) return 'Mật khẩu quá ngắn.';
  if (text.includes('anonymous sign-ins are disabled'))
    return 'Guest chưa được bật trong Supabase (Authentication → Sign In / Providers → Anonymous).';
  if (text.includes('email signups are disabled'))
    return 'Supabase đang tắt đăng ký bằng email. Bật Authentication → Providers → Email rồi tắt "Confirm email", sau đó thử lại.';
  if (text.includes('email logins are disabled'))
    return 'Supabase đang tắt đăng nhập bằng email. Bật Authentication → Providers → Email rồi thử lại.';
  if (text.includes('signups not allowed'))
    return 'Supabase đang tắt đăng ký tài khoản mới.';
  if (text.includes('rate limit') || text.includes('too many'))
    return 'Bạn thử quá nhiều lần, đợi một lát rồi làm lại.';
  if (text.includes('failed to fetch') || text.includes('networkerror'))
    return 'Không kết nối được server. Kiểm tra mạng rồi thử lại.';
  return message;
}

/** Server-side uniqueness check. Falls back to "free" when the SQL helper is missing. */
export async function usernameAvailable(raw: string): Promise<boolean> {
  if (!supabase) return true;
  const { data, error } = await supabase.rpc('username_available', { candidate: raw });
  if (error) return true;
  return data !== false;
}

export async function signInGuest(): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: 'Bản build này chưa cấu hình Supabase.' };
  setAccountState({ error: null });
  const { error } = await supabase.auth.signInAnonymously();
  if (error) return { ok: false, error: translateAuthError(error.message) };
  return { ok: true };
}

export async function signIn(identifier: string, password: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: 'Bản build này chưa cấu hình Supabase.' };
  const mapped = authEmailFor(identifier);
  if (!mapped.ok) return { ok: false, error: mapped.reason };
  if (!password) return { ok: false, error: 'Hãy nhập mật khẩu.' };

  const typedEmail = identifier.includes('@');
  const { error } = await supabase.auth.signInWithPassword({ email: mapped.email, password });
  if (error) {
    const hint =
      !typedEmail && error.message.toLowerCase().includes('invalid login credentials')
        ? ' Tài khoản tạo bằng email thì phải đăng nhập bằng email.'
        : '';
    return { ok: false, error: translateAuthError(error.message) + hint };
  }
  return { ok: true };
}

export interface RegisterInput {
  username: string;
  mode: RegisterMode;
  email?: string;
  password: string;
}

export async function register({ username, mode, email, password }: RegisterInput): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: 'Bản build này chưa cấu hình Supabase.' };
  const name = checkUsername(username);
  if (!name.ok) return { ok: false, error: name.reason };
  const pass = checkPassword(password);
  if (!pass.ok) return { ok: false, error: pass.reason };

  const key = usernameKey(name.username);
  const address = mode === 'email' ? authEmailFor(email ?? '') : authEmailFor(key);
  if (!address.ok) return { ok: false, error: address.reason };
  if (mode === 'email' && !address.email.includes('@')) return { ok: false, error: 'Email không hợp lệ.' };
  if (!(await usernameAvailable(key))) return { ok: false, error: 'Tên đăng nhập này đã có người dùng.' };

  const { data, error } = await supabase.auth.signUp({
    email: address.email,
    password,
    options: { data: { username: name.username, username_key: key } },
  });
  if (error) return { ok: false, error: translateAuthError(error.message) };
  if (!data.session) {
    return {
      ok: false,
      error:
        'Tài khoản đã tạo nhưng cần xác nhận email trước khi chơi. Nếu đăng ký bằng username, hãy tắt "Confirm email" trong Supabase.',
    };
  }
  return { ok: true };
}

export interface UpgradeInput {
  username: string;
  mode: RegisterMode;
  email?: string;
  password: string;
}

/** Turns the current guest into a real account without losing progress. */
export async function upgradeGuest({ username, mode, email, password }: UpgradeInput): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: 'Bản build này chưa cấu hình Supabase.' };
  const { data: current } = await supabase.auth.getUser();
  const user = current.user;
  if (!user) return { ok: false, error: 'Chưa có phiên đăng nhập.' };
  if (!user.is_anonymous) return { ok: false, error: 'Tài khoản này đã là tài khoản chính thức.' };

  const name = checkUsername(username);
  if (!name.ok) return { ok: false, error: name.reason };
  const pass = checkPassword(password);
  if (!pass.ok) return { ok: false, error: pass.reason };

  const key = usernameKey(name.username);
  const address = mode === 'email' ? authEmailFor(email ?? '') : authEmailFor(key);
  if (!address.ok) return { ok: false, error: address.reason };
  if (!(await usernameAvailable(key))) return { ok: false, error: 'Tên đăng nhập này đã có người dùng.' };

  const { error } = await supabase.auth.updateUser({
    email: address.email,
    password,
    data: { username: name.username, username_key: key },
  });
  if (error) return { ok: false, error: translateAuthError(error.message) };

  // The profile trigger only runs on INSERT, so a guest fills in its row here.
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({ id: user.id, username: name.username, username_key: key }, { onConflict: 'id' });
  if (profileError) {
    return { ok: true, notice: 'Đã lưu tài khoản nhưng chưa ghi được hồ sơ người chơi, thử lại sau.' };
  }
  return { ok: true, notice: 'Đã nâng cấp tài khoản. Tiến trình được giữ nguyên.' };
}

export async function signOutPlayer(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}
