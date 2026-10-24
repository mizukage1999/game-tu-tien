import type { Dir } from '../types';

/** Screen-facing directions. Combat vectors continue to use map-space Dir. */
export const HERO_DIRECTIONS = [
  'down',
  'down-left',
  'left',
  'up-left',
  'up',
  'up-right',
  'right',
  'down-right',
] as const;
export type HeroDirection = (typeof HERO_DIRECTIONS)[number];

export function heroDirection(
  x: number,
  y: number,
  fallback: HeroDirection = 'down',
): HeroDirection {
  if (Math.hypot(x, y) < 0.01) return fallback;
  const octant = Math.round(Math.atan2(x, y) / (Math.PI / 4));
  return HERO_DIRECTIONS[((-octant % 8) + 8) % 8];
}

export function cardinalDirection(dir: HeroDirection): Dir {
  if (dir.includes('left')) return 'left';
  if (dir.includes('right')) return 'right';
  return dir as Dir;
}
