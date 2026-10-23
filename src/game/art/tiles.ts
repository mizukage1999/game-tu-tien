import { fillEllipse, linear, makeCanvas, radial, rgba, seeded, type Ctx } from './canvas';

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
  cave: { base: 20, variants: 2 },
  farmland: { base: 22, variants: 1 },
  marble: { base: 23, variants: 2 },
} as const;

export type Terrain = keyof typeof TERRAIN;
export const TILE_COUNT = 25;

/** Warm sandstone courtyard palette, lifted from the concept art. */
const STONE = {
  base: ['#d8ccb2', '#d2c5a9', '#dccfb6'],
  light: '#f4ecd8',
  shade: '#a99a7c',
  joint: '#8e8168',
  moss: '#7f9a5a',
};

const PATH = {
  base: ['#e6d6b6', '#e1cfab'],
  light: '#fdf6e2',
  shade: '#c3ae8a',
  joint: '#b6a17e',
};

const GRASS = { base: '#7aa355', dark: '#4f7a3c', deep: '#3d6332', light: '#b6d386', blade: '#d3eaa2' };

const WATER = { deep: '#1f6478', mid: '#2f8497', light: '#7fd3dd', foam: '#d8f7f7' };

function rounded(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/** Fine speckle grain that makes flat fills read as painted stone. */
function grain(ctx: Ctx, x: number, y: number, seed: number, count: number, dark: string, light: string, w = TILE, h = TILE) {
  const r = seeded(seed);
  for (let i = 0; i < count; i++) {
    const px = x + r() * w;
    const py = y + r() * h;
    const c = r();
    ctx.fillStyle = c > 0.55 ? rgba(light, 0.10 + r() * 0.16) : rgba(dark, 0.08 + r() * 0.14);
    ctx.fillRect(px, py, 1 + Math.round(r()), 1 + Math.round(r()));
  }
}

/** Soft, slightly blotted paint layer — keeps large flat areas from looking like a fill. */
function blotches(ctx: Ctx, x: number, y: number, seed: number, count: number, colors: string[]) {
  const r = seeded(seed + 17);
  for (let i = 0; i < count; i++) {
    const rad = 5 + r() * 13;
    fillEllipse(ctx, x + r() * TILE, y + r() * TILE, rad, rad * (0.5 + r() * 0.6), rgba(colors[i % colors.length], 0.05 + r() * 0.06));
  }
}

function pebbles(ctx: Ctx, x: number, y: number, seed: number, count: number, colors: string[]) {
  const r = seeded(seed);
  for (let i = 0; i < count; i++) {
    const px = x + 2 + r() * (TILE - 4);
    const py = y + 2 + r() * (TILE - 4);
    const rx = 1 + r() * 2.4;
    fillEllipse(ctx, px, py, rx, rx * 0.75, rgba(colors[Math.floor(r() * colors.length)], 0.85));
    fillEllipse(ctx, px - rx * 0.3, py - rx * 0.35, rx * 0.5, rx * 0.35, 'rgba(255,255,255,0.35)');
  }
}

function crack(ctx: Ctx, x: number, y: number, seed: number) {
  const r = seeded(seed);
  ctx.strokeStyle = rgba('#4f4531', 0.35);
  ctx.lineWidth = 0.9;
  let px = x + 4 + r() * (TILE - 8);
  let py = y + 2 + r() * 8;
  ctx.beginPath();
  ctx.moveTo(px, py);
  for (let i = 0; i < 3; i++) {
    px += (r() - 0.5) * 12;
    py += 4 + r() * 7;
    ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x + 4 + r() * (TILE - 8), y + 2 + r() * 8);
  ctx.lineTo(px + 1, py + 1);
  ctx.stroke();
}

/** Moss creeping out of a joint, as in the reference courtyard. */
function moss(ctx: Ctx, x: number, y: number, seed: number) {
  const r = seeded(seed);
  const corner = Math.floor(r() * 4);
  const cx = x + (corner % 2 === 0 ? 4 : TILE - 4);
  const cy = y + (corner < 2 ? 4 : TILE - 4);
  for (let i = 0; i < 7; i++) {
    fillEllipse(ctx, cx + (r() - 0.5) * 16, cy + (r() - 0.5) * 12, 1.5 + r() * 2.5, 1.2 + r() * 1.8, rgba(STONE.moss, 0.4 + r() * 0.3));
  }
}

function stoneTile(ctx: Ctx, x: number, y: number, seed: number, base: string, withInlay: boolean) {
  const r = seeded(seed);
  // Smooth sunlit sandstone: quiet colour, fine grain, and one diagonal seam so the
  // courtyard reads as large pavers instead of a tiled grid.
  ctx.fillStyle = linear(ctx, x, y, x + TILE * 0.5, y + TILE, [
    [0, '#dbcfb4'],
    [0.45, base],
    [1, '#bcaa88'],
  ]);
  ctx.fillRect(x, y, TILE, TILE);
  blotches(ctx, x, y, seed, 6, ['#efe5cc', '#a99a78', '#cbb992']);
  grain(ctx, x, y, seed + 31, 40, '#98876a', '#efe6cd');
  // diamond seams: soft, so they read as joints in stone rather than grout lines
  const h = TILE / 2;
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgba('#7d6f55', 0.42);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x - 1, y + h);
  ctx.lineTo(x + h, y - 1);
  ctx.lineTo(x + TILE + 1, y + h);
  ctx.lineTo(x + h, y + TILE + 1);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,251,236,0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 1, y + h - 1.4);
  ctx.lineTo(x + h - 1.4, y - 1);
  ctx.stroke();
  if (withInlay) {
    ctx.save();
    ctx.translate(x + h, y + h);
    ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = rgba('#9c8a68', 0.35);
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-9, -9, 18, 18);
    ctx.strokeStyle = rgba('#f7efd9', 0.5);
    ctx.beginPath();
    ctx.arc(0, 0, 3.4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  if (r() > 0.72) crack(ctx, x, y, seed + 71);
  if (r() > 0.78) moss(ctx, x, y, seed + 93);
}

function grass(
  ctx: Ctx,
  x: number,
  y: number,
  seed: number,
  base: string,
  dark: string,
  light: string,
  deep = '#3d6332',
) {
  const r = seeded(seed);
  ctx.fillStyle = linear(ctx, x, y, x + TILE * 0.4, y + TILE, [
    [0, light],
    [0.35, base],
    [1, dark],
  ]);
  ctx.fillRect(x, y, TILE, TILE);
  // mottled light falling through blossoms
  for (let i = 0; i < 10; i++) {
    const px = x + r() * TILE;
    const py = y + r() * TILE;
    fillEllipse(ctx, px, py, 4 + r() * 9, 3 + r() * 7, rgba(r() > 0.5 ? deep : light, 0.1 + r() * 0.12));
  }
  // blades
  ctx.lineWidth = 1;
  for (let i = 0; i < 34; i++) {
    const gx = x + r() * TILE;
    const gy = y + 3 + r() * (TILE - 4);
    const lean = (r() - 0.5) * 4;
    const tall = 3 + r() * 4;
    ctx.strokeStyle = rgba(r() > 0.45 ? '#cfe99c' : deep, 0.35 + r() * 0.4);
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.quadraticCurveTo(gx + lean * 0.5, gy - tall * 0.6, gx + lean, gy - tall);
    ctx.stroke();
  }
  // tiny ground blossoms
  for (let i = 0; i < 3; i++) {
    const px = x + 4 + r() * (TILE - 8);
    const py = y + 4 + r() * (TILE - 8);
    if (r() > 0.55) fillEllipse(ctx, px, py, 1.6, 1.6, rgba('#fff4c9', 0.85));
    else fillEllipse(ctx, px, py, 1.3, 1.3, rgba('#ffc8dc', 0.8));
  }
}

function petals(ctx: Ctx, x: number, y: number, seed: number) {
  const r = seeded(seed);
  for (let i = 0; i < 16; i++) {
    const px = x + 2 + r() * (TILE - 4);
    const py = y + 2 + r() * (TILE - 4);
    ctx.fillStyle = rgba(r() > 0.35 ? '#ffd3e4' : '#fff6fa', 0.85);
    ctx.beginPath();
    ctx.ellipse(px, py, 2.4, 1.3, r() * 3.14, 0, Math.PI * 2);
    ctx.fill();
  }
  // one small sakura
  const cx = x + 8 + r() * (TILE - 16);
  const cy = y + 8 + r() * (TILE - 16);
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    fillEllipse(ctx, cx + Math.cos(a) * 3, cy + Math.sin(a) * 3, 2.1, 2.1, '#ffb3d2');
  }
  fillEllipse(ctx, cx, cy, 1.4, 1.4, '#fff3b0');
}

function slabTile(ctx: Ctx, x: number, y: number, seed: number, base: string, shade: string, speckle: boolean) {
  const r = seeded(seed);
  ctx.fillStyle = linear(ctx, x, y, x + TILE * 0.4, y + TILE, [
    [0, '#f3e9d2'],
    [0.4, base],
    [1, shade],
  ]);
  ctx.fillRect(x, y, TILE, TILE);
  blotches(ctx, x, y, seed, 5, ['#fff8e6', '#c9b795']);
  grain(ctx, x, y, seed + 7, 26, '#b09a76', '#fdf6e4');
  // hairline seams at the slab edges
  ctx.strokeStyle = rgba('#a28d6b', 0.35);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + TILE - 0.5, y);
  ctx.lineTo(x + TILE - 0.5, y + TILE);
  ctx.moveTo(x, y + TILE - 0.5);
  ctx.lineTo(x + TILE, y + TILE - 0.5);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,252,238,0.45)';
  ctx.beginPath();
  ctx.moveTo(x + 0.5, y + 1);
  ctx.lineTo(x + 0.5, y + TILE - 1);
  ctx.moveTo(x + 1, y + 0.5);
  ctx.lineTo(x + TILE - 1, y + 0.5);
  ctx.stroke();
  if (speckle) {
    pebbles(ctx, x, y, seed + 3, 4, ['#d8c8a8', '#bdab8a']);
    if (r() > 0.5) moss(ctx, x, y, seed + 11);
  }
}

function water(ctx: Ctx, x: number, y: number, seed: number) {
  const r = seeded(seed);
  ctx.fillStyle = linear(ctx, x, y, x + TILE * 0.3, y + TILE, [
    [0, WATER.mid],
    [0.55, WATER.deep],
    [1, '#164e60'],
  ]);
  ctx.fillRect(x, y, TILE, TILE);
  // depth blobs
  for (let i = 0; i < 6; i++) {
    fillEllipse(ctx, x + r() * TILE, y + r() * TILE, 6 + r() * 12, 4 + r() * 8, rgba(WATER.deep, 0.18));
  }
  // caustics
  ctx.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    const wx = x + r() * (TILE - 16);
    const wy = y + 4 + r() * (TILE - 8);
    ctx.strokeStyle = rgba(WATER.light, 0.22 + r() * 0.2);
    ctx.lineWidth = 1 + r();
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    ctx.quadraticCurveTo(wx + 6, wy - 3.5, wx + 13, wy + 0.5);
    ctx.stroke();
  }
  // sparkles
  for (let i = 0; i < 5; i++) {
    const sx = x + r() * TILE;
    const sy = y + r() * TILE;
    ctx.fillStyle = rgba(WATER.foam, 0.5 + r() * 0.4);
    ctx.fillRect(sx, sy, 2, 1);
  }
  if (seed % 2 === 0) {
    // lily pads
    for (const [px, py, rr] of [
      [15, 14, 6],
      [33, 31, 4.5],
    ] as const) {
      fillEllipse(ctx, x + px, y + py, rr, rr * 0.8, '#4d8a56');
      fillEllipse(ctx, x + px - 1, y + py - 1, rr * 0.7, rr * 0.5, '#68a867');
      ctx.fillStyle = '#3f7449';
      ctx.beginPath();
      ctx.moveTo(x + px, y + py);
      ctx.lineTo(x + px + rr, y + py - 1);
      ctx.lineTo(x + px + rr * 0.6, y + py + rr * 0.6);
      ctx.fill();
    }
    fillEllipse(ctx, x + 30, y + 20, 2.6, 2, '#ffc3dd');
    fillEllipse(ctx, x + 29, y + 19, 1.2, 0.9, '#fff3c9');
  }
}

function wall(ctx: Ctx, x: number, y: number) {
  const r = seeded(77);
  ctx.fillStyle = '#69707c';
  ctx.fillRect(x, y, TILE, TILE);
  const rows = 4;
  const rh = TILE / rows;
  for (let row = 0; row < rows; row++) {
    const offset = (row % 2) * 11 - 5;
    const by = y + row * rh;
    for (let col = -1; col < 4; col++) {
      const bx = x + col * 22 + offset;
      ctx.fillStyle = linear(ctx, bx, by, bx + 20, by + rh, [
        [0, '#b3bac5'],
        [0.45, '#919aa6'],
        [1, '#6d7683'],
      ]);
      rounded(ctx, bx + 1, by + 1, 20, rh - 2, 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(bx + 2.5, by + rh - 3);
      ctx.lineTo(bx + 2.5, by + 2.5);
      ctx.lineTo(bx + 19, by + 2.5);
      ctx.stroke();
    }
  }
  // sunlit coping at the top edge, moss at the base
  ctx.fillStyle = linear(ctx, x, y, x, y + 5, [
    [0, 'rgba(255,252,238,0.5)'],
    [1, 'rgba(255,252,238,0)'],
  ]);
  ctx.fillRect(x, y, TILE, 5);
  for (let i = 0; i < 6; i++) {
    fillEllipse(ctx, x + r() * TILE, y + TILE - 1 - r() * 5, 2 + r() * 3, 1.6, rgba(STONE.moss, 0.4));
  }
  grain(ctx, x, y, 501, 26, '#5b626d', '#cfd5de');
}

function platform(ctx: Ctx, x: number, y: number) {
  ctx.fillStyle = linear(ctx, x, y, x + TILE, y + TILE, [
    [0, '#eef8ff'],
    [0.5, '#d3e4f2'],
    [1, '#b6cde2'],
  ]);
  ctx.fillRect(x, y, TILE, TILE);
  ctx.strokeStyle = 'rgba(90,150,200,0.35)';
  ctx.lineWidth = 1;
  rounded(ctx, x + 1.5, y + 1.5, TILE - 3, TILE - 3, 4);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.arc(x + TILE / 2, y + TILE / 2, 9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(140,215,255,0.5)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(x + TILE / 2, y + TILE / 2, 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = radial(ctx, x + TILE / 2, y + TILE / 2, 16, [
    [0, 'rgba(190,240,255,0.55)'],
    [1, 'rgba(190,240,255,0)'],
  ]);
  ctx.fillRect(x, y, TILE, TILE);
}

function dirt(ctx: Ctx, x: number, y: number, seed: number) {
  const r = seeded(seed);
  ctx.fillStyle = linear(ctx, x, y, x + TILE, y + TILE, [
    [0, '#a98a66'],
    [1, '#8a6e4f'],
  ]);
  ctx.fillRect(x, y, TILE, TILE);
  for (let i = 0; i < 12; i++) {
    fillEllipse(ctx, x + r() * TILE, y + r() * TILE, 3 + r() * 10, 2 + r() * 7, rgba(r() > 0.5 ? '#bda07a' : '#6f5739', 0.18));
  }
  pebbles(ctx, x, y, seed + 5, 9, ['#c3b294', '#7d6850', '#9b8a6f']);
  grain(ctx, x, y, seed + 41, 30, '#5f4a30', '#d3bd97');
}

function bridge(ctx: Ctx, x: number, y: number) {
  water(ctx, x, y, 6);
  const planks = 6;
  const ph = TILE / planks;
  for (let i = 0; i < planks; i++) {
    const py = y + i * ph;
    ctx.fillStyle = linear(ctx, x, py, x + TILE, py, [
      [0, i % 2 ? '#a8753f' : '#b98247'],
      [0.5, '#c08a4e'],
      [1, i % 2 ? '#8d5f31' : '#a06e3a'],
    ]);
    ctx.fillRect(x, py, TILE, ph - 1);
    ctx.fillStyle = 'rgba(255,235,190,0.16)';
    ctx.fillRect(x, py, TILE, 1);
    ctx.fillStyle = 'rgba(60,36,16,0.35)';
    ctx.fillRect(x, py + ph - 2, TILE, 1);
    for (const nx of [6, 41]) {
      ctx.fillStyle = 'rgba(70,48,26,0.5)';
      ctx.fillRect(x + nx, py + ph * 0.4, 1.6, 1.6);
    }
  }
  // rails
  ctx.fillStyle = linear(ctx, x, y, x, y + 3, [
    [0, '#c8543f'],
    [1, '#8a2b22'],
  ]);
  ctx.fillRect(x, y, TILE, 3);
  ctx.fillRect(x, y + TILE - 3, TILE, 3);
}

export function buildTileset(): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(TILE * TILE_COUNT, TILE);
  // Painters spill past their cell (bricks, ellipses), so each tile is clipped to its own square.
  const cell = (i: number, paint: (x: number) => void) => {
    const x = i * TILE;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, 0, TILE, TILE);
    ctx.clip();
    paint(x);
    ctx.restore();
  };
  for (let v = 0; v < 3; v++) cell(TERRAIN.grass.base + v, (x) => grass(ctx, x, 0, 11 + v * 7, GRASS.base, GRASS.dark, GRASS.light, GRASS.deep));
  for (let v = 0; v < 2; v++) {
    cell(TERRAIN.flower.base + v, (x) => {
      grass(ctx, x, 0, 31 + v * 5, GRASS.base, GRASS.dark, GRASS.light, GRASS.deep);
      petals(ctx, x, 0, 41 + v * 3);
    });
  }
  for (let v = 0; v < 3; v++) cell(TERRAIN.stone.base + v, (x) => stoneTile(ctx, x, 0, 51 + v * 9, STONE.base[v], v === 2));
  // Walkway: long sandstone slabs with hairline seams, so it reads as a road and
  // not as a brick wall running through the courtyard.
  for (let v = 0; v < 2; v++)
    cell(TERRAIN.path.base + v, (x) => slabTile(ctx, x, 0, 71 + v * 5, PATH.base[v], PATH.shade, v === 1));
  cell(TERRAIN.wall.base, (x) => wall(ctx, x, 0));
  for (let v = 0; v < 2; v++) cell(TERRAIN.water.base + v, (x) => water(ctx, x, 0, 3 + v));
  cell(TERRAIN.platform.base, (x) => platform(ctx, x, 0));
  for (let v = 0; v < 2; v++) cell(TERRAIN.dirt.base + v, (x) => dirt(ctx, x, 0, 91 + v * 4));
  for (let v = 0; v < 3; v++)
    cell(TERRAIN.darkgrass.base + v, (x) =>
      grass(ctx, x, 0, 101 + v * 3, '#5f8f4c', '#39602f', '#8dbe68', '#2c4d26'),
    );
  cell(TERRAIN.bridge.base, (x) => bridge(ctx, x, 0));
  for (let v = 0; v < 2; v++) cell(TERRAIN.marble.base + v, (x) => slabTile(ctx, x, 0, 301 + v, v ? '#c7d5df' : '#bacbd4', '#8399ab', v === 1));
  for (let v = 0; v < 2; v++) cell(TERRAIN.cave.base + v, (x) => {
    stoneTile(ctx, x, 0, 400 + v, '#23334c', false);
    ctx.fillStyle = 'rgba(11,25,51,.65)'; ctx.fillRect(x, 0, TILE, TILE);
    ctx.strokeStyle = 'rgba(91,190,229,.2)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x + 6, 0); ctx.lineTo(x + 18, 17); ctx.lineTo(x + 12, 35); ctx.lineTo(x + 22, TILE); ctx.stroke();
  });
  cell(TERRAIN.farmland.base, (x) => {
    dirt(ctx, x, 0, 501);
    ctx.strokeStyle = '#4c422e'; ctx.lineWidth = 4;
    for (let y = 8; y < TILE; y += 12) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + TILE, y); ctx.stroke(); }
    ctx.fillStyle = '#92b369';
    for (let y = 7; y < TILE; y += 12) for (let j = 8; j < TILE; j += 12) fillEllipse(ctx, x + j, y, 3, 2, '#92b369');
  });
  return canvas;
}
