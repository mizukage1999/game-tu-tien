/**
 * Account names and how they map onto Supabase's email/password auth.
 *
 * Pure module: no imports, so it can be unit tested without a browser or network.
 */

/** Accounts created with a username get this synthetic email; nothing is ever sent to it. */
export const PLAYER_EMAIL_DOMAIN = 'players.tutien.invalid';

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 16;
export const PASSWORD_MIN = 6;

export type RegisterMode = 'username' | 'email';

export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

export function isEmailLike(raw: string): boolean {
  return raw.includes('@');
}

export type NameCheck = { ok: true; username: string } | { ok: false; reason: string };

/** Usernames are shown as typed but compared case-insensitively. */
export function checkUsername(raw: string): NameCheck {
  const username = normalizeUsername(raw);
  if (username.length < USERNAME_MIN) return { ok: false, reason: `Tên đăng nhập tối thiểu ${USERNAME_MIN} ký tự.` };
  if (username.length > USERNAME_MAX) return { ok: false, reason: `Tên đăng nhập tối đa ${USERNAME_MAX} ký tự.` };
  if (!/^[\p{L}\p{N}_.]+$/u.test(username))
    return { ok: false, reason: 'Chỉ dùng chữ, số, dấu chấm và gạch dưới.' };
  return { ok: true, username };
}

export type AuthEmail = { ok: true; email: string } | { ok: false; reason: string };

/**
 * Turns whatever the player typed into the email Supabase should authenticate with.
 * Anything with an `@` is treated as a real email; otherwise it is a username.
 */
export function authEmailFor(identifier: string): AuthEmail {
  const value = normalizeUsername(identifier);
  if (!value) return { ok: false, reason: 'Hãy nhập tên đăng nhập hoặc email.' };
  if (isEmailLike(value)) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return { ok: false, reason: 'Email không hợp lệ.' };
    return { ok: true, email: value.toLowerCase() };
  }
  const check = checkUsername(value);
  if (!check.ok) return { ok: false, reason: check.reason };
  return { ok: true, email: `${usernameKey(value)}@${PLAYER_EMAIL_DOMAIN}` };
}

/** Stable, lower-case form used for uniqueness checks and synthetic emails. */
export function usernameKey(raw: string): string {
  return normalizeUsername(raw).toLowerCase();
}

export function checkPassword(password: string): { ok: true } | { ok: false; reason: string } {
  if (password.length < PASSWORD_MIN) return { ok: false, reason: `Mật khẩu tối thiểu ${PASSWORD_MIN} ký tự.` };
  return { ok: true };
}
