import type { HeroId } from '../../data/heroes';
import { HERO_DIRECTIONS, type HeroDirection } from './heroDirections';
import { heroRunPhase, runningPoseY } from './heroSheetLayout';

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

/** Right-hand grip centres in each of the eight newly authored running poses. */
const HAND_RUN: readonly (readonly (readonly [number, number])[])[] = [
  [
    [64, 87],
    [61, 84],
    [64, 88],
    [66, 85],
    [64, 91],
    [62, 85],
    [64, 87],
    [67, 88],
  ],
  [
    [56, 88],
    [53, 90],
    [56, 93],
    [59, 94],
    [56, 96],
    [54, 91],
    [56, 91],
    [60, 96],
  ],
  [
    [55, 89],
    [53, 90],
    [51, 89],
    [55, 96],
    [56, 97],
    [53, 91],
    [55, 91],
    [56, 96],
  ],
  [
    [60, 91],
    [57, 91],
    [57, 92],
    [61, 100],
    [61, 98],
    [57, 92],
    [60, 93],
    [61, 99],
  ],
  [
    [102, 91],
    [101, 91],
    [102, 92],
    [101, 89],
    [103, 91],
    [102, 91],
    [102, 92],
    [102, 90],
  ],
  [
    [105, 87],
    [105, 87],
    [105, 90],
    [105, 86],
    [106, 90],
    [105, 87],
    [106, 90],
    [106, 87],
  ],
  [
    [104, 89],
    [106, 93],
    [107, 93],
    [104, 87],
    [105, 94],
    [107, 94],
    [108, 95],
    [104, 89],
  ],
  [
    [103, 85],
    [105, 89],
    [110, 89],
    [109, 85],
    [106, 92],
    [106, 91],
    [109, 91],
    [108, 85],
  ],
];
export function runningSwordHand(direction: HeroDirection, frameY: number) {
  const phase = heroRunPhase(frameY);
  if (phase < 0) return embeddedSwordHand(direction);
  const index = HERO_DIRECTIONS.indexOf(direction),
    [x, y] = HAND_RUN[index][phase];
  const side = index < 4 ? -1 : 1;
  return [x - 80, runningPoseY(y) - 150, side * 0.75, 0.7] as const;
}
