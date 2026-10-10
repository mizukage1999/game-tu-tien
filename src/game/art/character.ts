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
    robe: '#f6f9ff',
    robeShade: '#b7c9e8',
    trim: '#4f9dff',
    sash: '#3566d6',
    skin: '#ffe3d3',
    hair: '#1c1a2c',
    accessory: '#9fe8ff',
    hairStyle: 'bun',
    longHair: true,
    beard: false,
    sword: true,
    aura: '#8fe3ff',
  },
  player_male: {
    robe: '#243656',
    robeShade: '#152033',
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

const OUTLINE = 'rgba(25,30,55,0.55)';

/** Converts a forward-relative sword angle to a screen angle for the given view. */
function screenAngle(view: ViewDir, a: number) {
  if (view === 'side') return a;
  if (view === 'down') return a + Math.PI / 2;
  return a - Math.PI / 2;
}

function drawBlade(ctx: Ctx, hx: number, hy: number, ang: number, len: number) {
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);
  const tx = hx + dx * len;
  const ty = hy + dy * len;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(140,220,255,0.35)';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(hx + dx * 6, hy + dy * 6);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  ctx.strokeStyle = linear(ctx, hx, hy, tx, ty, [
    [0, '#c8d6e6'],
    [1, '#ffffff'],
  ]);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(hx + dx * 5, hy + dy * 5);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  // guard + hilt
  ctx.strokeStyle = '#d9b45a';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(hx + dx * 5 - dy * 4, hy + dy * 5 + dx * 4);
  ctx.lineTo(hx + dx * 5 + dy * 4, hy + dy * 5 - dx * 4);
  ctx.stroke();
  ctx.strokeStyle = '#3a4a7a';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(hx - dx * 3, hy - dy * 3);
  ctx.lineTo(hx + dx * 4, hy + dy * 4);
  ctx.stroke();
  ctx.restore();
}

function drawTrail(ctx: Ctx, cx: number, cy: number, from: number, to: number, r: number) {
  ctx.save();
  ctx.lineCap = 'round';
  const ccw = to < from;
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = `rgba(${170 + i * 30},${230 + i * 8},255,${0.18 + i * 0.16})`;
    ctx.lineWidth = 10 - i * 3.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r - i * 2, from, to, ccw);
    ctx.stroke();
  }
  ctx.restore();
}

function drawScabbard(ctx: Ctx, x0: number, y0: number, x1: number, y1: number) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#2f3d6b';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.strokeStyle = '#d9b45a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.fillStyle = '#d9b45a';
  ctx.beginPath();
  ctx.arc(x1, y1, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function robeGradient(ctx: Ctx, pal: HumanPalette, top: number, bottom: number) {
  return linear(ctx, 0, top, 0, bottom, [
    [0, pal.robe],
    [0.65, shade(pal.robe.startsWith('#') ? pal.robe : '#ffffff', -0.05)],
    [1, pal.robeShade],
  ]);
}

function drawHeadFront(ctx: Ctx, x: number, y: number, pal: HumanPalette, pose: HumanPose, back: boolean) {
  const r = 13;
  // neck
  ctx.fillStyle = shade(pal.skin, -0.12);
  ctx.fillRect(x - 3, y + 9, 6, 6);
  if (pal.hairStyle === 'hat') {
    // wide merchant hat drawn later
  }
  if (back) {
    fillEllipse(ctx, x, y, r + 1, r + 1, pal.hair);
    ctx.strokeStyle = rgba('#ffffff', 0.18);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x - 3, y - 3, 8, Math.PI * 1.1, Math.PI * 1.6);
    ctx.stroke();
  } else {
    fillEllipse(ctx, x, y + 1, r - 0.5, r, pal.skin);
    // hair cap and bangs
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.arc(x, y, r + 1, Math.PI * 0.95, Math.PI * 2.05);
    ctx.lineTo(x + r + 1, y + 3);
    for (let i = 0; i <= 4; i++) {
      const bx = x + r - (i * (2 * r)) / 4;
      ctx.quadraticCurveTo(bx + 1, y + 6 - (i % 2) * 3, bx - 3, y - 1);
    }
    ctx.closePath();
    ctx.fill();
    if (pal.hairStyle === 'bun' || pal.hairStyle === 'flowing') {
      // side locks framing the face
      ctx.beginPath();
      ctx.moveTo(x - r, y - 2);
      ctx.quadraticCurveTo(x - r - 3, y + 10, x - r + 1, y + 16);
      ctx.lineTo(x - r + 4, y + 4);
      ctx.closePath();
      ctx.moveTo(x + r, y - 2);
      ctx.quadraticCurveTo(x + r + 3, y + 10, x + r - 1, y + 16);
      ctx.lineTo(x + r - 4, y + 4);
      ctx.closePath();
      ctx.fill();
    }
    // eyes
    if (pose.eyesClosed) {
      ctx.strokeStyle = '#3a2a2a';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(x - 7, y + 4);
      ctx.quadraticCurveTo(x - 5, y + 6, x - 3, y + 4);
      ctx.moveTo(x + 3, y + 4);
      ctx.quadraticCurveTo(x + 5, y + 6, x + 7, y + 4);
      ctx.stroke();
    } else {
      const eye = pal.hairStyle === 'elder' ? '#3a3330' : '#27304f';
      fillEllipse(ctx, x - 5, y + 4, 2, 2.8, eye);
      fillEllipse(ctx, x + 5, y + 4, 2, 2.8, eye);
      fillEllipse(ctx, x - 5.6, y + 3, 0.8, 0.9, '#ffffff');
      fillEllipse(ctx, x + 4.4, y + 3, 0.8, 0.9, '#ffffff');
    }
    fillEllipse(ctx, x - 8, y + 8, 2.4, 1.4, 'rgba(255,120,140,0.35)');
    fillEllipse(ctx, x + 8, y + 8, 2.4, 1.4, 'rgba(255,120,140,0.35)');
    ctx.fillStyle = '#c0566a';
    ctx.fillRect(x - 1, y + 9, 2, 1);
    if (pal.beard) {
      ctx.fillStyle = pal.hair;
      ctx.beginPath();
      ctx.moveTo(x - 6, y + 8);
      ctx.quadraticCurveTo(x, y + 26, x + 6, y + 8);
      ctx.quadraticCurveTo(x, y + 12, x - 6, y + 8);
      ctx.fill();
    }
  }
  drawHairTop(ctx, x, y, pal, back ? 'back' : 'front');
}

function drawHairTop(ctx: Ctx, x: number, y: number, pal: HumanPalette, view: 'front' | 'back' | 'side') {
  const off = view === 'side' ? -5 : 0;
  switch (pal.hairStyle) {
    case 'bun':
      fillEllipse(ctx, x + off, y - 14, 7, 6, pal.hair);
      fillEllipse(ctx, x + off - 2, y - 16, 2.5, 1.5, rgba('#ffffff', 0.2));
      ctx.strokeStyle = '#e6f4ff';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x + off - 10, y - 12);
      ctx.lineTo(x + off + 10, y - 17);
      ctx.stroke();
      // ice-flower ornament
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        fillEllipse(ctx, x + off + 7 + Math.cos(a) * 2.5, y - 17 + Math.sin(a) * 2.5, 1.8, 1.8, pal.accessory);
      }
      fillEllipse(ctx, x + off + 7, y - 17, 1.3, 1.3, '#ffffff');
      break;
    case 'topknot':
    case 'elder':
      fillEllipse(ctx, x + off, y - 14, 5, 5, pal.hair);
      ctx.fillStyle = pal.accessory;
      ctx.fillRect(x + off - 5, y - 13, 10, 2.5);
      break;
    case 'hat':
      fillEllipse(ctx, x, y - 8, 20, 6, '#3b2b1d');
      fillEllipse(ctx, x, y - 12, 10, 7, '#4a3726');
      ctx.fillStyle = pal.accessory;
      ctx.fillRect(x - 10, y - 10, 20, 2);
      break;
    case 'flowing':
      fillEllipse(ctx, x + off, y - 12, 6, 4, pal.hair);
      break;
  }
}

function drawSleeve(ctx: Ctx, sx: number, sy: number, hx: number, hy: number, pal: HumanPalette, width = 6) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = width * 2 + 2;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(hx, hy);
  ctx.stroke();
  ctx.strokeStyle = pal.robe;
  ctx.lineWidth = width * 2;
  ctx.stroke();
  // sleeve cuff trim
  ctx.strokeStyle = pal.trim;
  ctx.lineWidth = 2;
  const dx = hx - sx;
  const dy = hy - sy;
  const l = Math.hypot(dx, dy) || 1;
  const nx = -dy / l;
  const ny = dx / l;
  ctx.beginPath();
  ctx.moveTo(hx - (dx / l) * 2 + nx * width, hy - (dy / l) * 2 + ny * width);
  ctx.lineTo(hx - (dx / l) * 2 - nx * width, hy - (dy / l) * 2 - ny * width);
  ctx.stroke();
  ctx.restore();
  fillEllipse(ctx, hx + (dx / l) * 2, hy + (dy / l) * 2, 3, 3, pal.skin);
}

function drawRobeFront(ctx: Ctx, cx: number, fy: number, pal: HumanPalette, pose: HumanPose, back: boolean) {
  const s = fy - 38 + pose.bob;
  const w = fy - 25 + pose.bob;
  const hem = fy - 4;
  const sway = pose.step * 2;
  ctx.beginPath();
  ctx.moveTo(cx - 10, s);
  ctx.lineTo(cx + 10, s);
  ctx.quadraticCurveTo(cx + 13, w, cx + 17 + sway, hem);
  ctx.quadraticCurveTo(cx + sway, hem + 4, cx - 17 + sway, hem);
  ctx.quadraticCurveTo(cx - 13, w, cx - 10, s);
  ctx.closePath();
  ctx.fillStyle = robeGradient(ctx, pal, s, hem);
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1;
  ctx.stroke();
  // hem trim
  ctx.strokeStyle = pal.trim;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx + 16 + sway, hem - 1);
  ctx.quadraticCurveTo(cx + sway, hem + 3, cx - 16 + sway, hem - 1);
  ctx.stroke();
  if (!back) {
    ctx.beginPath();
    ctx.moveTo(cx - 6, s);
    ctx.lineTo(cx + 1, w);
    ctx.moveTo(cx + 6, s);
    ctx.lineTo(cx - 1, w);
    ctx.moveTo(cx + 1, w + 3);
    ctx.lineTo(cx + 2 + sway, hem + 1);
    ctx.stroke();
  }
  // sash with ribbon
  ctx.fillStyle = pal.sash;
  ctx.fillRect(cx - 11, w - 2, 22, 5);
  ctx.strokeStyle = pal.sash;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx + 6, w + 2);
  ctx.quadraticCurveTo(cx + 9 + sway * 2, w + 10, cx + 7 + sway * 3, w + 18);
  ctx.moveTo(cx + 4, w + 2);
  ctx.quadraticCurveTo(cx + 5 + sway, w + 9, cx + 3 + sway * 2, w + 15);
  ctx.stroke();
}

function drawFrontOrBack(ctx: Ctx, cx: number, fy: number, view: 'down' | 'up', pal: HumanPalette, pose: HumanPose) {
  const back = view === 'up';
  const headY = fy - 52 + pose.bob;
  const s = fy - 38 + pose.bob;
  const swordAng = pose.sword !== null ? screenAngle(view, pose.sword) : null;
  const shoulderR = { x: cx + 10, y: s + 3 };
  const hand =
    swordAng !== null
      ? {
          x: shoulderR.x + Math.cos(swordAng) * (13 + pose.reach),
          y: shoulderR.y + Math.sin(swordAng) * (13 + pose.reach),
        }
      : null;

  if (pal.longHair && !back) {
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.moveTo(cx - 14, headY);
    ctx.quadraticCurveTo(cx - 17, s + 14, cx - 12 + pose.step, s + 20);
    ctx.lineTo(cx + 12 + pose.step, s + 20);
    ctx.quadraticCurveTo(cx + 17, s + 14, cx + 14, headY);
    ctx.fill();
  }
  if (pal.sword && pose.sword === null && !back) drawScabbard(ctx, cx - 15, fy - 18, cx + 15, s - 10);
  // when facing away the blade is in front of the body (hidden behind it)
  if (back && hand && swordAng !== null) {
    if (pose.trailFrom !== null) drawTrail(ctx, shoulderR.x, shoulderR.y, screenAngle(view, pose.trailFrom), swordAng, 34);
    drawBlade(ctx, hand.x, hand.y, swordAng, 30);
  }

  // shoes
  const lift = (v: number) => Math.max(0, v) * 3;
  fillEllipse(ctx, cx - 6, fy - 2 - lift(pose.step), 4, 2.5, '#2b2f4a');
  fillEllipse(ctx, cx + 6, fy - 2 - lift(-pose.step), 4, 2.5, '#2b2f4a');

  drawRobeFront(ctx, cx, fy, pal, pose, back);

  if (back) {
    if (pal.longHair) {
      ctx.fillStyle = pal.hair;
      ctx.beginPath();
      ctx.moveTo(cx - 12, headY + 4);
      ctx.quadraticCurveTo(cx - 13, s + 18, cx - 6 + pose.step * 2, s + 28);
      ctx.lineTo(cx + 6 + pose.step * 2, s + 28);
      ctx.quadraticCurveTo(cx + 13, s + 18, cx + 12, headY + 4);
      ctx.fill();
    }
    if (pal.sword && pose.sword === null) drawScabbard(ctx, cx - 14, fy - 16, cx + 14, s - 10);
  }

  // sleeves / arms
  if (pose.cast > 0) {
    const lift = pose.cast * 10;
    drawSleeve(ctx, cx - 10, s + 3, cx - 5, s + 14 - lift, pal, 5.5);
    drawSleeve(ctx, cx + 10, s + 3, cx + 5, s + 14 - lift, pal, 5.5);
  } else {
    drawSleeve(ctx, cx - 10, s + 3, cx - 16 - pose.arm * 2, s + 19 + pose.arm * 2, pal);
    if (hand) drawSleeve(ctx, shoulderR.x, shoulderR.y, hand.x, hand.y, pal, 5);
    else drawSleeve(ctx, cx + 10, s + 3, cx + 16 + pose.arm * 2, s + 19 - pose.arm * 2, pal);
  }

  drawHeadFront(ctx, cx, headY, pal, pose, back);

  if (!back && hand && swordAng !== null) {
    if (pose.trailFrom !== null) drawTrail(ctx, shoulderR.x, shoulderR.y, screenAngle(view, pose.trailFrom), swordAng, 34);
    drawBlade(ctx, hand.x, hand.y, swordAng, 30);
  }
  if (pose.cast > 0) drawCastOrb(ctx, cx, s + 12 - pose.cast * 10, pose.cast, pal);
}

function drawCastOrb(ctx: Ctx, x: number, y: number, k: number, pal: HumanPalette) {
  const r = 6 + k * 8;
  ctx.fillStyle = radial(ctx, x, y, r, [
    [0, 'rgba(255,255,255,0.95)'],
    [0.4, rgba(pal.aura, 0.7)],
    [1, rgba(pal.aura, 0)],
  ]);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawSide(ctx: Ctx, cx: number, fy: number, pal: HumanPalette, pose: HumanPose) {
  const headY = fy - 52 + pose.bob;
  const s = fy - 38 + pose.bob;
  const w = fy - 25 + pose.bob;
  const hem = fy - 4;
  const st = pose.step;
  const shoulder = { x: cx + 2, y: s + 3 };
  const hand =
    pose.sword !== null
      ? {
          x: shoulder.x + Math.cos(pose.sword) * (13 + pose.reach),
          y: shoulder.y + Math.sin(pose.sword) * (13 + pose.reach),
        }
      : null;

  // flowing hair behind
  if (pal.longHair) {
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.moveTo(cx - 2, headY - 6);
    ctx.quadraticCurveTo(cx - 16 - Math.abs(st) * 3, s + 6, cx - 14 - Math.abs(st) * 4, s + 22);
    ctx.lineTo(cx - 6, s + 16);
    ctx.quadraticCurveTo(cx - 6, s, cx + 2, headY + 4);
    ctx.fill();
  }
  if (pal.sword && pose.sword === null) drawScabbard(ctx, cx - 14, s - 8, cx + 4, fy - 14);
  // back sleeve
  drawSleeve(ctx, cx - 1, s + 3, cx - 7 - pose.arm * 5, s + 18, { ...pal, robe: shade(pal.robe, -0.12) }, 5);
  // shoes
  fillEllipse(ctx, cx - st * 7, fy - 2 - Math.max(0, -st) * 2, 4.5, 2.5, '#22263f');
  fillEllipse(ctx, cx + st * 7 + 2, fy - 2 - Math.max(0, st) * 2, 4.5, 2.5, '#2b2f4a');
  // robe
  ctx.beginPath();
  ctx.moveTo(cx - 7, s);
  ctx.lineTo(cx + 8, s);
  ctx.quadraticCurveTo(cx + 10, w, cx + 13 + st * 4, hem);
  ctx.quadraticCurveTo(cx, hem + 3, cx - 14 - Math.abs(st) * 2, hem - 1);
  ctx.quadraticCurveTo(cx - 10, w, cx - 7, s);
  ctx.closePath();
  ctx.fillStyle = robeGradient(ctx, pal, s, hem);
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = pal.trim;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx + 12 + st * 4, hem - 1);
  ctx.quadraticCurveTo(cx, hem + 2, cx - 13 - Math.abs(st) * 2, hem - 2);
  ctx.moveTo(cx + 7, s + 1);
  ctx.lineTo(cx + 4, w);
  ctx.stroke();
  ctx.fillStyle = pal.sash;
  ctx.fillRect(cx - 9, w - 2, 19, 5);
  ctx.strokeStyle = pal.sash;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 8, w + 1);
  ctx.quadraticCurveTo(cx - 13 - Math.abs(st) * 3, w + 8, cx - 15 - Math.abs(st) * 4, w + 15);
  ctx.stroke();

  // head (profile)
  ctx.fillStyle = shade(pal.skin, -0.12);
  ctx.fillRect(cx - 1, headY + 9, 6, 6);
  fillEllipse(ctx, cx + 2, headY + 1, 12, 12.5, pal.skin);
  ctx.fillStyle = pal.hair;
  ctx.beginPath();
  ctx.arc(cx + 1, headY, 13.5, Math.PI * 0.55, Math.PI * 1.85);
  ctx.quadraticCurveTo(cx + 15, headY - 2, cx + 12, headY + 2);
  ctx.quadraticCurveTo(cx + 6, headY - 2, cx + 3, headY + 4);
  ctx.quadraticCurveTo(cx - 2, headY + 8, cx - 4, headY + 14);
  ctx.closePath();
  ctx.fill();
  if (pose.eyesClosed) {
    ctx.strokeStyle = '#3a2a2a';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(cx + 6, headY + 4);
    ctx.quadraticCurveTo(cx + 8, headY + 6, cx + 10, headY + 4);
    ctx.stroke();
  } else {
    fillEllipse(ctx, cx + 8, headY + 4, 1.8, 2.8, '#27304f');
    fillEllipse(ctx, cx + 7.6, headY + 3, 0.7, 0.8, '#ffffff');
  }
  fillEllipse(ctx, cx + 9, headY + 8, 2, 1.3, 'rgba(255,120,140,0.35)');
  if (pal.beard) {
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.moveTo(cx + 4, headY + 9);
    ctx.quadraticCurveTo(cx + 8, headY + 24, cx + 12, headY + 8);
    ctx.fill();
  }
  drawHairTop(ctx, cx, headY, pal, 'side');

  // front arm and sword
  if (pose.cast > 0) {
    drawSleeve(ctx, shoulder.x, shoulder.y, shoulder.x + 12, shoulder.y + 6 - pose.cast * 8, pal, 5.5);
    drawCastOrb(ctx, shoulder.x + 16, shoulder.y + 4 - pose.cast * 8, pose.cast, pal);
  } else if (hand && pose.sword !== null) {
    if (pose.trailFrom !== null) drawTrail(ctx, shoulder.x, shoulder.y, pose.trailFrom, pose.sword, 34);
    drawSleeve(ctx, shoulder.x, shoulder.y, hand.x, hand.y, pal, 5);
    drawBlade(ctx, hand.x, hand.y, pose.sword, 30);
  } else {
    drawSleeve(ctx, shoulder.x, shoulder.y, cx + 4 + pose.arm * 6, s + 19, pal, 5.5);
  }
}

function drawSitting(ctx: Ctx, cx: number, fy: number, pal: HumanPalette, pose: HumanPose) {
  const headY = fy - 40 + pose.bob;
  const s = fy - 27 + pose.bob;
  if (pal.longHair) {
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.moveTo(cx - 14, headY);
    ctx.quadraticCurveTo(cx - 18, s + 12, cx - 13, fy - 8);
    ctx.lineTo(cx + 13, fy - 8);
    ctx.quadraticCurveTo(cx + 18, s + 12, cx + 14, headY);
    ctx.fill();
  }
  // crossed legs
  ctx.beginPath();
  ctx.ellipse(cx, fy - 7, 22, 8, 0, 0, Math.PI * 2);
  ctx.fillStyle = robeGradient(ctx, pal, fy - 15, fy);
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
  ctx.strokeStyle = pal.trim;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, fy - 6, 21, 7, 0, 0.1, Math.PI - 0.1);
  ctx.stroke();
  // torso
  ctx.beginPath();
  ctx.moveTo(cx - 9, s);
  ctx.lineTo(cx + 9, s);
  ctx.quadraticCurveTo(cx + 13, s + 10, cx + 14, fy - 10);
  ctx.lineTo(cx - 14, fy - 10);
  ctx.quadraticCurveTo(cx - 13, s + 10, cx - 9, s);
  ctx.fillStyle = robeGradient(ctx, pal, s, fy - 8);
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = pal.trim;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 5, s);
  ctx.lineTo(cx + 1, s + 9);
  ctx.moveTo(cx + 5, s);
  ctx.lineTo(cx - 1, s + 9);
  ctx.stroke();
  ctx.fillStyle = pal.sash;
  ctx.fillRect(cx - 11, s + 10, 22, 4);
  // hands resting together
  drawSleeve(ctx, cx - 10, s + 3, cx - 3, s + 15, pal, 5);
  drawSleeve(ctx, cx + 10, s + 3, cx + 3, s + 15, pal, 5);
  drawHeadFront(ctx, cx, headY, pal, { ...pose, eyesClosed: true }, false);
}

export function drawHuman(ctx: Ctx, cx: number, fy: number, view: ViewDir, pal: HumanPalette, pose: HumanPose) {
  ctx.save();
  ctx.lineJoin = 'round';
  if (pose.mode === 'sit') {
    drawSitting(ctx, cx, fy, pal, pose);
  } else if (pose.mode === 'lie') {
    // rotate the side-view figure around its feet so it lies on the ground
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
    [0, '#3d5a8c'],
    [1, '#141b33'],
  ]);
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    fillEllipse(ctx, size * 0.5 + Math.cos(a) * size * 0.42, size * 0.5 + Math.sin(a) * size * 0.42, size * 0.05, size * 0.05, 'rgba(255,190,220,0.35)');
  }
  const k = size / 40;
  ctx.translate(size / 2, size * 0.98);
  ctx.scale(k, k);
  drawHuman(ctx, 0, 34, 'down', pal, BASE_POSE);
  ctx.restore();
}
