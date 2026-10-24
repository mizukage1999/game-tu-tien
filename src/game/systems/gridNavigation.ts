import { findPath } from './path';
import type { Vec2 } from '../types';

export function gridLineClear(
  blocked: boolean[][],
  tile: number,
  from: Vec2,
  to: Vec2,
  rx = 17,
  ry = 8,
) {
  // Exact swept-body intersection: sampling can miss a thin corner and strand the AI there.
  const dx = to.x - from.x,
    dy = to.y - from.y;
  for (
    let y = Math.floor((Math.min(from.y, to.y) - ry) / tile);
    y <= Math.floor((Math.max(from.y, to.y) + ry) / tile);
    y++
  ) {
    for (
      let x = Math.floor((Math.min(from.x, to.x) - rx) / tile);
      x <= Math.floor((Math.max(from.x, to.x) + rx) / tile);
      x++
    ) {
      if (blocked[y]?.[x] === false) continue;
      let enter = 0,
        leave = 1,
        miss = false;
      for (const [start, delta, low, high] of [
        [from.x, dx, x * tile - rx, (x + 1) * tile + rx],
        [from.y, dy, y * tile - ry, (y + 1) * tile + ry],
      ]) {
        if (Math.abs(delta) < 0.00001) {
          if (start <= low || start >= high) {
            miss = true;
            break;
          }
        } else {
          const a = (low - start) / delta,
            b = (high - start) / delta;
          enter = Math.max(enter, Math.min(a, b));
          leave = Math.min(leave, Math.max(a, b));
          if (enter >= leave) {
            miss = true;
            break;
          }
        }
      }
      if (!miss) return false;
    }
  }
  return true;
}

export class GridNavigator {
  private points: Vec2[] = [];
  private remaining = 0;
  private goal = '';
  steer(blocked: boolean[][], tile: number, from: Vec2, to: Vec2, speed: number, dt: number): Vec2 {
    this.remaining -= dt;
    let waypoint = to;
    if (!gridLineClear(blocked, tile, from, to)) {
      const sx = Math.floor(from.x / tile),
        sy = Math.floor(from.y / tile);
      const gx = Math.floor(to.x / tile),
        gy = Math.floor(to.y / tile),
        key = `${gx},${gy}`;
      if (this.remaining <= 0 || this.goal !== key) {
        const path = findPath(blocked, sx, sy, gx, gy);
        this.points = path.reached
          ? [
              { x: (sx + 0.5) * tile, y: (sy + 0.5) * tile },
              ...path.tiles.map((t) => ({ x: (t.x + 0.5) * tile, y: (t.y + 0.5) * tile })),
            ]
          : [];
        this.remaining = 700;
        this.goal = key;
      }
      while (
        this.points.length &&
        Math.hypot(this.points[0].x - from.x, this.points[0].y - from.y) < 6
      )
        this.points.shift();
      // Only skip a corner when the whole collision body can pass it.
      while (this.points.length > 1 && gridLineClear(blocked, tile, from, this.points[1]))
        this.points.shift();
      if (!this.points.length) return { x: 0, y: 0 };
      waypoint = this.points[0];
    } else {
      this.points = [];
      this.remaining = 0;
    }
    const dx = waypoint.x - from.x,
      dy = waypoint.y - from.y,
      distance = Math.hypot(dx, dy) || 1;
    const amount = Math.min(speed, distance / Math.max(0.001, dt / 1000));
    return { x: (dx / distance) * amount, y: (dy / distance) * amount };
  }
}
