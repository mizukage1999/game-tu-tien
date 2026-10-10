import type { Sex } from './save';

export const NAME_MAX = 16;

/** Sprite and portrait key. Older saves have no sex and keep the original figure. */
export function playerArt(sex: Sex | undefined) {
  return sex === 'male' ? 'player_male' : 'player';
}

/** Empty or oversized names are rejected. Extra spaces collapse. */
export function normalizeName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (name.length < 1 || name.length > NAME_MAX) return null;
  return name;
}
