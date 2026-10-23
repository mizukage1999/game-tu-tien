import type { Vec2 } from '../types';

/** Equally spaced breadcrumbs along every segment, including bends. */
export function routeDots(points: Vec2[], spacing = 30, limit = 56): Vec2[] {
  if (points.length < 2 || spacing <= 0 || limit <= 0) return [];
  const dots: Vec2[] = [];
  let remaining = spacing;
  for (let i = 1; i < points.length && dots.length < limit; i++) {
    const a = points[i - 1], b = points[i];
    const distance = Math.hypot(b.x - a.x, b.y - a.y);
    if (!distance) continue;
    let travelled = remaining;
    while (travelled <= distance && dots.length < limit) {
      dots.push({ x: a.x + (b.x - a.x) * travelled / distance, y: a.y + (b.y - a.y) * travelled / distance });
      travelled += spacing;
    }
    remaining = travelled - distance;
  }
  return dots;
}
