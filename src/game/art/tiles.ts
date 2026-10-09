import { fillEllipse, linear, makeCanvas, rgba, seeded, type Ctx } from './canvas';

export const TILE = 48;

/** Base index and number of variants for each terrain type in the generated tileset. */
export const TERRAIN = {
  grass: { base: 0, variants: 3 },
  flower: { base: 3, variants: 2 },
  stone: { base: 5, variants: 3 },
  path: { base: 8, variants: 2 },
  wall: { base: 10, variants: 1 },
  water: { base: 11, variants: 2 },
  platform: { base: 13, variants: 1 },
  dirt: { base: 14, variants: 2 },
  darkgrass: { base: 16, variants: 3 },
  bridge: { base: 19, variants: 1 },
} as const;

export type Terrain = keyof typeof TERRAIN;
export const TILE_COUNT = 20;

function grass(ctx: Ctx, x: number, y: number, seed: number, base: string, dark: string, light: string) {
  const r = seeded(seed);
  ctx.fillStyle = base;
  ctx.fillRect(x, y, TILE, TILE);
  for (let i = 0; i < 9; i++) {
    fillEllipse(ctx, x + r() * TILE, y + r() * TILE, 6 + r() * 8, 4 + r() * 5, rgba(dark, 0.25));
  }
  ctx.lineWidth = 1;
  for (let i = 0; i < 26; i++) {
    const gx = x + r() * TILE;
    const gy = y + r() * TILE;
    ctx.strokeStyle = r() > 0.5 ? rgba(light, 0.7) : rgba(dark, 0.6);
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx + (r() - 0.5) * 3, gy - 3 - r() * 3);
    ctx.stroke();
  }
}

function petals(ctx: Ctx, x: number, y: number, seed: number) {
  const r = seeded(seed);
  for (let i = 0; i < 14; i++) {
    const px = x + 3 + r() * (TILE - 6);
    const py = y + 3 + r() * (TILE - 6);
    fillEllipse(ctx, px, py, 2.2, 1.4, r() > 0.3 ? '#ffc4dc' : '#ffffff', r() * 3);
  }
  for (let i = 0; i < 3; i++) {
    const px = x + 6 + r() * (TILE - 12);
    const py = y + 6 + r() * (TILE - 12);
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      fillEllipse(ctx, px + Math.cos(a) * 2.2, py + Math.sin(a) * 2.2, 1.8, 1.8, '#ff9cc4');
    }
    fillEllipse(ctx, px, py, 1.2, 1.2, '#fff2a0');
  }
}

function stone(ctx: Ctx, x: number, y: number, seed: number, base: string, edge: string) {
  const r = seeded(seed);
  ctx.fillStyle = base;
  ctx.fillRect(x, y, TILE, TILE);
  const half = TILE / 2;
  for (let i = 0; i < 4; i++) {
    const sx = x + (i % 2) * half;
    const sy = y + Math.floor(i / 2) * half;
    ctx.fillStyle = linear(ctx, sx, sy, sx + half, sy + half, [
      [0, rgba('#ffffff', 0.18 + r() * 0.1)],
      [1, rgba('#000000', 0.04 + r() * 0.06)],
    ]);
    ctx.fillRect(sx + 1, sy + 1, half - 2, half - 2);
  }
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, half - 1, half - 1);
  ctx.strokeRect(x + half + 0.5, y + 0.5, half - 1, half - 1);
  ctx.strokeRect(x + 0.5, y + half + 0.5, half - 1, half - 1);
  ctx.strokeRect(x + half + 0.5, y + half + 0.5, half - 1, half - 1);
  if (r() > 0.75) {
    ctx.strokeStyle = rgba('#7a8494', 0.18);
    ctx.beginPath();
    const cx = x + r() * TILE;
    const cy = y + r() * TILE;
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + (r() - 0.5) * 12, cy + (r() - 0.5) * 12);
    ctx.lineTo(cx + (r() - 0.5) * 16, cy + (r() - 0.5) * 16);
    ctx.stroke();
  }
}

function water(ctx: Ctx, x: number, y: number, seed: number) {
  const r = seeded(seed);
  ctx.fillStyle = linear(ctx, x, y, x, y + TILE, [
    [0, '#3d8fd1'],
    [1, '#2a6fb3'],
  ]);
  ctx.fillRect(x, y, TILE, TILE);
  ctx.strokeStyle = 'rgba(200,240,255,0.45)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 4; i++) {
    const wx = x + r() * (TILE - 14);
    const wy = y + 6 + r() * (TILE - 12);
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    ctx.quadraticCurveTo(wx + 5, wy - 3, wx + 10, wy);
    ctx.stroke();
  }
  if (seed % 2 === 0) {
    fillEllipse(ctx, x + 30, y + 30, 7, 5, '#4fae5a');
    fillEllipse(ctx, x + 32, y + 28, 2.5, 2.5, '#ffb3d1');
  }
}

function wall(ctx: Ctx, x: number, y: number) {
  ctx.fillStyle = '#3d4458';
  ctx.fillRect(x, y, TILE, TILE);
  for (let row = 0; row < 4; row++) {
    const ry = y + row * 12;
    ctx.fillStyle = linear(ctx, x, ry, x, ry + 12, [
      [0, '#5b6680'],
      [1, '#2c3245'],
    ]);
    for (let col = 0; col < 4; col++) {
      const rx = x + col * 12 + (row % 2) * 6 - 6;
      ctx.beginPath();
      ctx.ellipse(rx + 6, ry + 8, 6.5, 6, 0, Math.PI, 0);
      ctx.fill();
    }
  }
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(x, y, TILE, 3);
}

function platform(ctx: Ctx, x: number, y: number) {
  ctx.fillStyle = linear(ctx, x, y, x + TILE, y + TILE, [
    [0, '#eef6ff'],
    [1, '#c9d8ea'],
  ]);
  ctx.fillRect(x, y, TILE, TILE);
  ctx.strokeStyle = 'rgba(120,170,220,0.45)';
  ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
  ctx.strokeStyle = 'rgba(90,190,255,0.35)';
  ctx.beginPath();
  ctx.arc(x + TILE / 2, y + TILE / 2, 10, 0, Math.PI * 2);
  ctx.stroke();
}

function dirt(ctx: Ctx, x: number, y: number, seed: number) {
  const r = seeded(seed);
  ctx.fillStyle = '#8c7155';
  ctx.fillRect(x, y, TILE, TILE);
  for (let i = 0; i < 18; i++) {
    fillEllipse(ctx, x + r() * TILE, y + r() * TILE, 1 + r() * 3, 1 + r() * 2, r() > 0.5 ? '#a38766' : '#6f5841');
  }
}

function bridge(ctx: Ctx, x: number, y: number) {
  water(ctx, x, y, 1);
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 ? '#9a6b42' : '#a8784c';
    ctx.fillRect(x, y + 2 + i * 7.5, TILE, 7);
  }
  ctx.fillStyle = '#b5322d';
  ctx.fillRect(x, y, TILE, 3);
  ctx.fillRect(x, y + TILE - 3, TILE, 3);
}

export function buildTileset(): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(TILE * TILE_COUNT, TILE);
  // Painters spill past their cell (wall bricks, ellipses), so each tile is clipped to its own square.
  const cell = (i: number, paint: (x: number) => void) => {
    const x = i * TILE;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, 0, TILE, TILE);
    ctx.clip();
    paint(x);
    ctx.restore();
  };
  for (let v = 0; v < 3; v++) cell(TERRAIN.grass.base + v, (x) => grass(ctx, x, 0, 11 + v * 7, '#79b85a', '#4f8a3a', '#a8dc7c'));
  for (let v = 0; v < 2; v++) {
    cell(TERRAIN.flower.base + v, (x) => {
      grass(ctx, x, 0, 31 + v * 5, '#79b85a', '#4f8a3a', '#a8dc7c');
      petals(ctx, x, 0, 41 + v * 3);
    });
  }
  for (let v = 0; v < 3; v++) cell(TERRAIN.stone.base + v, (x) => stone(ctx, x, 0, 51 + v * 9, '#c9ccd3', 'rgba(110,116,130,0.55)'));
  for (let v = 0; v < 2; v++) cell(TERRAIN.path.base + v, (x) => stone(ctx, x, 0, 71 + v * 5, '#e2d6bf', 'rgba(150,130,100,0.5)'));
  cell(TERRAIN.wall.base, (x) => wall(ctx, x, 0));
  for (let v = 0; v < 2; v++) cell(TERRAIN.water.base + v, (x) => water(ctx, x, 0, 3 + v));
  cell(TERRAIN.platform.base, (x) => platform(ctx, x, 0));
  for (let v = 0; v < 2; v++) cell(TERRAIN.dirt.base + v, (x) => dirt(ctx, x, 0, 91 + v * 4));
  for (let v = 0; v < 3; v++) cell(TERRAIN.darkgrass.base + v, (x) => grass(ctx, x, 0, 101 + v * 3, '#4f8f4a', '#2f6233', '#7fbf6a'));
  cell(TERRAIN.bridge.base, (x) => bridge(ctx, x, 0));
  return canvas;
}
