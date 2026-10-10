export interface Tile {
  x: number;
  y: number;
}

export interface PathResult {
  reached: boolean;
  tiles: Tile[];
}

const DIRS: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

function simplify(path: Tile[]): Tile[] {
  if (path.length <= 2) return path;
  const out = [path[0]];
  for (let i = 1; i < path.length - 1; i++) {
    const a = out[out.length - 1];
    const b = path[i];
    const c = path[i + 1];
    if (b.x - a.x !== c.x - b.x || b.y - a.y !== c.y - b.y) out.push(b);
  }
  out.push(path[path.length - 1]);
  return out;
}

/** 8-direction A* on a blocked grid. `slack` tiles of Chebyshev distance count as arrival. */
export function findPath(blocked: boolean[][], sx: number, sy: number, gx: number, gy: number, slack = 0): PathResult {
  const h = blocked.length;
  const w = blocked[0]?.length ?? 0;
  const openAt = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && !blocked[y]?.[x];
  const near = (x: number, y: number): Tile | null => {
    if (openAt(x, y)) return { x, y };
    for (let r = 1; r <= 4; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          if (openAt(x + dx, y + dy)) return { x: x + dx, y: y + dy };
        }
      }
    }
    return null;
  };
  const start = near(sx, sy);
  const goal = near(gx, gy);
  if (!start || !goal) return { reached: false, tiles: [] };
  if (Math.max(Math.abs(start.x - goal.x), Math.abs(start.y - goal.y)) <= slack) return { reached: true, tiles: [] };

  const key = (x: number, y: number) => y * w + x;
  const gScore = new Map<number, number>();
  const parent = new Map<number, number>();
  const closed = new Set<number>();
  const open: { x: number; y: number; f: number }[] = [];
  const startK = key(start.x, start.y);
  gScore.set(startK, 0);
  open.push({ ...start, f: 0 });
  const heur = (x: number, y: number) => Math.max(Math.abs(x - goal.x), Math.abs(y - goal.y));

  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const cur = open.shift()!;
    const ck = key(cur.x, cur.y);
    if (closed.has(ck)) continue;
    if (cur.x === goal.x && cur.y === goal.y) {
      const path: Tile[] = [];
      let k = ck;
      while (k !== startK) {
        path.push({ x: k % w, y: Math.floor(k / w) });
        const prev = parent.get(k);
        if (prev === undefined) break;
        k = prev;
      }
      path.reverse();
      return { reached: true, tiles: simplify(path) };
    }
    closed.add(ck);
    const base = gScore.get(ck) ?? 0;
    for (const [dx, dy] of DIRS) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (!openAt(nx, ny)) continue;
      if (dx !== 0 && dy !== 0 && (blocked[cur.y]?.[nx] || blocked[ny]?.[cur.x])) continue;
      const nk = key(nx, ny);
      if (closed.has(nk)) continue;
      const ng = base + (dx !== 0 && dy !== 0 ? 1.4 : 1);
      if (ng >= (gScore.get(nk) ?? Infinity)) continue;
      gScore.set(nk, ng);
      parent.set(nk, ck);
      open.push({ x: nx, y: ny, f: ng + heur(nx, ny) });
    }
  }
  return { reached: false, tiles: [] };
}
