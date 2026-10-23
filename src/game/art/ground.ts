import type { MapDef } from '../maps/MapBuilder';
import { makeCanvas, rgba, type Ctx } from './canvas';
import { ISO_PAD, ISO_X, ISO_Y, iso, isoY, setIsoOrigin } from './iso';
import { buildTileset, TERRAIN, TILE } from './tiles';

/** Raised height of a wall cell, in screen pixels. */
const WALL_H = 26;
const AGED_COURTS = new Set(['ngoai_mon', 'linh_son_tong', 'dinh_ta', 'dai_thua_vien', 'dong_phu']);

const WALL_FACE = { light: '#9aa1ac', mid: '#6c7480', dark: '#3d434f' };

let cachedTileset: HTMLCanvasElement | null = null;

function tileset(): HTMLCanvasElement {
  if (!cachedTileset) cachedTileset = buildTileset();
  return cachedTileset;
}

/** Stable per-cell hash, matching the variant pick used by the scene. */
function hash(x: number, y: number) {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >>> 13)) * 1274126177;
  return (h ^ (h >>> 16)) >>> 0;
}

function tileIndex(map: MapDef, x: number, y: number) {
  const t = map.terrain[y][x];
  const cfg = TERRAIN[t];
  // Sect terraces use aged warm stone, with the same material treatment as the village.
  if (t === 'platform' && AGED_COURTS.has(map.id)) return { index: TERRAIN.stone.base + hash(x,y)%3, terrain: t };
  return { index: cfg.base + (hash(x, y) % cfg.variants), terrain: t };
}

/**
 * Paints one cell as a diamond. The transform maps map pixels to screen pixels
 * (x' = x - y, y' = (x + y) / 2), so the square tile art lands as a 48×24
 * diamond and every neighbour meets it exactly.
 */
function paintTile(ctx: Ctx, centreX: number, centreY: number, index: number, tiles: HTMLCanvasElement) {
  ctx.save();
  ctx.translate(centreX, centreY);
  ctx.transform(ISO_X, ISO_Y, -ISO_X, ISO_Y, 0, 0);
  ctx.drawImage(tiles, index * TILE, 0, TILE, TILE, -TILE / 2, -TILE / 2, TILE, TILE);
  ctx.restore();
}

function diamond(ctx: Ctx, cx: number, cy: number, w: number, h: number) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - h / 2);
  ctx.lineTo(cx + w / 2, cy);
  ctx.lineTo(cx, cy + h / 2);
  ctx.lineTo(cx - w / 2, cy);
  ctx.closePath();
}

/** A restrained inlaid compass gives the large courtyard a visible center. */
function courtyardInlay(ctx: Ctx) {
  const at = iso(24 * TILE, 18 * TILE);
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.scale(1, .5);
  const radius = 204;
  ctx.fillStyle = 'rgba(33, 66, 71, .3)';
  ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(218, 194, 134, .6)';
  ctx.lineWidth = 3;
  for (const r of [radius, radius - 12, 80, 68]) {
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 8; i++) {
    ctx.save(); ctx.rotate(i * Math.PI / 4);
    ctx.beginPath(); ctx.moveTo(90, 0); ctx.lineTo(174, -15); ctx.lineTo(190, 0);
    ctx.lineTo(174, 15); ctx.closePath(); ctx.stroke();
    ctx.restore();
  }
  ctx.beginPath(); ctx.moveTo(0, -54); ctx.lineTo(37, 0); ctx.lineTo(0, 54); ctx.lineTo(-37, 0); ctx.closePath(); ctx.stroke();
  ctx.restore();
}

/**
 * Renders the whole terrain into one isometric canvas: flat ground first, then
 * a second pass that lifts wall cells onto short cliff faces. Baked once per
 * map, so the tile count costs nothing at runtime.
 *
 * Returns the canvas plus the caller-facing texture size.
 */
export function buildIsoGround(map: MapDef) {
  const worldW = map.width * TILE;
  const worldH = map.height * TILE;
  setIsoOrigin(worldW, worldH);

  const width = Math.ceil((worldW + worldH) * ISO_X + ISO_PAD * 2);
  const height = Math.ceil((worldW + worldH) * ISO_Y + ISO_PAD * 2 + WALL_H);
  const [canvas, ctx] = makeCanvas(width, height);
  const tiles = tileset();

  // ---- flat ground -------------------------------------------------------
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const { index, terrain } = tileIndex(map, x, y);
      const centre = iso(x * TILE + TILE / 2, y * TILE + TILE / 2);
      paintTile(ctx, centre.x, centre.y, index, tiles);
      if (terrain === 'water') {
        // Water sits a hair below the paving: cool rim on the far edge, shadow
        // on the near edge, which is what sells a sunken pond.
        ctx.fillStyle = 'rgba(12, 40, 52, 0.25)';
        diamond(ctx, centre.x, centre.y + 3, TILE, TILE / 2);
        ctx.fill();
      }
    }
  }

  if (map.id === 'dai_thua_vien') courtyardInlay(ctx);

  // ---- raised walls ------------------------------------------------------
  const walls: [number, number][] = [];
  for (let y = 0; y < map.height; y++)
    for (let x = 0; x < map.width; x++) if (map.terrain[y][x] === 'wall') walls.push([x, y]);
  // far cells first, so a near wall overlaps the one behind it
  walls.sort((a, b) => a[0] + a[1] - (b[0] + b[1]));

  for (const [x, y] of walls) {
    const top = iso(x * TILE + TILE / 2, y * TILE + TILE / 2);
    const base = top.y + TILE * ISO_Y * 0.5;
    const leftX = top.x - TILE * ISO_X * 0.5;
    const rightX = top.x + TILE * ISO_X * 0.5;
    // two visible faces of the extruded cell
    ctx.fillStyle = WALL_FACE.mid;
    ctx.beginPath();
    ctx.moveTo(top.x, base);
    ctx.lineTo(rightX, base - TILE * ISO_Y * 0.5);
    ctx.lineTo(rightX, base - TILE * ISO_Y * 0.5 - WALL_H);
    ctx.lineTo(top.x, base - WALL_H);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = WALL_FACE.dark;
    ctx.beginPath();
    ctx.moveTo(top.x, base);
    ctx.lineTo(leftX, base - TILE * ISO_Y * 0.5);
    ctx.lineTo(leftX, base - TILE * ISO_Y * 0.5 - WALL_H);
    ctx.lineTo(top.x, base - WALL_H);
    ctx.closePath();
    ctx.fill();
    // brick courses on the lit face
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 3; i++) {
      const dy = base - (WALL_H * i) / 3;
      ctx.beginPath();
      ctx.moveTo(top.x, dy - 4);
      ctx.lineTo(rightX, dy - 4 - TILE * ISO_Y * 0.5);
      ctx.stroke();
    }
    // moss at the foot
    ctx.fillStyle = 'rgba(110,150,80,0.25)';
    ctx.beginPath();
    ctx.moveTo(top.x, base);
    ctx.lineTo(rightX, base - TILE * ISO_Y * 0.5);
    ctx.lineTo(rightX, base - TILE * ISO_Y * 0.5 - 5);
    ctx.lineTo(top.x, base - 5);
    ctx.closePath();
    ctx.fill();
    // the sunlit top face, raised
    const { index } = tileIndex(map, x, y);
    paintTile(ctx, top.x, top.y - WALL_H, index, tiles);
    ctx.fillStyle = 'rgba(255, 250, 235, 0.10)';
    diamond(ctx, top.x, top.y - WALL_H, TILE, TILE * ISO_Y);
    ctx.fill();
  }

  // ---- soft ambient occlusion around raised edges -------------------------
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  for (const [x, y] of walls) {
    const top = iso(x * TILE + TILE / 2, y * TILE + TILE / 2);
    const base = top.y + TILE * ISO_Y * 0.5;
    ctx.fillStyle = rgba('#0b1220', 0.16);
    diamond(ctx, top.x + 2, base + 10, TILE * 1.1, TILE * ISO_Y * 0.7);
    ctx.fill();
  }
  ctx.restore();

  return { canvas, width, height };
}

/** Screen y of the ground under a map point, for props that stand on it. */
export function groundY(mx: number, my: number) {
  return isoY(mx, my);
}
