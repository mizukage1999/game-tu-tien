import { fillEllipse, linear, makeCanvas, radial, rgba, seeded } from './canvas';

/**
 * Soft contact shadow thrown to the lower right, as if the sun sits up and to the
 * left. Every prop gets one, which is what stops the props reading as stickers.
 */
function groundShadow(ctx: CanvasRenderingContext2D, cx: number, baseY: number, rx: number, ry: number) {
  ctx.save();
  ctx.translate(cx + rx * 0.35, baseY - 1);
  ctx.scale(1.25, 0.85);
  ctx.rotate(-0.12);
  fillEllipse(ctx, 0, 0, rx, ry, radial(ctx, 0, 0, rx, [
    [0, 'rgba(32,24,16,0.36)'],
    [0.65, 'rgba(32,24,16,0.2)'],
    [1, 'rgba(32,24,16,0)'],
  ]));
  ctx.restore();
}

/** Carved lacquer column with a tiled cap — the vertical rhythm of the courtyard. */
function pillar(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(64, 168);
  const x = 32;
  groundShadow(ctx, x, 170, 30, 9);
  // stepped stone base
  ctx.fillStyle = linear(ctx, x - 24, 0, x + 24, 0, [
    [0, '#7d7669'],
    [0.4, '#b9b2a2'],
    [1, '#6d6659'],
  ]);
  ctx.fillRect(x - 24, 150, 48, 12);
  ctx.fillStyle = '#cfc6b3';
  ctx.fillRect(x - 24, 149, 48, 3);
  ctx.fillStyle = '#8e8778';
  ctx.fillRect(x - 21, 140, 42, 11);
  ctx.fillStyle = '#d7cfbd';
  ctx.fillRect(x - 21, 139, 42, 2.5);
  // shaft
  const shaftTop = 34;
  const shaftBottom = 140;
  ctx.fillStyle = linear(ctx, x - 13, 0, x + 13, 0, [
    [0, '#5c0f12'],
    [0.18, '#a8261f'],
    [0.42, '#d5482f'],
    [0.62, '#b72d22'],
    [0.85, '#7a1414'],
    [1, '#4a0b0e'],
  ]);
  ctx.fillRect(x - 13, shaftTop, 26, shaftBottom - shaftTop);
  // gold filigree bands
  for (const y of [shaftTop + 6, 74, 118]) {
    ctx.fillStyle = '#e8c877';
    ctx.fillRect(x - 14, y, 28, 3);
    ctx.fillStyle = '#b98a34';
    ctx.fillRect(x - 14, y + 3, 28, 1);
    ctx.fillStyle = rgba('#fff3c4', 0.55);
    ctx.fillRect(x - 14, y, 28, 1);
  }
  // carved scrollwork down the shaft
  ctx.strokeStyle = 'rgba(240,200,110,0.55)';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 4; i++) {
    const y = shaftTop + 22 + i * 22;
    ctx.beginPath();
    ctx.moveTo(x - 8, y);
    ctx.quadraticCurveTo(x, y + 7, x + 8, y);
    ctx.stroke();
    fillEllipse(ctx, x, y + 4, 2, 2, 'rgba(245,210,130,0.7)');
  }
  // sheen
  ctx.fillStyle = linear(ctx, x - 13, 0, x + 3, 0, [
    [0, 'rgba(255,190,150,0.25)'],
    [1, 'rgba(255,190,150,0)'],
  ]);
  ctx.fillRect(x - 13, shaftTop, 16, shaftBottom - shaftTop);
  // bracket + tiled cap
  ctx.fillStyle = '#d9c07a';
  ctx.fillRect(x - 20, 27, 40, 8);
  ctx.fillStyle = '#8d6a2c';
  ctx.fillRect(x - 20, 33, 40, 2);
  ctx.fillStyle = linear(ctx, x - 28, 0, x + 28, 0, [
    [0, '#30384a'],
    [0.5, '#4d5a72'],
    [1, '#232a38'],
  ]);
  ctx.beginPath();
  ctx.moveTo(x - 28, 27);
  ctx.quadraticCurveTo(x, 18, x + 28, 27);
  ctx.lineTo(x + 20, 12);
  ctx.lineTo(x - 20, 12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(190,205,225,0.35)';
  for (let i = -2; i <= 2; i++) ctx.fillRect(x + i * 9 - 1, 14, 2, 10);
  fillEllipse(ctx, x, 9, 6, 5, '#d9b45a');
  fillEllipse(ctx, x - 1.5, 7.5, 3, 2, '#fff0bd');
  return c;
}

/** Stone lantern post with a warm glass chamber; the scene adds the flickering glow. */
function lantern(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(56, 136);
  const x = 28;
  groundShadow(ctx, x, 136, 24, 8);
  // base
  ctx.fillStyle = linear(ctx, x - 15, 0, x + 15, 0, [
    [0, '#6f6a5e'],
    [0.4, '#a9a494'],
    [1, '#635e52'],
  ]);
  ctx.fillRect(x - 15, 118, 30, 11);
  ctx.fillStyle = '#c3bdab';
  ctx.fillRect(x - 15, 117, 30, 2.5);
  // post
  ctx.fillStyle = linear(ctx, x - 6, 0, x + 6, 0, [
    [0, '#736e62'],
    [0.45, '#b0aa9a'],
    [1, '#676257'],
  ]);
  ctx.fillRect(x - 6, 74, 12, 45);
  ctx.fillStyle = 'rgba(255,250,235,0.3)';
  ctx.fillRect(x - 5, 74, 2.5, 45);
  // chamber frame
  ctx.fillStyle = '#4a4436';
  ctx.fillRect(x - 17, 52, 34, 24);
  ctx.fillStyle = linear(ctx, x - 15, 0, x + 15, 0, [
    [0, '#8a8272'],
    [0.5, '#b8b1a0'],
    [1, '#7b7466'],
  ]);
  ctx.fillRect(x - 15, 54, 30, 20);
  // glowing glass
  ctx.fillStyle = radial(ctx, x, 64, 16, [
    [0, '#fff8d6'],
    [0.45, '#ffd782'],
    [1, '#e0952f'],
  ]);
  ctx.fillRect(x - 12, 56, 24, 16);
  ctx.strokeStyle = '#6b6252';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x, 56);
  ctx.lineTo(x, 72);
  ctx.moveTo(x - 6, 56);
  ctx.lineTo(x - 6, 72);
  ctx.moveTo(x + 6, 56);
  ctx.lineTo(x + 6, 72);
  ctx.stroke();
  // roof
  ctx.fillStyle = linear(ctx, x - 26, 0, x + 26, 0, [
    [0, '#2c3345'],
    [0.45, '#4a5570'],
    [1, '#232a38'],
  ]);
  ctx.beginPath();
  ctx.moveTo(x - 26, 52);
  ctx.quadraticCurveTo(x, 40, x + 26, 52);
  ctx.lineTo(x + 17, 34);
  ctx.lineTo(x - 17, 34);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(200,215,235,0.35)';
  ctx.lineWidth = 1;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * 8, 36);
    ctx.lineTo(x + i * 10, 50);
    ctx.stroke();
  }
  // finial
  fillEllipse(ctx, x, 30, 6, 5, '#d9b45a');
  fillEllipse(ctx, x - 1.5, 28.5, 3, 2, '#fff3c2');
  // hanging tassel
  ctx.strokeStyle = '#b5842c';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x + 22, 48);
  ctx.lineTo(x + 22, 66);
  ctx.stroke();
  ctx.fillStyle = '#c8543f';
  ctx.fillRect(x + 19, 64, 6, 10);
  ctx.fillStyle = '#e0b453';
  ctx.fillRect(x + 19, 63, 6, 2.5);
  return c;
}

/** Layered blossom canopy: deep shadow mass, lit clusters, rim light, fallen petals. */
function cherryTree(seed: number): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(200, 236);
  const r = seeded(seed);
  const baseX = 100;
  const baseY = 228;
  groundShadow(ctx, baseX, baseY, 56, 14);
  // fallen petals
  for (let i = 0; i < 26; i++) {
    const px = baseX + (r() - 0.5) * 130;
    const py = baseY - 8 + r() * 14;
    ctx.fillStyle = rgba(r() > 0.4 ? '#ffd6e6' : '#ffeef6', 0.75);
    ctx.beginPath();
    ctx.ellipse(px, py, 2.2, 1.2, r() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // trunk, leaning like the reference trees
  ctx.fillStyle = linear(ctx, baseX - 16, 0, baseX + 18, 0, [
    [0, '#33201a'],
    [0.28, '#5c3a28'],
    [0.55, '#7b5033'],
    [0.8, '#4a2d20'],
    [1, '#2a1a14'],
  ]);
  ctx.beginPath();
  ctx.moveTo(baseX - 17, baseY - 2);
  ctx.quadraticCurveTo(baseX - 6, baseY - 70, baseX - 24, baseY - 128);
  ctx.lineTo(baseX + 4, baseY - 130);
  ctx.quadraticCurveTo(baseX + 12, baseY - 62, baseX + 17, baseY - 2);
  ctx.closePath();
  ctx.fill();
  // bark ridges
  ctx.strokeStyle = 'rgba(20,12,8,0.35)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 9; i++) {
    const y = baseY - 12 - i * 13;
    const w = 12 - i * 0.7;
    ctx.beginPath();
    ctx.moveTo(baseX - w, y);
    ctx.quadraticCurveTo(baseX, y + 4, baseX + w, y - 2);
    ctx.stroke();
  }
  // branches
  ctx.strokeStyle = '#4a2d20';
  ctx.lineCap = 'round';
  const branches: [number, number, number, number, number][] = [
    [baseX - 18, baseY - 120, baseX - 74, baseY - 168, 8],
    [baseX + 2, baseY - 126, baseX + 66, baseY - 176, 7],
    [baseX - 10, baseY - 100, baseX - 52, baseY - 132, 5],
    [baseX + 6, baseY - 96, baseX + 52, baseY - 124, 5],
  ];
  for (const [x0, y0, x1, y1, w] of branches) {
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo((x0 + x1) / 2, y0 - 22, x1, y1);
    ctx.stroke();
  }
  // Deep under-canopy so the blossom mass has a silhouette instead of a soft blob.
  const clusters: [number, number, number][] = [
    [baseX - 6, baseY - 190, 44],
    [baseX - 58, baseY - 164, 30],
    [baseX + 50, baseY - 170, 32],
    [baseX - 30, baseY - 138, 24],
    [baseX + 26, baseY - 136, 22],
    [baseX - 70, baseY - 196, 20],
    [baseX + 66, baseY - 202, 19],
    [baseX + 4, baseY - 218, 24],
  ];
  for (const [cx, cy, rad] of clusters) {
    ctx.fillStyle = radial(ctx, cx, cy + rad * 0.3, rad * 1.05, [
      [0, '#a8446f'],
      [1, '#7d2f52'],
    ]);
    ctx.beginPath();
    ctx.ellipse(cx + 2, cy + 9, rad, rad * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Lit canopy — light comes from the upper left.
  for (const [cx, cy, rad] of clusters) {
    ctx.fillStyle = radial(ctx, cx - rad * 0.4, cy - rad * 0.5, rad * 1.3, [
      [0, '#fff6fb'],
      [0.3, '#ffdbe9'],
      [0.66, '#ffa9cd'],
      [1, '#d9699c'],
    ]);
    ctx.beginPath();
    ctx.ellipse(cx, cy, rad, rad * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(198,104,146,0.35)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  // Clumped blossom florets: small five-petal sprays, denser on the sunlit side.
  for (let i = 0; i < 84; i++) {
    const [cx, cy, rad] = clusters[Math.floor(r() * clusters.length)];
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * rad * 0.9;
    const px = cx + Math.cos(a) * d;
    const py = cy + Math.sin(a) * d * 0.78 - (a < Math.PI ? 2 : 0);
    const size = 1.1 + r() * 1.5;
    fillEllipse(ctx, px, py, size * 1.5, size, rgba(r() > 0.5 ? '#ffffff' : '#ff86b8', 0.7), r() * 3);
  }
  // A few blossoms catching direct light.
  for (let i = 0; i < 12; i++) {
    const [cx, cy, rad] = clusters[Math.floor(r() * clusters.length)];
    const px = cx - rad * 0.2 + (r() - 0.5) * rad * 0.9;
    const py = cy - rad * 0.3 + (r() - 0.5) * rad * 0.7;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      fillEllipse(ctx, px + Math.cos(a) * 2.4, py + Math.sin(a) * 2.4, 1.9, 1.9, 'rgba(255,255,255,0.85)');
    }
    fillEllipse(ctx, px, py, 1.2, 1.2, '#ffe8a8');
  }
  // hanging sprigs
  ctx.strokeStyle = 'rgba(120,70,60,0.55)';
  for (let i = 0; i < 5; i++) {
    const sx = baseX - 62 + i * 31 + r() * 10;
    const sy = baseY - 158 + r() * 18;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(sx + 4, sy + 14, sx - 1, sy + 27);
    ctx.stroke();
    fillEllipse(ctx, sx - 1, sy + 30, 4.4, 3.6, 'rgba(255,196,220,0.95)');
    fillEllipse(ctx, sx + 5, sy + 20, 3, 2.4, 'rgba(255,214,232,0.85)');
  }
  return c;
}

/** Tiered pine for the misty outer grounds. */
function pineTree(seed: number): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(156, 224);
  const r = seeded(seed);
  const x = 78;
  const baseY = 218;
  groundShadow(ctx, x, baseY, 44, 12);
  ctx.fillStyle = linear(ctx, x - 10, 0, x + 10, 0, [
    [0, '#2e2018'],
    [0.5, '#503425'],
    [1, '#251810'],
  ]);
  ctx.fillRect(x - 9, 130, 18, 84);
  const layers = 5;
  for (let i = 0; i < layers; i++) {
    const y = 44 + i * 30;
    const w = 30 + i * 14;
    ctx.fillStyle = '#1c3f2b';
    ctx.beginPath();
    ctx.moveTo(x, y - 34);
    ctx.lineTo(x + w + 5, y + 26);
    ctx.quadraticCurveTo(x, y + 34, x - w - 5, y + 26);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = linear(ctx, x - w, 0, x + w, 0, [
      [0, '#315b3a'],
      [0.45, '#4f8f4d'],
      [0.8, '#2f5c39'],
      [1, '#22432c'],
    ]);
    ctx.beginPath();
    ctx.moveTo(x, y - 30);
    ctx.lineTo(x + w, y + 22);
    ctx.quadraticCurveTo(x, y + 30, x - w, y + 22);
    ctx.closePath();
    ctx.fill();
    // needle highlights & rim light
    ctx.strokeStyle = 'rgba(170,225,160,0.35)';
    ctx.lineWidth = 1.2;
    for (let k = -w; k <= w; k += 5) {
      ctx.beginPath();
      ctx.moveTo(x + k * 0.55, y - 24);
      ctx.lineTo(x + k, y + 20);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(210,255,190,0.25)';
    ctx.beginPath();
    ctx.moveTo(x - w * 0.95, y + 18);
    ctx.quadraticCurveTo(x, y + 4, x + 2, y - 30);
    ctx.stroke();
  }
  for (let i = 0; i < 26; i++) {
    fillEllipse(ctx, x - 40 + r() * 80, 20 + r() * 150, 2.2, 1.6, 'rgba(180,240,170,0.45)');
  }
  return c;
}

function rock(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(72, 54);
  groundShadow(ctx, 36, 52, 32, 9);
  ctx.fillStyle = linear(ctx, 6, 8, 54, 46, [
    [0, '#c3cbd3'],
    [0.45, '#9aa4ae'],
    [1, '#5d666f'],
  ]);
  ctx.beginPath();
  ctx.moveTo(8, 46);
  ctx.quadraticCurveTo(2, 22, 22, 12);
  ctx.quadraticCurveTo(38, 2, 54, 12);
  ctx.quadraticCurveTo(70, 24, 64, 46);
  ctx.closePath();
  ctx.fill();
  // facets
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.moveTo(22, 12);
  ctx.quadraticCurveTo(38, 6, 48, 16);
  ctx.lineTo(34, 28);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(50,60,70,0.35)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(34, 28);
  ctx.lineTo(26, 44);
  ctx.moveTo(34, 28);
  ctx.lineTo(52, 40);
  ctx.stroke();
  // moss
  for (let i = 0; i < 12; i++) {
    fillEllipse(ctx, 14 + i * 4.4, 44 - (i % 3) * 3, 4.5, 2.6, 'rgba(110,160,80,0.55)');
  }
  fillEllipse(ctx, 50, 20, 5, 3, 'rgba(120,170,90,0.4)');
  return c;
}

/** Bronze incense burner with handles, smoke is emitted by the scene. */
function burner(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(80, 92);
  const x = 40;
  groundShadow(ctx, x, 90, 30, 9);
  // legs
  for (const lx of [-16, 0, 16]) {
    ctx.fillStyle = linear(ctx, x + lx - 3, 0, x + lx + 3, 0, [
      [0, '#4e3a1c'],
      [0.5, '#8a6a2e'],
      [1, '#3d2c14'],
    ]);
    ctx.fillRect(x + lx - 3, 64, 6, 18);
    fillEllipse(ctx, x + lx, 82, 4, 2.4, '#6b5024');
  }
  // bowl
  ctx.fillStyle = linear(ctx, 10, 0, 70, 0, [
    [0, '#4a3316'],
    [0.22, '#9c7327'],
    [0.45, '#d9ae55'],
    [0.68, '#a67c2c'],
    [1, '#3f2c12'],
  ]);
  ctx.beginPath();
  ctx.moveTo(10, 34);
  ctx.quadraticCurveTo(12, 68, x, 70);
  ctx.quadraticCurveTo(68, 68, 70, 34);
  ctx.closePath();
  ctx.fill();
  // rim
  ctx.fillStyle = '#e8c877';
  ctx.fillRect(7, 30, 66, 6);
  ctx.fillStyle = 'rgba(255,248,214,0.6)';
  ctx.fillRect(7, 30, 66, 2);
  // handles
  ctx.strokeStyle = '#c99a3d';
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.arc(14, 24, 6, Math.PI * 0.2, Math.PI * 1.6);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(66, 24, 6, Math.PI * 1.4, Math.PI * 2.8);
  ctx.stroke();
  // engraved band
  ctx.strokeStyle = 'rgba(70,44,12,0.55)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(18, 44);
  ctx.quadraticCurveTo(x, 54, 62, 44);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,235,170,0.4)';
  ctx.beginPath();
  ctx.moveTo(18, 49);
  ctx.quadraticCurveTo(x, 59, 62, 49);
  ctx.stroke();
  return c;
}

function bush(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(80, 58);
  groundShadow(ctx, 40, 56, 32, 9);
  const balls: [number, number, number][] = [
    [24, 34, 15],
    [54, 34, 15],
    [40, 24, 17],
    [18, 42, 10],
    [62, 42, 10],
  ];
  for (const [x, y, rr] of balls) {
    ctx.fillStyle = radial(ctx, x - rr * 0.3, y - rr * 0.4, rr * 1.4, [
      [0, '#a9d97a'],
      [0.55, '#5f9b4d'],
      [1, '#315c31'],
    ]);
    ctx.beginPath();
    ctx.arc(x, y, rr, 0, Math.PI * 2);
    ctx.fill();
  }
  const r = seeded(9);
  for (let i = 0; i < 16; i++) {
    const px = 14 + r() * 52;
    const py = 12 + r() * 30;
    fillEllipse(ctx, px, py, 2.4, 1.6, rgba(r() > 0.5 ? '#dcf2a8' : '#fff0b0', 0.8));
  }
  for (let i = 0; i < 4; i++) fillEllipse(ctx, 20 + r() * 40, 14 + r() * 22, 2, 2, '#ffd7e6');
  return c;
}

function magicCircle(size: number, color: string): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(size, size);
  const m = size / 2;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  // soft halo underneath the lines
  ctx.fillStyle = radial(ctx, m, m, m, [
    [0, 'rgba(140,220,255,0.16)'],
    [0.7, 'rgba(140,220,255,0.06)'],
    [1, 'rgba(140,220,255,0)'],
  ]);
  ctx.beginPath();
  ctx.arc(m, m, m - 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  for (const rr of [0.96, 0.86, 0.5]) {
    ctx.beginPath();
    ctx.arc(m, m, m * rr - 2, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(m, m, m * 0.78, 0, Math.PI * 2);
  ctx.stroke();
  // eight trigram marks between the outer rings
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.save();
    ctx.translate(m + Math.cos(a) * m * 0.91, m + Math.sin(a) * m * 0.91);
    ctx.rotate(a + Math.PI / 2);
    for (let k = 0; k < 3; k++) {
      const broken = ((i >> k) & 1) === 1;
      const y = -6 + k * 6;
      if (broken) {
        ctx.fillRect(-10, y, 8, 3);
        ctx.fillRect(2, y, 8, 3);
      } else ctx.fillRect(-10, y, 20, 3);
    }
    ctx.restore();
  }
  // hexagram seals
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= 6; i++) {
    const a = (i * 4 * Math.PI) / 6 - Math.PI / 2;
    const x = m + Math.cos(a) * m * 0.78;
    const y = m + Math.sin(a) * m * 0.78;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i <= 6; i++) {
    const a = (i * 4 * Math.PI) / 6 + Math.PI / 2;
    const x = m + Math.cos(a) * m * 0.78;
    const y = m + Math.sin(a) * m * 0.78;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  // yin-yang core
  ctx.beginPath();
  ctx.arc(m, m, m * 0.22, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(m, m, m * 0.22, -Math.PI / 2, Math.PI / 2);
  ctx.arc(m, m + m * 0.11, m * 0.11, Math.PI / 2, -Math.PI / 2, true);
  ctx.arc(m, m - m * 0.11, m * 0.11, Math.PI / 2, -Math.PI / 2);
  ctx.fill();
  return c;
}

function portal(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(128, 128);
  ctx.fillStyle = radial(ctx, 64, 64, 62, [
    [0, 'rgba(255,255,255,0.95)'],
    [0.22, 'rgba(170,235,255,0.75)'],
    [0.68, 'rgba(90,130,255,0.32)'],
    [1, 'rgba(90,120,255,0)'],
  ]);
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(64, 64, 14 + i * 9, i, i + Math.PI * 1.2);
    ctx.stroke();
  }
  return c;
}

function soft(size: number, color: string): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(size, size);
  ctx.fillStyle = radial(ctx, size / 2, size / 2, size / 2, [
    [0, rgba(color, 0.9)],
    [0.4, rgba(color, 0.35)],
    [1, rgba(color, 0)],
  ]);
  ctx.fillRect(0, 0, size, size);
  return c;
}

function shadow(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(48, 16);
  ctx.fillStyle = radial(ctx, 24, 8, 24, [
    [0, 'rgba(0,0,0,0.42)'],
    [1, 'rgba(0,0,0,0)'],
  ]);
  ctx.save();
  ctx.scale(1, 16 / 48);
  ctx.beginPath();
  ctx.arc(24, 24, 24, 0, Math.PI * 2);
  ctx.restore();
  ctx.fill();
  return c;
}

export function buildDecor(): Record<string, HTMLCanvasElement> {
  return {
    pillar: pillar(),
    lantern: lantern(),
    tree_cherry: cherryTree(5),
    tree_cherry_b: cherryTree(17),
    tree_pine: pineTree(3),
    tree_pine_b: pineTree(29),
    rock: rock(),
    burner: burner(),
    bush: bush(),
    circle: magicCircle(320, 'rgba(120,220,255,0.85)'),
    circle_gold: magicCircle(256, 'rgba(255,214,120,0.85)'),
    portal: portal(),
    glow_warm: soft(180, '#ffcf6a'),
    glow_cold: soft(150, '#8fe3ff'),
    shadow: shadow(),
  };
}
