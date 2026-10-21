import { describe, expect, it } from 'vitest';
import {
  authEmailFor,
  checkPassword,
  checkUsername,
  isEmailLike,
  normalizeUsername,
  PLAYER_EMAIL_DOMAIN,
  usernameKey,
} from './identity';

describe('authEmailFor', () => {
  it('maps a username onto the synthetic player email', () => {
    const res = authEmailFor('TuyetKy');
    expect(res).toEqual({ ok: true, email: `tuyetky@${PLAYER_EMAIL_DOMAIN}` });
  });

  it('keeps a real email, lower-cased', () => {
    expect(authEmailFor('Player@Example.COM')).toEqual({ ok: true, email: 'player@example.com' });
  });

  it('rejects an empty identifier', () => {
    expect(authEmailFor('   ').ok).toBe(false);
  });

  it('rejects a malformed email', () => {
    expect(authEmailFor('a@b').ok).toBe(false);
  });

  it('rejects a too-short username', () => {
    expect(authEmailFor('ab').ok).toBe(false);
  });

  it('accepts Vietnamese diacritics in a username', () => {
    const res = authEmailFor('Tuyết_Kỳ');
    expect(res.ok && res.email.startsWith('tuyết_kỳ@')).toBe(true);
  });
});

describe('checkUsername', () => {
  it('rejects spaces and punctuation', () => {
    expect(checkUsername('tu tien').ok).toBe(false);
    expect(checkUsername('tu-tien').ok).toBe(false);
    expect(checkUsername('tu!tien').ok).toBe(false);
  });

  it('accepts dots and underscores', () => {
    expect(checkUsername('tu_tien.01')).toEqual({ ok: true, username: 'tu_tien.01' });
  });

  it('enforces the length window', () => {
    expect(checkUsername('a'.repeat(17)).ok).toBe(false);
    expect(checkUsername('abc').ok).toBe(true);
  });
});

describe('usernameKey', () => {
  it('is case insensitive and trimmed', () => {
    expect(usernameKey('  TuyetKy ')).toBe('tuyetky');
  });
});

describe('isEmailLike', () => {
  it('splits usernames from emails', () => {
    expect(isEmailLike('tuyetky')).toBe(false);
    expect(isEmailLike('a@b.co')).toBe(true);
  });
});

describe('normalizeUsername', () => {
  it('collapses inner whitespace', () => {
    expect(normalizeUsername('  a   b ')).toBe('a b');
  });
});

describe('checkPassword', () => {
  it('requires six characters', () => {
    expect(checkPassword('12345').ok).toBe(false);
    expect(checkPassword('123456').ok).toBe(true);
  });
});
