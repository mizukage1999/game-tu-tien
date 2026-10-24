import type { MapDef } from '../maps/MapBuilder';
import { makeCanvas, seeded, type Ctx } from './canvas';
import { iso, ISO_PAD, ISO_X, ISO_Y, setIsoOrigin } from './iso';
import { TILE, type Terrain } from './tiles';

/** Continuous materials replace repeated tiny diamonds. All scenery is baked
 * once on entry; the collision grid and quest coordinates remain in map space. */
export function buildVillageGround(map: MapDef, source: HTMLImageElement) {
  return buildMaterialGround(map, source, { columns: 3, rows: 2, palette: { stone: 1, dirt: 2, farmland: 4, water: 3 }, meadow: 0, dirt: 2, bank: 5 });
}

export interface MaterialStyle {
  columns: number; rows: number; palette: Partial<Record<Terrain, number>>;
  meadow: number; dirt: number; bank: number; cool?: boolean;
}

export function buildMaterialGround(map: MapDef, source: HTMLImageElement, style: MaterialStyle) {
  const w = map.width * TILE, h = map.height * TILE;
  setIsoOrigin(w, h);
  const width = Math.ceil((w + h) * ISO_X + ISO_PAD * 2);
  const height = Math.ceil((w + h) * ISO_Y + ISO_PAD * 2 + 26);
  const [canvas, ctx] = makeCanvas(width, height);
  ctx.imageSmoothingQuality = 'high';
  const at = iso(0, 0);
  ctx.setTransform(ISO_X, ISO_Y, -ISO_X, ISO_Y, at.x, at.y);
  const materials = Array.from({ length: style.columns * style.rows }, (_, i) => {
    // Mirrored edges keep repeating swatches continuous without a visible seam.
    const [tile, paint] = makeCanvas(512, 512);
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
      paint.save(); paint.translate(x ? 512 : 0, y ? 512 : 0);
      paint.scale(x ? -1 : 1, y ? -1 : 1);
      paint.drawImage(source, i % style.columns * source.width / style.columns, Math.floor(i / style.columns) * source.height / style.rows,
        source.width / style.columns, source.height / style.rows, 0, 0, 256, 256);
      paint.restore();
    }
    return ctx.createPattern(tile, 'repeat')!;
  });
  const is = (x: number, y: number, kinds: Terrain[]) => kinds.includes(map.terrain[y]?.[x]);
  const mask = (kinds: Terrain[], expand = 0) => {
    ctx.beginPath();
    for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
      if (!is(x, y, kinds)) continue;
      const args = [x * TILE - expand, y * TILE - expand, TILE + expand * 2 + .5, TILE + expand * 2 + .5] as const;
      if (typeof ctx.roundRect === 'function') ctx.roundRect(...args, expand ? 10 : 1);
      else ctx.rect(...args);
    }
  };
  ctx.fillStyle = materials[style.meadow]; ctx.fillRect(0, 0, w, h);
  if (!style.cool) { ctx.fillStyle = 'rgba(25, 63, 54, .18)'; ctx.fillRect(0, 0, w, h); }

  // Soft soil shoulders around the lanes, instead of isolated square tiles.
  mask(['stone', 'dirt', 'path', 'marble'], 7); ctx.fillStyle = materials[style.dirt]; ctx.fill();
  for (const [terrain, material] of Object.entries(style.palette)) {
    if (material < 0 || terrain === 'water') continue;
    mask([terrain as Terrain]); ctx.fillStyle = materials[material]; ctx.fill();
  }
  mask(['water'], 11); ctx.fillStyle = materials[style.bank]; ctx.fill();
  mask(['water']); ctx.fillStyle = materials[style.palette.water ?? 3]; ctx.fill();
  mask(['water']); ctx.fillStyle = 'rgba(6, 51, 60, .25)'; ctx.fill();
  const rng = seeded(8521);
  for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
    const tile = map.terrain[y][x], px = x * TILE, py = y * TILE;
    if (tile === 'water') {
      for (const dx of [-1, 1]) if (!is(x + dx, y, ['water', 'bridge'])) {
        const bank = ctx.createLinearGradient(dx < 0 ? px : px + TILE, 0, dx < 0 ? px + 16 : px + TILE - 16, 0);
        bank.addColorStop(0, 'rgba(8, 32, 33, .42)'); bank.addColorStop(1, 'rgba(8, 32, 33, 0)');
        ctx.fillStyle = bank; ctx.fillRect(dx < 0 ? px : px + TILE - 16, py, 16, TILE);
      }
    } else if (tile === 'bridge') {
      ctx.fillStyle = '#897558'; ctx.fillRect(px, py, TILE + .5, TILE + .5);
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = i % 2 ? '#998364' : '#aa9470'; ctx.fillRect(px + i * 12 + 1, py, 10, TILE);
        ctx.fillStyle = 'rgba(37, 33, 27, .24)'; ctx.fillRect(px + i * 12 + 3, py + 4, 1, TILE - 8);
      }
    } else if (tile === 'farmland') {
      ctx.strokeStyle = 'rgba(27, 29, 16, .32)'; ctx.lineWidth = 3;
      for (const n of [12, 36]) {
        ctx.beginPath(); ctx.moveTo(px + n, py); ctx.lineTo(px + n, py + TILE); ctx.stroke();
        for (const dy of [10, 32]) {
          const cx = px + n + rng() * 4, cy = py + dy;
          for (let leaf = 0; leaf < 3; leaf++) {
            ctx.fillStyle = ['#6f8c45', '#94aa61', '#516b34'][leaf];
            ctx.beginPath(); ctx.ellipse(cx + (leaf - 1) * 4, cy - leaf * 2, 7, 3, leaf - 1, 0, Math.PI * 2); ctx.fill();
          }
        }
      }
    }
  }

  // Long, soft contact shadows make painted props sit on the same ground.
  for (const d of map.decor) {
    if (/circle|bridge|herbs|fence|railing|farm/.test(d.key)) continue;
    const house = /hall|house|home|pavilion|gate|school|apothecary|market/.test(d.key);
    const tree = /tree|willow|peach|pine|cherry|bamboo/.test(d.key);
    const radius = house ? 125 : tree ? 76 : 36;
    ctx.save(); ctx.translate((d.x + .5) * TILE, (d.y + .6) * TILE);
    ctx.rotate(-.55); ctx.scale(1.5, .66);
    const shadow = ctx.createRadialGradient(0, 0, 4, 12, 0, radius);
    shadow.addColorStop(0, 'rgba(14, 29, 27, .32)'); shadow.addColorStop(.55, 'rgba(14, 29, 27, .17)'); shadow.addColorStop(1, 'rgba(14, 29, 27, 0)');
    ctx.fillStyle = shadow; ctx.fillRect(-radius, -radius, radius * 2.2, radius * 2);
    ctx.restore();
  }

  // A subtle morning wash and shaded perimeter tie the materials to the art.
  const light = ctx.createLinearGradient(0, 0, w, h);
  light.addColorStop(0, style.cool ? 'rgba(168, 210, 255, .08)' : 'rgba(255, 226, 155, .12)'); light.addColorStop(1, 'rgba(17, 36, 57, .14)');
  ctx.fillStyle = light; ctx.fillRect(0, 0, w, h);
  for (const [x1, y1, x2, y2] of [[0, 0, 85, 0], [w, 0, w - 85, 0], [0, 0, 0, 85], [0, h, 0, h - 85]]) {
    const edge = ctx.createLinearGradient(x1, y1, x2, y2);
    edge.addColorStop(0, 'rgba(14, 40, 36, .8)'); edge.addColorStop(1, 'rgba(14, 40, 36, 0)');
    ctx.fillStyle = edge;
    ctx.fillRect(x1 === w ? w - 85 : 0, y1 === h ? h - 85 : 0, x1 !== x2 ? 85 : w, y1 !== y2 ? 85 : h);
  }
  // Feather the outer diamond into the distant valley rather than exposing a
  // hard rectangular board when the camera reaches the village boundary.
  ctx.globalCompositeOperation = 'destination-out';
  for (const [x1, y1, x2, y2] of [[0, 0, 32, 0], [w, 0, w - 32, 0], [0, 0, 0, 32], [0, h, 0, h - 32]]) {
    const edge = ctx.createLinearGradient(x1, y1, x2, y2);
    edge.addColorStop(0, '#000'); edge.addColorStop(1, 'transparent'); ctx.fillStyle = edge;
    ctx.fillRect(x1 === w ? w - 32 : 0, y1 === h ? h - 32 : 0, x1 !== x2 ? 32 : w, y1 !== y2 ? 32 : h);
  }
  ctx.resetTransform();
  ctx.globalCompositeOperation = 'source-over';
  groundRipples(ctx, map);
  return { canvas, width, height };
}

/** Narrow reflections are part of the baked ground, with no runtime particles. */
function groundRipples(ctx: Ctx, map: MapDef) {
  const rng = seeded(612);
  ctx.strokeStyle = 'rgba(218, 244, 224, .38)'; ctx.lineWidth = 1.2;
  for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
    if (map.terrain[y][x] !== 'water' || rng() > .65) continue;
    const at = iso((x + rng()) * TILE, (y + rng()) * TILE);
    ctx.beginPath(); ctx.ellipse(at.x, at.y, 6 + rng() * 13, 1.5 + rng() * 2, -.12, Math.PI * .12, Math.PI * .83); ctx.stroke();
  }
}
