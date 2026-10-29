import type { Sex } from './save';

export const NAME_MIN = 6;
export const NAME_MAX = 16;

/** Sprite and portrait key. Older saves have no sex and keep the original figure. */
export function playerArt(sex: Sex | undefined) {
  return sex === 'male' ? 'player_male' : 'player';
}

/** New character names are player-entered; whitespace is normalized before validation. */
export function normalizeName(raw: string): string | null {
  const name = raw.normalize('NFC').trim().replace(/\s+/g, ' ');
  const length = Array.from(name).length;
  if (length < NAME_MIN || length > NAME_MAX) return null;
  if (/[\p{Cc}\p{Cf}]/u.test(name)) return null;
  return name;
}
