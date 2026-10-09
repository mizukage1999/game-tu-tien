import { fillEllipse, linear, makeCanvas, radial, type Ctx } from './canvas';

function crescent(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(180, 180);
  const m = 90;
  ctx.save();
  ctx.shadowColor = 'rgba(120,210,255,0.9)';
  ctx.shadowBlur = 14;
  ctx.fillStyle = linear(ctx, m, 10, m + 80, m, [
    [0, 'rgba(160,225,255,0)'],
    [0.4, 'rgba(160,225,255,0.85)'],
    [0.75, 'rgba(255,255,255,1)'],
    [1, 'rgba(200,240,255,0.9)'],
  ]);
  // crescent pointing right: outer arc minus offset inner arc
  ctx.beginPath();
  ctx.arc(m, m, 78, -Math.PI * 0.42, Math.PI * 0.42);
  ctx.arc(m - 24, m, 70, Math.PI * 0.36, -Math.PI * 0.36, true);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  return c;
}

function spark(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(40, 40);
  ctx.fillStyle = radial(ctx, 20, 20, 20, [
    [0, 'rgba(255,255,255,1)'],
    [0.3, 'rgba(180,235,255,0.8)'],
    [1, 'rgba(120,200,255,0)'],
  ]);
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = i % 2 === 0 ? 20 : 5;
    ctx.lineTo(20 + Math.cos(a) * r, 20 + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  return c;
}

function dot(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(16, 16);
  ctx.fillStyle = radial(ctx, 8, 8, 8, [
    [0, 'rgba(255,255,255,1)'],
    [0.5, 'rgba(255,255,255,0.5)'],
    [1, 'rgba(255,255,255,0)'],
  ]);
  ctx.fillRect(0, 0, 16, 16);
  return c;
}

function ring(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(256, 256);
  ctx.strokeStyle = 'rgba(180,235,255,0.95)';
  ctx.shadowColor = 'rgba(120,210,255,1)';
  ctx.shadowBlur = 12;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(128, 128, 110, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(128, 128, 92, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.save();
    ctx.translate(128 + Math.cos(a) * 101, 128 + Math.sin(a) * 101);
    ctx.rotate(a);
    ctx.fillStyle = 'rgba(220,245,255,0.95)';
    ctx.fillRect(-2, -5, 4, 10);
    ctx.restore();
  }
  return c;
}

function shard(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(18, 40);
  ctx.fillStyle = linear(ctx, 0, 0, 18, 40, [
    [0, '#ffffff'],
    [0.5, '#9fe3ff'],
    [1, '#3c8fe0'],
  ]);
  ctx.beginPath();
  ctx.moveTo(9, 0);
  ctx.lineTo(17, 26);
  ctx.lineTo(9, 40);
  ctx.lineTo(1, 26);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.moveTo(9, 2);
  ctx.lineTo(9, 36);
  ctx.stroke();
  return c;
}

function flySword(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(96, 28);
  const glow = linear(ctx, 0, 0, 96, 0, [
    [0, 'rgba(120,200,255,0)'],
    [0.6, 'rgba(140,220,255,0.5)'],
    [1, 'rgba(200,245,255,0.8)'],
  ]);
  fillEllipse(ctx, 48, 14, 48, 10, glow);
  ctx.fillStyle = '#3a4a7a';
  ctx.fillRect(28, 12, 12, 4);
  ctx.fillStyle = '#e1b854';
  ctx.fillRect(40, 7, 4, 14);
  ctx.fillStyle = linear(ctx, 44, 0, 92, 0, [
    [0, '#c8d6e6'],
    [1, '#ffffff'],
  ]);
  ctx.beginPath();
  ctx.moveTo(44, 11);
  ctx.lineTo(86, 11);
  ctx.lineTo(94, 14);
  ctx.lineTo(86, 17);
  ctx.lineTo(44, 17);
  ctx.closePath();
  ctx.fill();
  return c;
}

function burst(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(80, 80);
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineCap = 'round';
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.2;
    const r0 = 10 + (i % 3) * 3;
    const r1 = 30 + (i % 2) * 8;
    ctx.lineWidth = 3 - (i % 2);
    ctx.beginPath();
    ctx.moveTo(40 + Math.cos(a) * r0, 40 + Math.sin(a) * r0);
    ctx.lineTo(40 + Math.cos(a) * r1, 40 + Math.sin(a) * r1);
    ctx.stroke();
  }
  return c;
}

function petal(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(12, 10);
  drawPetal(ctx);
  return c;
}

function drawPetal(ctx: Ctx) {
  fillEllipse(ctx, 6, 5, 5, 3, '#ffb7d5', 0.4);
  fillEllipse(ctx, 5, 4, 2, 1, 'rgba(255,255,255,0.8)', 0.4);
}

export function buildFx(): Record<string, HTMLCanvasElement> {
  return {
    fx_slash: crescent(),
    fx_spark: spark(),
    fx_dot: dot(),
    fx_ring: ring(),
    fx_shard: shard(),
    fx_flysword: flySword(),
    fx_burst: burst(),
    fx_petal: petal(),
  };
}
