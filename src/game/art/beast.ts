import { fillEllipse, linear, radial, rgba, type Ctx } from './canvas';

export interface BeastPalette {
  fur: string;
  furShade: string;
  marking: string;
  flame: string;
  flameCore: string;
  eye: string;
  ear: string;
}

export const BEAST_PALETTES: Record<string, BeastPalette> = {
  beast_snow: {
    fur: '#f7fbff',
    furShade: '#b9d2ec',
    marking: '#4fb6ff',
    flame: '#58c8ff',
    flameCore: '#e6fbff',
    eye: '#1d5fbf',
    ear: '#a9dcff',
  },
  beast_fire: {
    fur: '#fff1df',
    furShade: '#f0b989',
    marking: '#e8452c',
    flame: '#ff7a1f',
    flameCore: '#fff2a6',
    eye: '#d68a00',
    ear: '#ffb47a',
  },
};

export interface BeastPose {
  bob: number;
  /** Gait phase in radians. */
  phase: number;
  /** Leg stride amplitude (0 when idle). */
  stride: number;
  lunge: number;
  mouth: number;
  squash: number;
  tail: number;
  /** 0..1 collapse progress for the death animation. */
  down: number;
}

export const BASE_BEAST: BeastPose = { bob: 0, phase: 0, stride: 0, lunge: 0, mouth: 0, squash: 0, tail: 0, down: 0 };

function tail(ctx: Ctx, x: number, y: number, pal: BeastPalette, wave: number, down: number) {
  const pts: [number, number][] = [];
  const tipX = x - 30 + wave * 3;
  const tipY = y - 26 + down * 22 + Math.abs(wave) * 2;
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const cx = x - 18 + wave * 6;
    const cy = y - 4;
    const px = (1 - t) * (1 - t) * x + 2 * (1 - t) * t * cx + t * t * tipX;
    const py = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * cy + t * t * tipY;
    pts.push([px, py]);
  }
  // spirit flame glow around the tail
  const [gx, gy] = pts[pts.length - 1];
  ctx.fillStyle = radial(ctx, gx, gy, 20, [
    [0, rgba(pal.flame, 0.55)],
    [1, rgba(pal.flame, 0)],
  ]);
  ctx.beginPath();
  ctx.arc(gx, gy, 20, 0, Math.PI * 2);
  ctx.fill();
  pts.forEach(([px, py], i) => {
    const r = 5 + Math.sin((i / 8) * Math.PI) * 6 + i * 0.4;
    fillEllipse(ctx, px, py, r + 1, r + 1, 'rgba(40,60,90,0.35)');
  });
  pts.forEach(([px, py], i) => {
    const r = 5 + Math.sin((i / 8) * Math.PI) * 6 + i * 0.4;
    const col = i >= 6 ? pal.flame : pal.fur;
    fillEllipse(ctx, px, py, r, r, col);
  });
  // flame tip
  ctx.fillStyle = linear(ctx, gx, gy + 8, gx, gy - 14, [
    [0, pal.flame],
    [1, pal.flameCore],
  ]);
  ctx.beginPath();
  ctx.moveTo(gx - 7, gy + 2);
  ctx.quadraticCurveTo(gx - 6, gy - 10, gx + 1 + wave * 2, gy - 16);
  ctx.quadraticCurveTo(gx + 3, gy - 6, gx + 7, gy + 1);
  ctx.closePath();
  ctx.fill();
}

function leg(ctx: Ctx, x: number, top: number, bottom: number, lift: number, col: string) {
  ctx.fillStyle = 'rgba(40,60,90,0.45)';
  ctx.beginPath();
  ctx.roundRect(x - 3.5, top, 7, bottom - top - lift + 1, 3);
  ctx.fill();
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.roundRect(x - 3, top, 6, bottom - top - lift, 3);
  ctx.fill();
}

/** Side-view spirit fox, facing right. Feet at (cx, fy). */
export function drawBeast(ctx: Ctx, cx: number, fy: number, pal: BeastPalette, pose: BeastPose) {
  ctx.save();
  ctx.lineJoin = 'round';
  const d = pose.down;
  const bodyY = fy - 20 + pose.bob + d * 10;
  const bx = cx - 2 + pose.lunge;
  const sq = 1 + pose.squash;

  tail(ctx, bx - 16, bodyY - 2, pal, pose.tail, d);

  const swing = (off: number) => Math.sin(pose.phase + off) * pose.stride;
  const lift = (off: number) => Math.max(0, Math.cos(pose.phase + off)) * pose.stride * 0.6;
  if (d < 0.6) {
    leg(ctx, bx - 12 + swing(Math.PI), bodyY + 4, fy, lift(Math.PI), pal.furShade);
    leg(ctx, bx + 12 + swing(0), bodyY + 4, fy, lift(0), pal.furShade);
  }

  // body
  ctx.fillStyle = linear(ctx, 0, bodyY - 12, 0, bodyY + 12, [
    [0, pal.fur],
    [0.6, pal.fur],
    [1, pal.furShade],
  ]);
  ctx.beginPath();
  ctx.ellipse(bx, bodyY, 20 * sq, (12 / sq) * (1 - d * 0.2), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,60,90,0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();
  // spirit markings
  ctx.strokeStyle = pal.marking;
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(bx - 10, bodyY - 8);
  ctx.quadraticCurveTo(bx - 4, bodyY - 2, bx - 10, bodyY + 3);
  ctx.moveTo(bx + 2, bodyY - 10);
  ctx.quadraticCurveTo(bx + 7, bodyY - 4, bx + 2, bodyY + 1);
  ctx.stroke();

  if (d < 0.6) {
    leg(ctx, bx - 8 + swing(0), bodyY + 5, fy, lift(0), pal.fur);
    leg(ctx, bx + 15 + swing(Math.PI), bodyY + 5, fy, lift(Math.PI), pal.fur);
  }

  // chest fluff
  fillEllipse(ctx, bx + 15, bodyY - 1, 8, 9, pal.fur);

  // head
  const hx = bx + 20 + pose.lunge * 0.4;
  const hy = bodyY - 12 + d * 6;
  // ears
  for (const [ex, tilt] of [
    [hx - 6, -0.35],
    [hx + 3, 0.15],
  ] as const) {
    ctx.save();
    ctx.translate(ex, hy - 6);
    ctx.rotate(tilt);
    ctx.fillStyle = pal.fur;
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(0, -15);
    ctx.lineTo(5, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(40,60,90,0.4)';
    ctx.stroke();
    ctx.fillStyle = pal.ear;
    ctx.beginPath();
    ctx.moveTo(-2.5, -1);
    ctx.lineTo(0, -10);
    ctx.lineTo(2.5, -1);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  fillEllipse(ctx, hx, hy, 11, 10, pal.fur);
  // snout
  ctx.fillStyle = pal.fur;
  ctx.beginPath();
  ctx.moveTo(hx + 4, hy - 4);
  ctx.quadraticCurveTo(hx + 18, hy - 1, hx + 17, hy + 3);
  ctx.quadraticCurveTo(hx + 10, hy + 7, hx + 2, hy + 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,60,90,0.35)';
  ctx.stroke();
  fillEllipse(ctx, hx + 16.5, hy + 1, 2.2, 1.8, '#2a2f45');
  if (pose.mouth > 0) {
    ctx.fillStyle = '#7a1f35';
    ctx.beginPath();
    ctx.moveTo(hx + 6, hy + 5);
    ctx.lineTo(hx + 16, hy + 3 + pose.mouth * 2);
    ctx.lineTo(hx + 8, hy + 6 + pose.mouth * 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(hx + 12, hy + 3.5, 1.5, 2);
  }
  // cheek fluff
  ctx.fillStyle = pal.fur;
  ctx.beginPath();
  ctx.moveTo(hx - 8, hy + 2);
  ctx.lineTo(hx - 12, hy + 9);
  ctx.lineTo(hx - 3, hy + 7);
  ctx.closePath();
  ctx.fill();
  // eye
  if (d > 0.5) {
    ctx.strokeStyle = '#2a2f45';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(hx + 1, hy - 1);
    ctx.lineTo(hx + 7, hy - 1);
    ctx.stroke();
  } else {
    ctx.fillStyle = radial(ctx, hx + 4, hy - 1, 6, [
      [0, rgba(pal.flame, 0.6)],
      [1, rgba(pal.flame, 0)],
    ]);
    ctx.beginPath();
    ctx.arc(hx + 4, hy - 1, 6, 0, Math.PI * 2);
    ctx.fill();
    fillEllipse(ctx, hx + 4, hy - 1, 3, 2.3, pal.eye, -0.2);
    fillEllipse(ctx, hx + 3.2, hy - 1.8, 0.9, 0.9, '#ffffff');
  }
  // forehead marking
  ctx.strokeStyle = pal.marking;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(hx - 2, hy - 8);
  ctx.quadraticCurveTo(hx + 1, hy - 5, hx - 1, hy - 3);
  ctx.stroke();
  ctx.restore();
}
