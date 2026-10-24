import type { Vec2 } from '../types';
import { ARENA_ROCKS } from './arena';

export function arenaLineClear(a: Vec2, b: Vec2) {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    length2 = dx * dx + dy * dy;
  return ARENA_ROCKS.every((r) => {
    const t = length2
      ? Math.max(0, Math.min(1, ((r.x - a.x) * dx + (r.y - a.y) * dy) / length2))
      : 0;
    // Match movement collision, including a fighter already touching the rock.
    return Math.hypot(a.x + dx * t - r.x, a.y + dy * t - r.y) >= r.r + 14 - 0.00001;
  });
}

/** Visibility graph around the inflated rocks; choose a route before steering. */
export function arenaSteer(from: Vec2, to: Vec2): Vec2 {
  const nodes = [
    from,
    to,
    ...ARENA_ROCKS.flatMap((r) =>
      Array.from({ length: 12 }, (_, i) => ({
        x: r.x + Math.cos((i * Math.PI) / 6) * (r.r + 23),
        y: r.y + Math.sin((i * Math.PI) / 6) * (r.r + 23),
      })),
    ),
  ];
  const distance = nodes.map(() => Infinity),
    parent = nodes.map(() => -1),
    visited = new Set<number>();
  distance[0] = 0;
  while (visited.size < nodes.length) {
    let at = -1;
    for (let i = 0; i < nodes.length; i++)
      if (!visited.has(i) && (at < 0 || distance[i] < distance[at])) at = i;
    if (at < 0 || !Number.isFinite(distance[at])) return { x: 0, y: 0 };
    if (at === 1) break;
    visited.add(at);
    nodes.forEach((n, i) => {
      if (visited.has(i) || !arenaLineClear(nodes[at], n)) return;
      const cost = distance[at] + Math.hypot(n.x - nodes[at].x, n.y - nodes[at].y);
      if (cost < distance[i]) {
        distance[i] = cost;
        parent[i] = at;
      }
    });
  }
  let next = 1;
  while (parent[next] > 0) next = parent[next];
  const dx = nodes[next].x - from.x,
    dy = nodes[next].y - from.y,
    length = Math.hypot(dx, dy) || 1;
  return { x: dx / length, y: dy / length };
}
