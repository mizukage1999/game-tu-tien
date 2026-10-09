import { fillEllipse, linear, makeCanvas, radial, rgba, seeded } from './canvas';

function pillar(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(44, 124);
  fillEllipse(ctx, 22, 118, 18, 5, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = '#9aa0ab';
  ctx.fillRect(6, 106, 32, 12);
  ctx.fillStyle = '#c3c8d0';
  ctx.fillRect(6, 104, 32, 4);
  ctx.fillStyle = linear(ctx, 10, 0, 34, 0, [
    [0, '#7c1414'],
    [0.35, '#d13a2a'],
    [0.6, '#b52a20'],
    [1, '#5c0e0e'],
  ]);
  ctx.fillRect(10, 18, 24, 88);
  ctx.fillStyle = '#e1b854';
  for (const y of [22, 60, 98]) ctx.fillRect(9, y, 26, 4);
  ctx.fillStyle = '#e1b854';
  ctx.beginPath();
  ctx.moveTo(4, 18);
  ctx.lineTo(40, 18);
  ctx.lineTo(34, 8);
  ctx.lineTo(10, 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#3a4258';
  ctx.fillRect(2, 2, 40, 7);
  return c;
}

function lantern(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(48, 92);
  fillEllipse(ctx, 24, 86, 18, 5, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = '#8c929e';
  ctx.fillRect(12, 74, 24, 10);
  ctx.fillStyle = '#a4aab5';
  ctx.fillRect(18, 46, 12, 30);
  ctx.fillStyle = '#b8bec8';
  ctx.fillRect(8, 40, 32, 7);
  // light box
  ctx.fillStyle = '#9aa0ab';
  ctx.fillRect(11, 20, 26, 21);
  ctx.fillStyle = radial(ctx, 24, 30, 14, [
    [0, '#fff6c9'],
    [0.5, '#ffc95a'],
    [1, '#d17a1c'],
  ]);
  ctx.fillRect(15, 23, 18, 15);
  ctx.fillStyle = '#7a808c';
  ctx.fillRect(23, 23, 2, 15);
  // roof
  ctx.fillStyle = '#5a6070';
  ctx.beginPath();
  ctx.moveTo(2, 21);
  ctx.quadraticCurveTo(24, 10, 46, 21);
  ctx.lineTo(36, 8);
  ctx.lineTo(12, 8);
  ctx.closePath();
  ctx.fill();
  fillEllipse(ctx, 24, 6, 5, 4, '#6b7282');
  return c;
}

function cherryTree(seed: number): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(150, 170);
  const r = seeded(seed);
  fillEllipse(ctx, 75, 160, 46, 10, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = linear(ctx, 66, 0, 86, 0, [
    [0, '#4a2c22'],
    [1, '#7a4a34'],
  ]);
  ctx.beginPath();
  ctx.moveTo(66, 162);
  ctx.quadraticCurveTo(70, 120, 60, 86);
  ctx.lineTo(74, 84);
  ctx.quadraticCurveTo(80, 70, 96, 62);
  ctx.lineTo(98, 70);
  ctx.quadraticCurveTo(84, 90, 86, 162);
  ctx.closePath();
  ctx.fill();
  const clusters: [number, number, number][] = [
    [75, 60, 40],
    [42, 78, 28],
    [110, 74, 30],
    [58, 38, 26],
    [98, 40, 26],
    [76, 92, 24],
  ];
  for (const [x, y, rad] of clusters) fillEllipse(ctx, x + 3, y + 5, rad, rad * 0.85, '#c25d8a');
  for (const [x, y, rad] of clusters) {
    ctx.fillStyle = radial(ctx, x - rad * 0.3, y - rad * 0.3, rad * 1.2, [
      [0, '#ffe1ee'],
      [0.5, '#ffaed0'],
      [1, '#e478a8'],
    ]);
    ctx.beginPath();
    ctx.ellipse(x, y, rad, rad * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 70; i++) {
    const [x, y, rad] = clusters[Math.floor(r() * clusters.length)];
    const a = r() * Math.PI * 2;
    const d = r() * rad * 0.9;
    fillEllipse(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.85, 2.2, 1.8, r() > 0.5 ? '#ffffff' : '#ff8fbf');
  }
  return c;
}

function pineTree(seed: number): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(120, 176);
  const r = seeded(seed);
  fillEllipse(ctx, 60, 166, 36, 9, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = '#4b3122';
  ctx.fillRect(54, 120, 12, 48);
  const layers = 4;
  for (let i = 0; i < layers; i++) {
    const y = 30 + i * 28;
    const w = 26 + i * 10;
    ctx.fillStyle = '#1f4a2e';
    ctx.beginPath();
    ctx.moveTo(60, y - 30);
    ctx.lineTo(60 + w + 4, y + 26);
    ctx.lineTo(60 - w - 4, y + 26);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = linear(ctx, 60 - w, 0, 60 + w, 0, [
      [0, '#2f6b3d'],
      [0.5, '#4f9a55'],
      [1, '#2a5a35'],
    ]);
    ctx.beginPath();
    ctx.moveTo(60, y - 28);
    ctx.lineTo(60 + w, y + 22);
    ctx.quadraticCurveTo(60, y + 30, 60 - w, y + 22);
    ctx.closePath();
    ctx.fill();
  }
  for (let i = 0; i < 20; i++) {
    fillEllipse(ctx, 30 + r() * 60, 20 + r() * 110, 2, 1.5, 'rgba(180,240,160,0.5)');
  }
  return c;
}

function rock(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(60, 46);
  fillEllipse(ctx, 30, 40, 26, 6, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = linear(ctx, 0, 6, 0, 42, [
    [0, '#b5bcc6'],
    [1, '#69717f'],
  ]);
  ctx.beginPath();
  ctx.moveTo(6, 40);
  ctx.quadraticCurveTo(2, 18, 20, 10);
  ctx.quadraticCurveTo(34, 2, 46, 12);
  ctx.quadraticCurveTo(58, 24, 54, 40);
  ctx.closePath();
  ctx.fill();
  fillEllipse(ctx, 24, 18, 8, 4, 'rgba(255,255,255,0.25)', -0.3);
  fillEllipse(ctx, 40, 34, 6, 3, 'rgba(90,150,80,0.6)');
  return c;
}

function burner(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(64, 72);
  fillEllipse(ctx, 32, 66, 26, 6, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = '#5a4a2a';
  ctx.fillRect(14, 50, 6, 14);
  ctx.fillRect(44, 50, 6, 14);
  ctx.fillRect(29, 52, 6, 12);
  ctx.fillStyle = linear(ctx, 8, 0, 56, 0, [
    [0, '#6b5226'],
    [0.4, '#c99c45'],
    [1, '#5a4320'],
  ]);
  ctx.beginPath();
  ctx.moveTo(8, 26);
  ctx.lineTo(56, 26);
  ctx.quadraticCurveTo(58, 54, 32, 56);
  ctx.quadraticCurveTo(6, 54, 8, 26);
  ctx.fill();
  ctx.fillStyle = '#e0bb62';
  ctx.fillRect(6, 22, 52, 6);
  ctx.strokeStyle = '#e0bb62';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(14, 18, 5, Math.PI, 0);
  ctx.moveTo(55, 18);
  ctx.arc(50, 18, 5, 0, Math.PI, true);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(70,40,10,0.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(20, 36);
  ctx.quadraticCurveTo(32, 44, 44, 36);
  ctx.stroke();
  return c;
}

function bush(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(64, 44);
  fillEllipse(ctx, 32, 38, 26, 6, 'rgba(0,0,0,0.22)');
  for (const [x, y, rr] of [
    [20, 26, 14],
    [42, 26, 14],
    [31, 18, 15],
  ] as const) {
    ctx.fillStyle = radial(ctx, x - 4, y - 4, rr * 1.3, [
      [0, '#8fd06a'],
      [1, '#2f6b33'],
    ]);
    ctx.beginPath();
    ctx.arc(x, y, rr, 0, Math.PI * 2);
    ctx.fill();
  }
  const r = seeded(9);
  for (let i = 0; i < 8; i++) fillEllipse(ctx, 14 + r() * 36, 10 + r() * 22, 2, 2, '#fff1a8');
  return c;
}

function magicCircle(size: number, color: string): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(size, size);
  const m = size / 2;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;
  for (const rr of [0.96, 0.82, 0.5]) {
    ctx.beginPath();
    ctx.arc(m, m, m * rr - 2, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.lineWidth = 2;
  // eight trigram marks between the outer rings
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.save();
    ctx.translate(m + Math.cos(a) * m * 0.89, m + Math.sin(a) * m * 0.89);
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
  // star polygon
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
  ctx.fillStyle = radial(ctx, 64, 64, 64, [
    [0, 'rgba(255,255,255,0.95)'],
    [0.25, 'rgba(160,230,255,0.8)'],
    [0.7, 'rgba(90,120,255,0.35)'],
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
    glow_warm: soft(160, '#ffcf6a'),
    glow_cold: soft(128, '#8fe3ff'),
    shadow: shadow(),
  };
}
