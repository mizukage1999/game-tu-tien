import { fillEllipse, linear, radial, rgba, shade, type Ctx } from './canvas';

export type HairStyle = 'bun' | 'topknot' | 'elder' | 'hat' | 'flowing';

export interface HumanPalette {
  robe: string;
  robeShade: string;
  trim: string;
  sash: string;
  skin: string;
  hair: string;
  accessory: string;
  hairStyle: HairStyle;
  longHair: boolean;
  beard: boolean;
  sword: boolean;
  aura: string;
}

export const PALETTES: Record<string, HumanPalette> = {
  player: {
    robe: '#f7fbff',
    robeShade: '#a9c6ea',
    trim: '#3f8bff',
    sash: '#2c5fd6',
    skin: '#ffe4d4',
    hair: '#141223',
    accessory: '#9fe8ff',
    hairStyle: 'bun',
    longHair: true,
    beard: false,
    sword: true,
    aura: '#8fe3ff',
  },
  player_male: {
    robe: '#243656',
    robeShade: '#131d2f',
    trim: '#e3bd62',
    sash: '#8a6230',
    skin: '#f0cbb4',
    hair: '#1a120c',
    accessory: '#e3bd62',
    hairStyle: 'topknot',
    longHair: false,
    beard: false,
    sword: true,
    aura: '#f0d48a',
  },
  elder: {
    robe: '#d6dce3',
    robeShade: '#8d99a8',
    trim: '#caa14a',
    sash: '#6b5636',
    skin: '#f3d6c2',
    hair: '#f4f4f4',
    accessory: '#caa14a',
    hairStyle: 'elder',
    longHair: false,
    beard: true,
    sword: false,
    aura: '#ffe9a8',
  },
  merchant: {
    robe: '#b8692c',
    robeShade: '#7a3f17',
    trim: '#f2c75c',
    sash: '#3b2414',
    skin: '#f6d2b8',
    hair: '#2a1c12',
    accessory: '#f2c75c',
    hairStyle: 'hat',
    longHair: false,
    beard: false,
    sword: false,
    aura: '#ffd27a',
  },
  disciple: {
    robe: '#eaf1fb',
    robeShade: '#9db0cd',
    trim: '#2b63c8',
    sash: '#2b63c8',
    skin: '#f8dcc8',
    hair: '#141420',
    accessory: '#2b63c8',
    hairStyle: 'topknot',
    longHair: false,
    beard: false,
    sword: true,
    aura: '#9ac2ff',
  },
  hermit: {
    robe: '#41604f',
    robeShade: '#243a2e',
    trim: '#a9c99b',
    sash: '#1d2b22',
    skin: '#efd2bd',
    hair: '#dcdcdc',
    accessory: '#a9c99b',
    hairStyle: 'flowing',
    longHair: true,
    beard: true,
    sword: false,
    aura: '#c9ffd8',
  },
};

export type ViewDir = 'down' | 'up' | 'side';

export interface HumanPose {
  bob: number;
  /** Stride phase in [-1, 1]. */
  step: number;
  /** Sleeve swing in [-1, 1]. */
  arm: number;
  /** Sword angle in radians (0 = forward), or null when sheathed. */
  sword: number | null;
  /** Slash trail drawn from this angle to `sword`. */
  trailFrom: number | null;
  /** Extra forward reach of the sword hand (thrust). */
  reach: number;
  /** Both hands raised to cast, 0..1. */
  cast: number;
  tilt: number;
  mode: 'stand' | 'sit' | 'lie';
  /** 0..1 lying progress for the downed animation. */
  fall: number;
  eyesClosed: boolean;
}

export const BASE_POSE: HumanPose = {
  bob: 0,
  step: 0,
  arm: 0,
  sword: null,
  trailFrom: null,
  reach: 0,
  cast: 0,
  tilt: 0,
  mode: 'stand',
  fall: 0,
  eyesClosed: false,
};

const OUTLINE = 'rgba(26,30,54,0.62)';
const GOLD = '#e8c877';

/**
 * Proportions of the hero: about four and a half heads tall, measured up from
 * the feet at `fy`. Small head + long skirt is what makes a wuxia heroine read
 * as elegant instead of chibi.
 */
const HEAD_R = 9;
const HEAD_Y = 69; // head centre above the feet
const SHOULDER_Y = 55;
const WAIST_Y = 41;
const HEM_Y = 6;

function screenAngle(view: ViewDir, a: number) {
  if (view === 'side') return a;
  if (view === 'down') return a + Math.PI / 2;
  return a - Math.PI / 2;
}

function robeGradient(ctx: Ctx, pal: HumanPalette, top: number, bottom: number) {
  return linear(ctx, 0, top, 0, bottom, [
    [0, pal.robe],
    [0.55, shade(pal.robe.startsWith('#') ? pal.robe : '#ffffff', -0.04)],
    [1, pal.robeShade],
  ]);
}

/** Hair with a lit rim and a soft sheen band — never a flat black slab. */
function hairFill(ctx: Ctx, pal: HumanPalette) {
  return radial(ctx, -3, -6, 40, [
    [0, shade(pal.hair, 0.22)],
    [0.55, pal.hair],
    [1, shade(pal.hair, -0.3)],
  ]);
}

function hairStrands(ctx: Ctx, cx: number, fromY: number, toY: number, spread: number, seed = 0) {
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const t = (i - 2.5) / 2.5;
    const dx = t * spread;
    ctx.strokeStyle = i % 2 ? 'rgba(140,168,230,0.30)' : 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(cx + dx * 0.5, fromY);
    ctx.quadraticCurveTo(cx + dx * 1.1 + seed * 2, (fromY + toY) * 0.5, cx + dx * 1.35, toY);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBlade(ctx: Ctx, hx: number, hy: number, ang: number, len: number, aura: string) {
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);
  const tx = hx + dx * len;
  const ty = hy + dy * len;
  ctx.save();
  ctx.lineCap = 'round';
  // aura
  ctx.strokeStyle = rgba(aura, 0.32);
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(hx + dx * 6, hy + dy * 6);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  // blade body with a cold edge highlight
  ctx.strokeStyle = linear(ctx, hx, hy, tx, ty, [
    [0, '#9fb4d6'],
    [0.4, '#e9f3ff'],
    [1, '#ffffff'],
  ]);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(hx + dx * 5, hy + dy * 5);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  ctx.strokeStyle = rgba(aura, 0.85);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(hx + dx * 6, hy + dy * 6 + 2);
  ctx.lineTo(tx, ty + 1);
  ctx.stroke();
  // guard + hilt
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(hx + dx * 5 - dy * 4, hy + dy * 5 + dx * 4);
  ctx.lineTo(hx + dx * 5 + dy * 4, hy + dy * 5 - dx * 4);
  ctx.stroke();
  ctx.strokeStyle = '#33406d';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(hx - dx * 3, hy - dy * 3);
  ctx.lineTo(hx + dx * 4, hy + dy * 4);
  ctx.stroke();
  fillEllipse(ctx, hx - dx * 4, hy - dy * 4, 2, 2, GOLD);
  ctx.restore();
}

function drawTrail(ctx: Ctx, cx: number, cy: number, from: number, to: number, r: number) {
  ctx.save();
  ctx.lineCap = 'round';
  const ccw = to < from;
  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = `rgba(${170 + i * 20},${230 + i * 6},255,${0.14 + i * 0.14})`;
    ctx.lineWidth = 12 - i * 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r - i * 2, from, to, ccw);
    ctx.stroke();
  }
  ctx.restore();
}

function drawScabbard(ctx: Ctx, x0: number, y0: number, x1: number, y1: number) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.strokeStyle = '#2b3460';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  fillEllipse(ctx, x1, y1, 2.4, 2.4, GOLD);
  ctx.restore();
}

/**
 * A wide hanging hanfu sleeve: fabric drapes below the arm and flares at the
 * cuff, so the arm reads as flowing silk rather than a stick.
 */
function drawSleeve(
  ctx: Ctx,
  sx: number,
  sy: number,
  hx: number,
  hy: number,
  pal: HumanPalette,
  width = 5,
) {
  const dx = hx - sx;
  const dy = hy - sy;
  const l = Math.hypot(dx, dy) || 1;
  const mx = (sx + hx) / 2;
  const my = (sy + hy) / 2;
  const sag = 5 + width * 0.5;
  const nx = -dy / l;
  const ny = dx / l;
  const w = width + 4;

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(sx + nx * width, sy + ny * width);
  ctx.quadraticCurveTo(mx + nx * w + sag * 0.4, my + ny * w + sag, hx + nx * (w - 1), hy + ny * (w - 1));
  ctx.quadraticCurveTo(hx - dx * 0.1, hy - dy * 0.1, hx - nx * (w - 1), hy - ny * (w - 1));
  ctx.quadraticCurveTo(mx - nx * w + sag * 0.4, my - ny * w + sag, sx - nx * width, sy - ny * width);
  ctx.closePath();
  ctx.fillStyle = robeGradient(ctx, pal, sy - 4, hy + w);
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 0.9;
  ctx.stroke();
  // sleeve hem trim + gold edge
  ctx.strokeStyle = pal.trim;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(hx + nx * (w - 2), hy + ny * (w - 2));
  ctx.quadraticCurveTo(hx - dx * 0.12, hy - dy * 0.12, hx - nx * (w - 2), hy - ny * (w - 2));
  ctx.stroke();
  ctx.strokeStyle = rgba('#ffffff', 0.5);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(sx + nx * width * 0.4, sy + ny * width * 0.4);
  ctx.quadraticCurveTo(mx + nx * w * 0.5, my + ny * w * 0.5, hx + nx * (w - 3), hy + ny * (w - 3));
  ctx.stroke();
  ctx.restore();
  // hand peeking out of the cuff
  fillEllipse(ctx, hx + dx * 0.06, hy + dy * 0.06, 3, 3, pal.skin);
}

/** Cross-collar hanfu bodice with gold piping and a jade belt. */
function drawBodice(ctx: Ctx, cx: number, sy: number, wy: number, pal: HumanPalette, sway: number) {
  const hw = 7.5;
  ctx.beginPath();
  ctx.moveTo(cx - hw, sy);
  ctx.lineTo(cx + hw, sy);
  ctx.quadraticCurveTo(cx + hw + 1.5, (sy + wy) / 2, cx + hw, wy);
  ctx.lineTo(cx - hw, wy);
  ctx.quadraticCurveTo(cx - hw - 1.5, (sy + wy) / 2, cx - hw, sy);
  ctx.closePath();
  ctx.fillStyle = robeGradient(ctx, pal, sy, wy);
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1;
  ctx.stroke();

  // pale inner collar in a V
  ctx.fillStyle = rgba('#ffffff', 0.75);
  ctx.beginPath();
  ctx.moveTo(cx - 5.5, sy);
  ctx.lineTo(cx, sy + 11);
  ctx.lineTo(cx + 5.5, sy);
  ctx.closePath();
  ctx.fill();
  // crossed lapels with gold piping
  ctx.strokeStyle = pal.trim;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(cx - 7, sy);
  ctx.lineTo(cx, sy + 13);
  ctx.moveTo(cx + 7, sy);
  ctx.lineTo(cx, sy + 13);
  ctx.stroke();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 7.6, sy);
  ctx.lineTo(cx + 1, sy + 13.5);
  ctx.moveTo(cx + 7.6, sy);
  ctx.lineTo(cx - 1, sy + 13.5);
  ctx.stroke();
  // belt
  ctx.fillStyle = pal.sash;
  ctx.fillRect(cx - 8.5, wy - 3, 17, 4.5);
  ctx.fillStyle = rgba('#ffffff', 0.35);
  ctx.fillRect(cx - 8.5, wy - 3, 17, 1.2);
  fillEllipse(ctx, cx + sway * 0.2, wy - 0.5, 2.4, 2, pal.accessory);
}

/** Flowing skirt: back layer, front layer with pleats, gold hem, side ribbons. */
function drawSkirt(ctx: Ctx, cx: number, fy: number, pal: HumanPalette, pose: HumanPose) {
  const wy = fy - WAIST_Y + pose.bob;
  const hem = fy - HEM_Y + pose.bob * 0.4;
  const sway = pose.step * 3;
  const hw = 13;

  // back layer, slightly wider and darker
  ctx.beginPath();
  ctx.moveTo(cx - 6, wy);
  ctx.quadraticCurveTo(cx - hw - 3, (wy + hem) / 2, cx - hw - 4 + sway * 1.3, hem + 2);
  ctx.quadraticCurveTo(cx + sway * 0.5, hem + 6, cx + hw + 4 + sway * 1.3, hem + 2);
  ctx.quadraticCurveTo(cx + hw + 3, (wy + hem) / 2, cx + 6, wy);
  ctx.closePath();
  ctx.fillStyle = shade(pal.robeShade, -0.12);
  ctx.fill();

  // front layer
  ctx.beginPath();
  ctx.moveTo(cx - 7, wy);
  ctx.quadraticCurveTo(cx - hw, (wy + hem) / 2, cx - hw - 1 + sway, hem);
  ctx.quadraticCurveTo(cx + sway * 0.4, hem + 3.5, cx + hw + 1 + sway, hem);
  ctx.quadraticCurveTo(cx + hw, (wy + hem) / 2, cx + 7, wy);
  ctx.closePath();
  ctx.fillStyle = robeGradient(ctx, pal, wy, hem + 4);
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1;
  ctx.stroke();

  // pleats
  ctx.strokeStyle = rgba(pal.robeShade.startsWith('#') ? pal.robeShade : '#8899bb', 0.5);
  ctx.lineWidth = 1;
  for (const t of [-0.5, 0, 0.5]) {
    ctx.beginPath();
    ctx.moveTo(cx + t * 6, wy + 3);
    ctx.quadraticCurveTo(cx + t * 9 + sway * 0.5, (wy + hem) / 2, cx + t * 13 + sway, hem - 1);
    ctx.stroke();
  }
  // gold hem with a soft double line
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(cx + hw + 1 + sway, hem - 1);
  ctx.quadraticCurveTo(cx + sway * 0.4, hem + 3, cx - hw - 1 + sway, hem - 1);
  ctx.stroke();
  ctx.strokeStyle = pal.trim;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx + hw + 0.5 + sway, hem - 4);
  ctx.quadraticCurveTo(cx + sway * 0.4, hem - 0.5, cx - hw - 0.5 + sway, hem - 4);
  ctx.stroke();
  // lit edge down the silhouette
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cx - 7, wy + 4);
  ctx.quadraticCurveTo(cx - hw, (wy + hem) / 2, cx - hw - 1 + sway, hem - 4);
  ctx.stroke();
}

function drawFace(ctx: Ctx, x: number, y: number, pal: HumanPalette, pose: HumanPose, back: boolean) {
  if (back) {
    fillEllipse(ctx, x, y, HEAD_R + 0.6, HEAD_R + 0.6, hairFill(ctx, pal));
    ctx.strokeStyle = rgba('#ffffff', 0.16);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x - 3, y - 3, 6, Math.PI * 1.05, Math.PI * 1.65);
    ctx.stroke();
    return;
  }
  // face
  fillEllipse(ctx, x, y + 1, HEAD_R - 0.5, HEAD_R, pal.skin);
  ctx.fillStyle = shade(pal.skin, -0.14);
  ctx.beginPath();
  ctx.ellipse(x + HEAD_R - 3.2, y + 2, 3.4, 4.6, 0, Math.PI * 0.6, Math.PI * 1.5);
  ctx.fill();

  if (pose.eyesClosed) {
    ctx.strokeStyle = '#3a2a2f';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x - 5.6, y + 2.6);
    ctx.quadraticCurveTo(x - 4.2, y + 4, x - 2.6, y + 2.6);
    ctx.moveTo(x + 2.6, y + 2.6);
    ctx.quadraticCurveTo(x + 4.2, y + 4, x + 5.6, y + 2.6);
    ctx.stroke();
  } else {
    // anime eyes: lash line, iris, catch light
    for (const sx of [-1, 1]) {
      const ex = x + sx * 4.3;
      const ey = y + 3;
      ctx.fillStyle = '#2a3560';
      fillEllipse(ctx, ex, ey, 2.3, 2.9, '#2a3560');
      fillEllipse(ctx, ex, ey + 0.6, 1.5, 2, shade(pal.trim, -0.25));
      fillEllipse(ctx, ex, ey + 1.2, 0.9, 1.1, '#101a3a');
      fillEllipse(ctx, ex - 0.7, ey - 1.1, 0.9, 1.1, '#ffffff');
      fillEllipse(ctx, ex + 0.8, ey + 1.4, 0.5, 0.5, rgba('#ffffff', 0.75));
      ctx.strokeStyle = '#22284a';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(ex - 2.6, ey - 2);
      ctx.quadraticCurveTo(ex, ey - 3.4, ex + 2.6, ey - 1.6);
      ctx.stroke();
      // brow
      ctx.strokeStyle = rgba(pal.hair, 0.75);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ex - 2.4, ey - 5);
      ctx.quadraticCurveTo(ex + sx * 1.2, ey - 6.2, ex + sx * 3, ey - 5.4);
      ctx.stroke();
    }
  }
  // blush, mouth
  fillEllipse(ctx, x - 6.6, y + 5.6, 2.2, 1.3, 'rgba(255,140,155,0.32)');
  fillEllipse(ctx, x + 6.6, y + 5.6, 2.2, 1.3, 'rgba(255,140,155,0.32)');
  ctx.strokeStyle = '#c0566a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 1.4, y + 6.6);
  ctx.quadraticCurveTo(x, y + 7.6, x + 1.4, y + 6.6);
  ctx.stroke();
  if (pal.beard) {
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.moveTo(x - 6, y + 7);
    ctx.quadraticCurveTo(x, y + 24, x + 6, y + 7);
    ctx.quadraticCurveTo(x, y + 11, x - 6, y + 7);
    ctx.fill();
  }
}

function drawHairFront(ctx: Ctx, x: number, y: number, pal: HumanPalette, view: 'front' | 'back' | 'side') {
  const off = view === 'side' ? -3 : 0;
  const r = HEAD_R + 0.7;
  // bangs: fringe arcs + side locks framing the face
  if (view !== 'back') {
    ctx.fillStyle = hairFill(ctx, pal);
    ctx.beginPath();
    ctx.arc(x + off, y, r, Math.PI * 0.98, Math.PI * 2.06);
    ctx.lineTo(x + r, y + 2);
    for (let i = 0; i <= 3; i++) {
      const bx = x + off + r - (i * (2 * r)) / 3;
      // Fringe tips stop above the eyes: the eyes sit at y + 3, so anything
      // lower would hide the face behind a curtain of hair.
      ctx.quadraticCurveTo(bx - 1, y + 1 - (i % 2) * 2, bx - 4, y - 4);
    }
    ctx.closePath();
    ctx.fill();
    // sheen across the crown
    ctx.strokeStyle = rgba('#c9d8ff', 0.55);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(x + off - 1, y - 1, r - 2, Math.PI * 1.1, Math.PI * 1.75);
    ctx.stroke();
    // long side locks
    for (const sx of [-1, 1]) {
      ctx.fillStyle = hairFill(ctx, pal);
      ctx.beginPath();
      ctx.moveTo(x + off + sx * (r - 1), y - 2);
      ctx.quadraticCurveTo(x + off + sx * (r + 3), y + 9, x + off + sx * (r + 1), y + 16);
      ctx.lineTo(x + off + sx * (r - 4), y + 12);
      ctx.quadraticCurveTo(x + off + sx * (r - 3), y + 2, x + off + sx * (r - 3), y - 1);
      ctx.closePath();
      ctx.fill();
    }
  }

  // headdress per style
  switch (pal.hairStyle) {
    case 'bun': {
      fillEllipse(ctx, x + off, y - r - 4, 5, 4.4, hairFill(ctx, pal));
      // crossed hairpin with an ice-flower ornament
      ctx.strokeStyle = '#e6f4ff';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x + off - 9, y - r - 4);
      ctx.lineTo(x + off + 9, y - r - 6);
      ctx.stroke();
      ctx.strokeStyle = pal.accessory;
      ctx.beginPath();
      ctx.moveTo(x + off + 4, y - r - 8);
      ctx.lineTo(x + off + 12, y - r - 12);
      ctx.stroke();
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        fillEllipse(ctx, x + off + 12 + Math.cos(a) * 2.4, y - r - 12 + Math.sin(a) * 2.4, 1.7, 1.7, pal.accessory);
      }
      fillEllipse(ctx, x + off + 12, y - r - 12, 1.2, 1.2, '#ffffff');
      break;
    }
    case 'topknot':
    case 'elder':
      fillEllipse(ctx, x + off, y - r - 3, 4.4, 4.4, hairFill(ctx, pal));
      ctx.fillStyle = pal.accessory;
      ctx.fillRect(x + off - 4.4, y - r - 2.4, 8.8, 2.2);
      break;
    case 'hat':
      fillEllipse(ctx, x, y - 6, 18, 5.5, '#3b2b1d');
      fillEllipse(ctx, x, y - 10, 9.5, 6, '#4a3726');
      ctx.fillStyle = pal.accessory;
      ctx.fillRect(x - 9, y - 8.5, 18, 1.8);
      break;
    case 'flowing':
      fillEllipse(ctx, x + off, y - r - 3, 5, 3.6, hairFill(ctx, pal));
      break;
  }
}

/** Long hair falling down the back (front view: behind the body). */
function drawLongHair(ctx: Ctx, cx: number, y: number, pal: HumanPalette, sway: number, swayY: number) {
  const r = HEAD_R;
  const hemY = y + 46 + swayY;
  ctx.beginPath();
  ctx.moveTo(cx - r - 1, y);
  ctx.quadraticCurveTo(cx - r - 6, y + 26, cx - r - 4 + sway * 1.6, hemY);
  ctx.quadraticCurveTo(cx + sway, hemY + 5, cx + r + 4 + sway * 1.6, hemY);
  ctx.quadraticCurveTo(cx + r + 6, y + 26, cx + r + 1, y);
  ctx.closePath();
  ctx.fillStyle = hairFill(ctx, pal);
  ctx.fill();
  ctx.strokeStyle = rgba(pal.hair, 0.9);
  ctx.lineWidth = 0.8;
  ctx.stroke();
  hairStrands(ctx, cx, y + 12, hemY - 4, r + 2, sway * 0.2);
}

function drawFaceBack(ctx: Ctx, cx: number, fy: number, pal: HumanPalette, pose: HumanPose, sway: number) {
  const headY = fy - HEAD_Y + pose.bob;
  // hair mass behind the shoulders
  drawLongHair(ctx, cx, headY, pal, sway, 0);
  drawFace(ctx, cx, headY, pal, pose, true);
  drawHairFront(ctx, cx, headY, pal, 'back');
}

// ---- views ---------------------------------------------------------------

function drawFrontOrBack(ctx: Ctx, cx: number, fy: number, view: 'down' | 'up', pal: HumanPalette, pose: HumanPose) {
  const back = view === 'up';
  const headY = fy - HEAD_Y + pose.bob;
  const sy = fy - SHOULDER_Y + pose.bob;
  const wy = fy - WAIST_Y + pose.bob;
  const sway = pose.step * 2.4;
  const swordAng = pose.sword !== null ? screenAngle(view, pose.sword) : null;
  const shoulderR = { x: cx + 7, y: sy + 3 };
  const hand =
    swordAng !== null
      ? {
          x: shoulderR.x + Math.cos(swordAng) * (14 + pose.reach),
          y: shoulderR.y + Math.sin(swordAng) * (14 + pose.reach),
        }
      : null;

  // ---- behind the body -------------------------------------------------
  if (!back && pal.longHair) drawLongHair(ctx, cx, headY, pal, sway * 0.6, 4);
  if (pal.sword && pose.sword === null && !back) drawScabbard(ctx, cx - 13, wy - 4, cx - 3, fy - 14);
  if (back && hand && swordAng !== null) {
    if (pose.trailFrom !== null) drawTrail(ctx, shoulderR.x, shoulderR.y, screenAngle(view, pose.trailFrom), swordAng, 34);
    drawBlade(ctx, hand.x, hand.y, swordAng, 30, pal.aura);
  }
  // back sleeve peeking out
  drawSleeve(ctx, cx - 1, sy + 3, cx - 8 - pose.arm * 5, sy + 16 + pose.arm * 3, { ...pal, robe: shade(pal.robe, -0.12) }, 4.5);

  // ---- legs / shoes ----------------------------------------------------
  const lift = Math.max(0, pose.step) * 3;
  fillEllipse(ctx, cx - 5.5, fy - 2 - lift, 4, 2.4, '#262a45');
  fillEllipse(ctx, cx + 5.5, fy - 2 - Math.max(0, -pose.step) * 3, 4, 2.4, '#2b3050');

  // ---- garments --------------------------------------------------------
  drawSkirt(ctx, cx, fy, pal, pose);
  drawBodice(ctx, cx, sy, wy, pal, sway);

  if (back) {
    // sash knot with two ribbon tails
    ctx.strokeStyle = pal.sash;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx + 3, wy - 1);
    ctx.quadraticCurveTo(cx + 8 + sway * 2, wy + 8, cx + 6 + sway * 3, wy + 18);
    ctx.moveTo(cx + 1, wy - 1);
    ctx.quadraticCurveTo(cx + 4 + sway, wy + 8, cx + 2 + sway * 2, wy + 15);
    ctx.stroke();
  } else {
    // two ribbon tails at the front
    ctx.strokeStyle = pal.sash;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx + 5, wy + 2);
    ctx.quadraticCurveTo(cx + 9 + sway * 2, wy + 10, cx + 7 + sway * 3, wy + 20);
    ctx.moveTo(cx + 3, wy + 2);
    ctx.quadraticCurveTo(cx + 5 + sway, wy + 10, cx + 3 + sway * 2, wy + 17);
    ctx.stroke();
  }

  // ---- arms ------------------------------------------------------------
  if (pose.cast > 0) {
    const lift = pose.cast * 9;
    drawSleeve(ctx, cx - 7, sy + 3, cx - 4, sy + 13 - lift, pal, 5);
    drawSleeve(ctx, cx + 7, sy + 3, cx + 4, sy + 13 - lift, pal, 5);
    drawOrb(ctx, cx, sy + 11 - lift, pose.cast, pal);
  } else if (hand && swordAng !== null) {
    if (pose.trailFrom !== null) drawTrail(ctx, shoulderR.x, shoulderR.y, screenAngle(view, pose.trailFrom), swordAng, 34);
    drawSleeve(ctx, shoulderR.x, shoulderR.y, hand.x, hand.y, pal, 5);
  } else {
    const armX = cx + 12 + pose.arm * 3;
    drawSleeve(ctx, shoulderR.x, shoulderR.y, armX, sy + 15 - pose.arm * 3, pal, 5);
    drawSleeve(ctx, cx - 7, sy + 3, cx - 12 - pose.arm * 3, sy + 15 + pose.arm * 3, pal, 4.5);
  }

  // ---- head ------------------------------------------------------------
  if (back) {
    drawFaceBack(ctx, cx, fy, pal, pose, sway * 0.6);
  } else {
    ctx.fillStyle = shade(pal.skin, -0.12);
    ctx.fillRect(cx - 2.5, headY + 7, 5, 6);
    drawFace(ctx, cx, headY, pal, pose, false);
    drawHairFront(ctx, cx, headY, pal, 'front');
    if (pal.longHair) {
      // front locks over the shoulders
      ctx.fillStyle = hairFill(ctx, pal);
      ctx.beginPath();
      ctx.moveTo(cx - HEAD_R - 1, headY + 2);
      ctx.quadraticCurveTo(cx - HEAD_R - 6, headY + 18, cx - HEAD_R - 4 + sway, headY + 34);
      ctx.lineTo(cx - HEAD_R + 3 + sway, headY + 30);
      ctx.quadraticCurveTo(cx - HEAD_R + 4, headY + 14, cx - HEAD_R + 3, headY + 4);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx + HEAD_R + 1, headY + 2);
      ctx.quadraticCurveTo(cx + HEAD_R + 6, headY + 18, cx + HEAD_R + 4 + sway, headY + 34);
      ctx.lineTo(cx + HEAD_R - 3 + sway, headY + 30);
      ctx.quadraticCurveTo(cx + HEAD_R - 4, headY + 14, cx + HEAD_R - 3, headY + 4);
      ctx.closePath();
      ctx.fill();
      hairStrands(ctx, cx, headY + 6, headY + 30, HEAD_R - 1, sway * 0.2);
    }
  }

  if (!back && hand && swordAng !== null) {
    if (pose.trailFrom !== null) drawTrail(ctx, shoulderR.x, shoulderR.y, screenAngle(view, pose.trailFrom), swordAng, 34);
    drawBlade(ctx, hand.x, hand.y, swordAng, 30, pal.aura);
  }
}

function drawOrb(ctx: Ctx, x: number, y: number, k: number, pal: HumanPalette) {
  const r = 5 + k * 8;
  ctx.fillStyle = radial(ctx, x, y, r, [
    [0, 'rgba(255,255,255,0.95)'],
    [0.4, rgba(pal.aura, 0.7)],
    [1, rgba(pal.aura, 0)],
  ]);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + k * 6;
    fillEllipse(ctx, x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8, 1.3, 1.3, rgba('#ffffff', 0.8));
  }
}

function drawSide(ctx: Ctx, cx: number, fy: number, pal: HumanPalette, pose: HumanPose) {
  const headY = fy - HEAD_Y + pose.bob;
  const sy = fy - SHOULDER_Y + pose.bob;
  const wy = fy - WAIST_Y + pose.bob;
  const hem = fy - HEM_Y;
  const st = pose.step;
  const shoulder = { x: cx + 2, y: sy + 3 };
  const hand =
    pose.sword !== null
      ? {
          x: shoulder.x + Math.cos(pose.sword) * (15 + pose.reach),
          y: shoulder.y + Math.sin(pose.sword) * (15 + pose.reach),
        }
      : null;

  // ---- behind the body -------------------------------------------------
  if (pal.longHair) {
    const sway = st * 4;
    ctx.beginPath();
    ctx.moveTo(cx - 2, headY);
    ctx.quadraticCurveTo(cx - 12, headY + 26, cx - 9 + sway, headY + 44);
    ctx.quadraticCurveTo(cx + sway * 0.5, headY + 48, cx + 8 + sway, headY + 42);
    ctx.quadraticCurveTo(cx + 9, headY + 20, cx + 7, headY);
    ctx.closePath();
    ctx.fillStyle = hairFill(ctx, pal);
    ctx.fill();
    hairStrands(ctx, cx - 1, headY + 14, headY + 40, 8, sway * 0.2);
  }
  if (pal.sword && pose.sword === null) drawScabbard(ctx, cx - 10, wy - 6, cx + 6, fy - 12);
  drawSleeve(ctx, cx - 2, sy + 3, cx - 8 - pose.arm * 4, sy + 17, { ...pal, robe: shade(pal.robe, -0.14) }, 4.5);

  // ---- legs ------------------------------------------------------------
  fillEllipse(ctx, cx - 1 + st * 6, fy - 2 - Math.max(0, st) * 3, 4.5, 2.4, '#262a45');
  fillEllipse(ctx, cx + 3 - st * 6, fy - 2 - Math.max(0, -st) * 3, 4.5, 2.4, '#2b3050');

  // ---- garments (profile) ---------------------------------------------
  const sway = st * 3;
  ctx.beginPath();
  ctx.moveTo(cx - 7, wy);
  ctx.quadraticCurveTo(cx - 11, (wy + hem) / 2, cx - 13 + sway, hem);
  ctx.quadraticCurveTo(cx + 1, hem + 4, cx + 12 + sway, hem - 1);
  ctx.quadraticCurveTo(cx + 9, (wy + hem) / 2, cx + 7, wy);
  ctx.closePath();
  ctx.fillStyle = robeGradient(ctx, pal, wy, hem + 4);
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(cx - 13 + sway, hem - 1);
  ctx.quadraticCurveTo(cx + 1, hem + 3, cx + 12 + sway, hem - 2);
  ctx.stroke();
  ctx.strokeStyle = pal.trim;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 11 + sway, hem - 4);
  ctx.quadraticCurveTo(cx + 1, hem, cx + 11 + sway, hem - 5);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - 7, sy);
  ctx.lineTo(cx + 7, sy);
  ctx.quadraticCurveTo(cx + 8, (sy + wy) / 2, cx + 7, wy);
  ctx.lineTo(cx - 7, wy);
  ctx.quadraticCurveTo(cx - 8, (sy + wy) / 2, cx - 7, sy);
  ctx.closePath();
  ctx.fillStyle = robeGradient(ctx, pal, sy, wy);
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
  ctx.fillStyle = pal.sash;
  ctx.fillRect(cx - 8, wy - 3, 16, 4.5);
  fillEllipse(ctx, cx + 1, wy - 0.5, 2, 1.8, pal.accessory);

  // ---- head profile ----------------------------------------------------
  ctx.fillStyle = shade(pal.skin, -0.12);
  ctx.fillRect(cx - 1, headY + 7, 6, 5.5);
  fillEllipse(ctx, cx + 1.5, headY + 1, HEAD_R - 0.5, HEAD_R, pal.skin);
  ctx.fillStyle = hairFill(ctx, pal);
  ctx.beginPath();
  ctx.arc(cx, headY, HEAD_R + 1, Math.PI * 0.5, Math.PI * 1.9);
  ctx.quadraticCurveTo(cx + HEAD_R + 3, headY - 2, cx + HEAD_R + 1, headY + 3);
  ctx.quadraticCurveTo(cx + 4, headY - 3, cx + 2, headY + 5);
  ctx.quadraticCurveTo(cx - 4, headY + 8, cx - 5, headY + 14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rgba('#c9d8ff', 0.5);
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.arc(cx - 2, headY - 1, HEAD_R - 1.5, Math.PI * 1.0, Math.PI * 1.6);
  ctx.stroke();
  if (pal.hairStyle === 'bun' || pal.hairStyle === 'flowing') fillEllipse(ctx, cx - 3, headY - HEAD_R - 3, 4.6, 4, hairFill(ctx, pal));
  else if (pal.hairStyle !== 'hat') fillEllipse(ctx, cx - 2, headY - HEAD_R - 3, 4, 4, hairFill(ctx, pal));
  if (pal.hairStyle === 'hat') {
    fillEllipse(ctx, cx, headY - 6, 17, 5, '#3b2b1d');
    fillEllipse(ctx, cx, headY - 10, 9, 5.5, '#4a3726');
  }
  // one eye + brow
  if (pose.eyesClosed) {
    ctx.strokeStyle = '#3a2a2f';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx + 5, headY + 3);
    ctx.quadraticCurveTo(cx + 7, headY + 4.4, cx + 9, headY + 3);
    ctx.stroke();
  } else {
    fillEllipse(ctx, cx + 7, headY + 3.4, 2, 2.6, '#2a3560');
    fillEllipse(ctx, cx + 6.4, headY + 2.4, 0.8, 1, '#ffffff');
    ctx.strokeStyle = '#22284a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx + 5, headY - 1.6);
    ctx.quadraticCurveTo(cx + 7.5, headY - 2.6, cx + 9.5, headY - 1.4);
    ctx.stroke();
  }
  fillEllipse(ctx, cx + 7.5, headY + 6.6, 1.8, 1.2, 'rgba(255,140,155,0.32)');
  ctx.strokeStyle = '#c0566a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx + 8, headY + 6.4);
  ctx.quadraticCurveTo(cx + 9, headY + 7.4, cx + 9.6, headY + 6.4);
  ctx.stroke();
  if (pal.beard) {
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.moveTo(cx + 5, headY + 7);
    ctx.quadraticCurveTo(cx + 9, headY + 22, cx + 13, headY + 7);
    ctx.fill();
  }

  // ---- front arm and sword --------------------------------------------
  if (pose.cast > 0) {
    const lift = pose.cast * 9;
    drawSleeve(ctx, shoulder.x, shoulder.y, shoulder.x + 10, shoulder.y + 5 - lift, pal, 5);
    drawOrb(ctx, shoulder.x + 14, shoulder.y + 3 - lift, pose.cast, pal);
  } else if (hand && pose.sword !== null) {
    if (pose.trailFrom !== null) drawTrail(ctx, shoulder.x, shoulder.y, pose.trailFrom, pose.sword, 34);
    drawSleeve(ctx, shoulder.x, shoulder.y, hand.x, hand.y, pal, 5);
    drawBlade(ctx, hand.x, hand.y, pose.sword, 30, pal.aura);
  } else {
    const armX = cx + 12 + pose.arm * 3;
    drawSleeve(ctx, shoulder.x, shoulder.y, armX, sy + 15 - pose.arm * 3, pal, 5);
  }
}

function drawSitting(ctx: Ctx, cx: number, fy: number, pal: HumanPalette, pose: HumanPose) {
  const headY = fy - 44 + pose.bob;
  const sy = fy - 30 + pose.bob;
  if (pal.longHair) drawLongHair(ctx, cx, headY, pal, 0, -6);
  // crossed legs under a wide skirt
  ctx.beginPath();
  ctx.ellipse(cx, fy - 8, 20, 7.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = robeGradient(ctx, pal, fy - 16, fy);
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(cx, fy - 7, 19, 6.5, 0, 0.1, Math.PI - 0.1);
  ctx.stroke();
  // torso
  drawBodice(ctx, cx, sy, fy - 12, pal, 0);
  // hands folded in the lap
  drawSleeve(ctx, cx - 7, sy + 3, cx - 3, sy + 15, pal, 4.5);
  drawSleeve(ctx, cx + 7, sy + 3, cx + 3, sy + 15, pal, 4.5);
  fillEllipse(ctx, cx, sy + 16, 4, 3, pal.skin);
  ctx.fillStyle = shade(pal.skin, -0.12);
  ctx.fillRect(cx - 2.5, headY + 7, 5, 6);
  drawFace(ctx, cx, headY, pal, { ...pose, eyesClosed: true }, false);
  drawHairFront(ctx, cx, headY, pal, 'front');
}

export function drawHuman(ctx: Ctx, cx: number, fy: number, view: ViewDir, pal: HumanPalette, pose: HumanPose) {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (pose.mode === 'sit') {
    drawSitting(ctx, cx, fy, pal, pose);
  } else if (pose.mode === 'lie') {
    const ang = (-Math.PI / 2) * pose.fall;
    ctx.translate(cx + 26 * pose.fall, fy - 12 * pose.fall);
    ctx.rotate(ang);
    drawSide(ctx, 0, 0, pal, { ...pose, eyesClosed: pose.fall > 0.5 });
  } else {
    if (pose.tilt) {
      ctx.translate(cx, fy);
      ctx.rotate(pose.tilt);
      ctx.translate(-cx, -fy);
    }
    if (view === 'side') drawSide(ctx, cx, fy, pal, pose);
    else drawFrontOrBack(ctx, cx, fy, view, pal, pose);
  }
  ctx.restore();
}

/** Bust portrait used for the HUD avatar when no portrait image is provided. */
export function drawPortrait(ctx: Ctx, size: number, pal: HumanPalette) {
  ctx.save();
  ctx.fillStyle = radial(ctx, size / 2, size / 2, size / 1.4, [
    [0, '#41608f'],
    [1, '#131a32'],
  ]);
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    fillEllipse(ctx, size * 0.5 + Math.cos(a) * size * 0.44, size * 0.5 + Math.sin(a) * size * 0.44, size * 0.04, size * 0.04, 'rgba(255,200,225,0.35)');
  }
  // Frame the bust: the head sits at -HEAD_Y from the feet, so the feet are
  // pushed well below the box and the shoulders land near the bottom edge.
  const k = size / 44;
  ctx.translate(size / 2, size * 0.42 + HEAD_Y * k);
  ctx.scale(k, k);
  drawHuman(ctx, 0, 0, 'down', pal, BASE_POSE);
  ctx.restore();
}
