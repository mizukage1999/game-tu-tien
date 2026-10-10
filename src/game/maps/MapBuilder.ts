import type { Terrain } from '../art/tiles';
import type { ZoneDef } from '../systems/cultivation';
import { seeded } from '../art/canvas';

export interface DecorPlacement {
  key: string;
  x: number;
  y: number;
  /** Tiles blocked by this object, relative to (x, y). */
  block?: [number, number][];
  glow?: 'warm' | 'cold';
}

export interface PortalDef {
  rect: [number, number, number, number];
  to: string;
  spawn: [number, number];
  label: string;
}

export interface MapDef {
  id: string;
  name: string;
  width: number;
  height: number;
  terrain: Terrain[][];
  blocked: boolean[][];
  decor: DecorPlacement[];
  monsters: { type: string; x: number; y: number }[];
  npcs: { id: string; x: number; y: number }[];
  zones: ZoneDef[];
  portals: PortalDef[];
  playerSpawn: [number, number];
  ambient: 'petals' | 'fireflies' | 'snow' | 'embers';
  /** Set on dungeon maps: the dungeon id plus where waves, the boss and the exit gate appear. */
  arena?: { dungeon: string; spawns: [number, number][]; boss: [number, number]; exit: [number, number, number, number] };
}

const BLOCKING: Partial<Record<Terrain, true>> = { wall: true, water: true };

/** Small programmatic level editor. Coordinates are in tiles. */
export class MapBuilder {
  terrain: Terrain[][];
  extraBlocked: boolean[][];
  decor: DecorPlacement[] = [];
  occupied: boolean[][];
  rng: () => number;

  constructor(
    public width: number,
    public height: number,
    fill: Terrain,
    seed = 1,
  ) {
    this.terrain = Array.from({ length: height }, () => Array<Terrain>(width).fill(fill));
    this.extraBlocked = Array.from({ length: height }, () => Array<boolean>(width).fill(false));
    this.occupied = Array.from({ length: height }, () => Array<boolean>(width).fill(false));
    this.rng = seeded(seed);
  }

  inside(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  fill(x: number, y: number, w: number, h: number, t: Terrain) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (this.inside(i, j)) this.terrain[j][i] = t;
    return this;
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, t: Terrain) {
    for (let j = Math.floor(cy - ry); j <= Math.ceil(cy + ry); j++)
      for (let i = Math.floor(cx - rx); i <= Math.ceil(cx + rx); i++) {
        if (!this.inside(i, j)) continue;
        const dx = (i + 0.5 - cx) / rx;
        const dy = (j + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.terrain[j][i] = t;
      }
    return this;
  }

  border(t: Terrain, gaps: [number, number][] = []) {
    const isGap = (x: number, y: number) => gaps.some(([gx, gy]) => gx === x && gy === y);
    for (let i = 0; i < this.width; i++) {
      if (!isGap(i, 0)) this.terrain[0][i] = t;
      if (!isGap(i, this.height - 1)) this.terrain[this.height - 1][i] = t;
    }
    for (let j = 0; j < this.height; j++) {
      if (!isGap(0, j)) this.terrain[j][0] = t;
      if (!isGap(this.width - 1, j)) this.terrain[j][this.width - 1] = t;
    }
    return this;
  }

  scatter(t: Terrain, on: Terrain, chance: number) {
    for (let j = 0; j < this.height; j++)
      for (let i = 0; i < this.width; i++) if (this.terrain[j][i] === on && this.rng() < chance) this.terrain[j][i] = t;
    return this;
  }

  free(x: number, y: number) {
    return this.inside(x, y) && !this.occupied[y][x] && !BLOCKING[this.terrain[y][x]] && !this.extraBlocked[y][x];
  }

  place(key: string, x: number, y: number, opts: { block?: [number, number][]; glow?: 'warm' | 'cold' } = {}) {
    const block = opts.block ?? [[0, 0]];
    for (const [dx, dy] of block) {
      if (this.inside(x + dx, y + dy)) this.extraBlocked[y + dy][x + dx] = true;
    }
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) if (this.inside(x + dx, y + dy)) this.occupied[y + dy][x + dx] = true;
    this.decor.push({ key, x, y, block, glow: opts.glow });
    return this;
  }

  /** Keeps a 3x3 area around each point free of random decor (spawn points, NPCs). */
  reserve(points: { x: number; y: number }[]) {
    for (const p of points)
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) if (this.inside(p.x + dx, p.y + dy)) this.occupied[p.y + dy][p.x + dx] = true;
    return this;
  }

  /** Places decor randomly on allowed terrain, keeping `keepClear` rectangles empty. */
  sprinkle(keys: string[], count: number, on: Terrain[], keepClear: [number, number, number, number][] = [], block = true) {
    let tries = 0;
    let placed = 0;
    while (placed < count && tries++ < count * 40) {
      const x = 1 + Math.floor(this.rng() * (this.width - 2));
      const y = 1 + Math.floor(this.rng() * (this.height - 2));
      if (!on.includes(this.terrain[y][x]) || !this.free(x, y)) continue;
      if (keepClear.some(([rx, ry, rw, rh]) => x >= rx && x < rx + rw && y >= ry && y < ry + rh)) continue;
      const key = keys[Math.floor(this.rng() * keys.length)];
      this.place(key, x, y, block ? {} : { block: [] });
      placed++;
    }
    return this;
  }

  build(meta: Omit<MapDef, 'width' | 'height' | 'terrain' | 'blocked' | 'decor'>): MapDef {
    const blocked = this.terrain.map((row, j) => row.map((t, i) => !!BLOCKING[t] || this.extraBlocked[j][i]));
    return { ...meta, width: this.width, height: this.height, terrain: this.terrain, blocked, decor: this.decor };
  }
}
