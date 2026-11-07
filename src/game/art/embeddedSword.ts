import type { HeroId } from '../../data/heroes';
import { HERO_DIRECTIONS, type HeroDirection } from './heroDirections';

type Stroke = readonly [number, number, number, number, number];
/** Blade/tassel silhouettes in the authored 160px Wang Lam cells, outside the body. */
const IDLE: readonly (readonly Stroke[])[] = [
  [[54, 112, 26, 147, 6]],
  [[59, 108, 32, 139, 6]],
  [[60, 115, 40, 146, 6]],
  [],
  [
    [104, 112, 126, 140, 5],
    [53, 112, 33, 139, 5],
  ],
  [],
  [[95, 115, 113, 140, 6]],
  [[102, 110, 131, 144, 6]],
];
const CAST: readonly (readonly Stroke[])[] = [
  [
    [64, 103, 13, 131, 7],
    [69, 107, 69, 120, 3],
  ],
  [
    [62, 95, 13, 114, 7],
    [56, 99, 56, 112, 3],
  ],
  [
    [64, 88, 9, 102, 7],
    [65, 92, 65, 105, 3],
  ],
  [[53, 91, 18, 100, 7]],
  [
    [27, 89, 12, 88, 5],
    [30, 94, 31, 105, 3],
  ],
  [
    [102, 91, 153, 103, 7],
    [105, 95, 104, 106, 3],
  ],
  [
    [111, 93, 156, 103, 7],
    [110, 98, 110, 110, 3],
  ],
  [[115, 107, 153, 135, 7]],
];
export function replacesEmbeddedSword(hero: HeroId) {
  return hero === 'wang_lam';
}

/** A render mask, applied to a private cosmetic texture; original assets stay intact. */
export function maskEmbeddedSword(
  ctx: CanvasRenderingContext2D,
  hero: HeroId,
  direction: HeroDirection,
  casting = false,
  x = 0,
  y = 0,
) {
  if (!replacesEmbeddedSword(hero)) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalCompositeOperation = 'destination-out';
  ctx.strokeStyle = '#000';
  ctx.lineCap = 'round';
  for (const [x1, y1, x2, y2, width] of (casting ? CAST : IDLE)[
    HERO_DIRECTIONS.indexOf(direction)
  ]) {
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.restore();
}

const HAND_IDLE: readonly (readonly [number, number, number, number])[] = [
  [-24, -43, -0.7, 0.85],
  [-20, -45, -0.7, 0.85],
  [-19, -39, -0.5, 0.9],
  [-24, -42, -0.5, 0.85],
  [22, -42, 0.65, 0.85],
  [30, -46, 0.45, 0.9],
  [11, -41, 0.65, 0.85],
  [18, -44, 0.65, 0.85],
];
const HAND_CAST: readonly (readonly [number, number, number, number])[] = [
  [-11, -49, -1, 0.5],
  [-11, -56, -1, 0.3],
  [-11, -63, -1, 0.17],
  [-20, -60, -1, 0.12],
  [-49, -61, -1, -0.05],
  [16, -63, 1, 0.2],
  [25, -61, 1, 0.2],
  [29, -49, 1, 0.6],
];
export function embeddedSwordHand(direction: HeroDirection, casting = false) {
  return (casting ? HAND_CAST : HAND_IDLE)[HERO_DIRECTIONS.indexOf(direction)];
}

/** The prepared run poses move the whole hand and body together. */
export function embeddedSwordLift(frameY: number) {
  return frameY === 160 ? -1.5 : frameY === 320 ? 1.5 : 0;
}
