import type Phaser from 'phaser';
import { CHARACTERS, RIGS, frameName } from './generate';
import { HERO_DIRECTIONS } from './heroDirections';

export const HERO_SHEETS = ['hero-wang-v5', 'hero-li-v5', 'hero-states-v5'];
const CELL = 160,
  FOOT = 150;
type Crop = { source: HTMLImageElement; x: number; y: number; w: number; h: number };

function trim(
  source: HTMLImageElement,
  cols: number,
  rows: number,
  col: number,
  row: number,
  region?: number[],
): Crop {
  const x = Math.round((region?.[0] ?? col / cols) * source.width),
    y = Math.round((region?.[1] ?? row / rows) * source.height);
  const w = Math.round((region?.[2] ?? 1 / cols) * source.width),
    h = Math.round((region?.[3] ?? 1 / rows) * source.height);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(source, x, y, w, h, 0, 0, w, h);
  const pixels = ctx.getImageData(0, 0, w, h).data;
  // Some authored rows slightly overlap their nominal cells. Keep the main vertical
  // silhouette band, excluding isolated boots from the preceding row.
  let bandStart = 2,
    bestStart = 2,
    bestEnd = h - 3,
    bestLength = 0,
    inBand = false;
  for (let cy = 2; cy < h - 1; cy++) {
    let occupied = false;
    if (cy < h - 2)
      for (let cx = 2; cx < w - 2; cx++)
        if (pixels[(cy * w + cx) * 4 + 3] >= 96) {
          occupied = true;
          break;
        }
    if (occupied && !inBand) {
      bandStart = cy;
      inBand = true;
    }
    if (!occupied && inBand) {
      if (cy - bandStart > bestLength) {
        bestLength = cy - bandStart;
        bestStart = bandStart;
        bestEnd = cy - 1;
      }
      inBand = false;
    }
  }
  let left = w,
    top = h,
    right = -1,
    bottom = -1;
  // Ignore soft transparent fringe when measuring, but draw original RGBA pixels.
  for (let cy = bestStart; cy <= bestEnd; cy++)
    for (let cx = 2; cx < w - 2; cx++) {
      if (pixels[(cy * w + cx) * 4 + 3] < 96) continue;
      left = Math.min(left, cx);
      right = Math.max(right, cx);
      top = Math.min(top, cy);
      bottom = Math.max(bottom, cy);
    }
  return right < left
    ? { source, x, y, w, h }
    : { source, x: x + left, y: y + top, w: right - left + 1, h: bottom - top + 1 };
}

/** Pack authored poses with one body scale and a shared foot anchor; no per-frame stretching. */
export function registerHeroes(scene: Phaser.Scene) {
  RIGS.hero_v5 = {
    frameWidth: CELL,
    frameHeight: CELL,
    originY: FOOT / CELL,
    dirs: [...HERO_DIRECTIONS],
    anims: {
      idle: { frames: 1, frameRate: 1, repeat: -1 },
      run: { frames: 4, frameRate: 8, repeat: -1 },
      attack: { frames: 3, frameRate: 8, repeat: 0, hitFrame: 1 },
      attack_1: { frames: 3, frameRate: 8, repeat: 0, hitFrame: 1 },
      attack_2: { frames: 3, frameRate: 9, repeat: 0, hitFrame: 1 },
      attack_3: { frames: 3, frameRate: 7, repeat: 0, hitFrame: 1 },
      cast: { frames: 3, frameRate: 6, repeat: 0, hitFrame: 1, dirs: ['down'] },
      hurt: { frames: 2, frameRate: 9, repeat: 0, dirs: ['down'] },
      downed: { frames: 1, frameRate: 1, repeat: 0, dirs: ['down'] },
      meditate: { frames: 1, frameRate: 1, repeat: -1, dirs: ['down'] },
    },
  };
  for (const [key, row] of [
    ['hero-wang-v5', 0],
    ['hero-li-v5', 1],
  ] as const) {
    if (!scene.textures.exists(`${key}-source`) || !scene.textures.exists('hero-states-v5-source'))
      continue;
    const source = scene.textures.get(`${key}-source`).getSourceImage() as HTMLImageElement;
    const states = scene.textures.get('hero-states-v5-source').getSourceImage() as HTMLImageElement;
    // Row gaps in the authored sheets are not mathematically even. These inspected
    // boundaries preserve complete boots and hair rather than slicing at 25%.
    const rowEdges =
      row === 0 ? [0, 236 / 887, 454 / 887, 679 / 887, 1] : [0, 225 / 887, 448 / 887, 669 / 887, 1];
    const poses = Array.from({ length: 32 }, (_, n) => {
      const r = Math.floor(n / 8);
      return trim(source, 8, 4, 0, 0, [
        (n % 8) / 8,
        rowEdges[r],
        1 / 8,
        rowEdges[r + 1] - rowEdges[r],
      ]);
    });
    // The lying figures extend beyond their nominal column; inspected regions keep heads intact.
    const regions =
      row === 0
        ? [
            [0.02, 0.005, 0.21, 0.48],
            [0.255, 0.01, 0.2, 0.48],
            [0.46, 0.3, 0.3, 0.19],
            [0.78, 0.09, 0.21, 0.39],
          ]
        : [
            [0.02, 0.505, 0.21, 0.485],
            [0.255, 0.51, 0.2, 0.48],
            [0.46, 0.76, 0.3, 0.23],
            [0.78, 0.55, 0.21, 0.4],
          ];
    const special = regions.map((region) => trim(states, 4, 2, 0, 0, region));
    // Scale from standing rows, so a seated or fallen hero keeps anatomical size.
    const standingHeight = Math.max(...poses.slice(0, 24).map((p) => p.h));
    const scale = Math.min(108 / standingHeight, 146 / Math.max(...poses.map((p) => p.w)));
    const canvas = document.createElement('canvas');
    canvas.width = CELL * 8;
    canvas.height = CELL * 5;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const draw = (p: Crop, index: number, k: number) => {
      const w = p.w * k,
        h = p.h * k;
      ctx.drawImage(
        p.source,
        p.x,
        p.y,
        p.w,
        p.h,
        (index % 8) * CELL + (CELL - w) / 2,
        Math.floor(index / 8) * CELL + FOOT - h,
        w,
        h,
      );
    };
    poses.forEach((p, n) => draw(p, n, scale));
    const specialScale = Math.min(108 / special[0].h, 146 / special[2].w);
    special.forEach((p, n) => draw(p, 32 + n, specialScale));
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const texture = scene.textures.addCanvas(key, canvas)!;
    const add = (anim: string, dir: string, frame: number, pose: number) =>
      texture.add(
        frameName(anim, dir, frame),
        0,
        (pose % 8) * CELL,
        Math.floor(pose / 8) * CELL,
        CELL,
        CELL,
      );
    HERO_DIRECTIONS.forEach((dir, col) => {
      add('idle', dir, 0, col);
      [8 + col, col, 16 + col, col].forEach((p, n) => add('run', dir, n, p));
      for (const anim of ['attack', 'attack_1', 'attack_2', 'attack_3'])
        [col, 24 + col, col].forEach((p, n) => add(anim, dir, n, p));
    });
    [0, 0, 0].forEach((_, n) => add('cast', 'down', n, n === 1 ? 32 : 0));
    [33, 0].forEach((p, n) => add('hurt', 'down', n, p));
    add('downed', 'down', 0, 34);
    add('meditate', 'down', 0, 35);
    CHARACTERS[key] = { rig: 'hero_v5', palette: row === 0 ? 'player_male' : 'player' };
  }
  // Only the compact packed atlases are needed during play. Free the large source GPU textures.
  for (const key of HERO_SHEETS)
    if (scene.textures.exists(`${key}-source`)) scene.textures.remove(`${key}-source`);
}
