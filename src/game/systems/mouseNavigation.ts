import { findPath } from './path';
import { gridLineClear } from './gridNavigation';
import type { Vec2 } from '../types';

/** Preserve body clearance at corners; use the exact click only when the last segment is clear. */
export function mouseWalkPath(blocked: boolean[][], tile: number, from: Vec2, requested: Vec2) {
  const height = blocked.length, width = blocked[0]?.length ?? 0;
  if (![requested.x, requested.y].every(Number.isFinite) || requested.x < 0 || requested.y < 0 || requested.x >= width * tile || requested.y >= height * tile) return null;
  const gx = Math.floor(requested.x / tile), gy = Math.floor(requested.y / tile);
  const sx = Math.floor(from.x / tile), sy = Math.floor(from.y / tile);
  const result = findPath(blocked, sx, sy, gx, gy);
  if (!result.reached) return null;
  const points = result.tiles.map(p => ({ x: (p.x + .5) * tile, y: (p.y + .5) * tile }));
  const last = points[points.length - 1] ?? { x: (sx + .5) * tile, y: (sy + .5) * tile };
  // A blocked destination may have been redirected to a nearby open tile.
  const target = !blocked[gy][gx] && gridLineClear(blocked, tile, last, requested, 12, 9) ? requested : last;
  if (!points.length || Math.hypot(last.x - target.x, last.y - target.y) > 1) points.push(target);
  return { points, target };
}
