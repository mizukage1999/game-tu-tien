export interface Vec2 {
  x: number;
  y: number;
}

export type Dir = 'down' | 'up' | 'left' | 'right';

export type Rng = () => number;

export function dirFromVector(x: number, y: number, fallback: Dir): Dir {
  if (Math.abs(x) < 0.01 && Math.abs(y) < 0.01) return fallback;
  if (Math.abs(x) > Math.abs(y) * 0.9) return x > 0 ? 'right' : 'left';
  return y > 0 ? 'down' : 'up';
}

export function dirVector(dir: Dir): Vec2 {
  switch (dir) {
    case 'down':
      return { x: 0, y: 1 };
    case 'up':
      return { x: 0, y: -1 };
    case 'left':
      return { x: -1, y: 0 };
    case 'right':
      return { x: 1, y: 0 };
  }
}

export function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
