type HerbKind = 'linh_chi' | 'ngung_lo';

function ellipse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** A tapered leaf with a bright midrib; all coordinates are in the 160×100 art space. */
function leaf(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  length: number,
  width: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const shade = ctx.createLinearGradient(-width, 0, width, -length);
  shade.addColorStop(0, '#153d37');
  shade.addColorStop(0.45, '#327d5a');
  shade.addColorStop(0.75, '#69a965');
  shade.addColorStop(1, '#afce89');
  ctx.fillStyle = shade;
  ctx.strokeStyle = '#183f36';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-width, -length * 0.3, -width * 0.85, -length * 0.65, 0, -length);
  ctx.bezierCurveTo(width * 0.7, -length * 0.7, width, -length * 0.3, 0, 0);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#c6d99480';
  ctx.lineWidth = 0.65;
  ctx.beginPath();
  ctx.moveTo(0, -2);
  ctx.quadraticCurveTo(-1.5, -length * 0.5, 0, -length + 3);
  ctx.stroke();
  ctx.strokeStyle = '#c3d59848';
  for (let i = 1; i <= 4; i++) {
    const at = (length * i) / 6;
    ctx.beginPath();
    ctx.moveTo(0, -at);
    ctx.lineTo(-width * 0.55, -at - length * 0.12);
    ctx.moveTo(0, -at);
    ctx.lineTo(width * 0.55, -at - length * 0.12);
    ctx.stroke();
  }
  ctx.restore();
}

function cap(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, rotation: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(scale, scale);
  const underside = ctx.createLinearGradient(0, -2, 0, 8);
  underside.addColorStop(0, '#e7b879');
  underside.addColorStop(1, '#704330');
  ctx.fillStyle = underside;
  ctx.beginPath();
  ctx.ellipse(0, 2, 29, 6, 0, 0, Math.PI);
  ctx.fill();
  const skin = ctx.createLinearGradient(-20, -28, 20, 6);
  skin.addColorStop(0, '#f0b875');
  skin.addColorStop(0.28, '#cf7353');
  skin.addColorStop(0.62, '#993e36');
  skin.addColorStop(1, '#5c2830');
  ctx.beginPath();
  ctx.moveTo(-28, 0);
  ctx.bezierCurveTo(-38, -11, -25, -28, -9, -24);
  ctx.bezierCurveTo(1, -34, 13, -27, 19, -24);
  ctx.bezierCurveTo(34, -29, 42, -11, 31, -2);
  ctx.bezierCurveTo(21, 7, -14, 8, -28, 0);
  ctx.closePath();
  ctx.fillStyle = skin;
  ctx.fill();
  ctx.strokeStyle = '#f0c28b';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.save();
  ctx.clip();
  // Organic growth rings follow the fan, rather than a flat mushroom icon.
  for (let i = 0; i < 6; i++) {
    ctx.strokeStyle = i % 2 ? '#f9cf8d80' : '#68252f80';
    ctx.lineWidth = i % 2 ? 0.8 : 1.6;
    ctx.beginPath();
    ctx.ellipse(0, 8, 10 + i * 5, 7 + i * 4, -0.04, Math.PI, Math.PI * 2);
    ctx.stroke();
  }
  ctx.strokeStyle = '#ffdab277';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-24, -14);
  ctx.bezierCurveTo(-18, -23, -9, -21, -6, -23);
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

function stalk(
  ctx: CanvasRenderingContext2D,
  x: number,
  foot: number,
  top: number,
  lean: number,
  width: number,
) {
  const shade = ctx.createLinearGradient(x - width, 0, x + width, 0);
  shade.addColorStop(0, '#674536');
  shade.addColorStop(0.5, '#d5aa75');
  shade.addColorStop(1, '#916546');
  ctx.fillStyle = shade;
  ctx.strokeStyle = '#5d4032';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x - width, foot);
  ctx.bezierCurveTo(x + lean - width, foot - 12, x + lean - width, top + 12, x + lean - width, top);
  ctx.lineTo(x + lean + width, top);
  ctx.bezierCurveTo(x + lean + width, top + 12, x + width, foot - 8, x + width + 3, foot);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function dew(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(radius / 10, radius / 10);
  ellipse(ctx, 1, 9, 7, 2.5, '#082b3f66');
  const water = ctx.createRadialGradient(-3, -2, 1, 2, 2, 14);
  water.addColorStop(0, '#e4ffff');
  water.addColorStop(0.3, '#9eeaf0');
  water.addColorStop(0.65, '#3aa7c1d9');
  water.addColorStop(1, '#175171dd');
  ctx.fillStyle = water;
  ctx.strokeStyle = '#c5f6ed';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.bezierCurveTo(-2, -6, -9, -1, -8, 4);
  ctx.bezierCurveTo(-7, 14, 10, 13, 8, 2);
  ctx.bezierCurveTo(7, -4, 2, -7, 0, -12);
  ctx.fill();
  ctx.stroke();
  ellipse(ctx, -3.2, 0.5, 1.6, 3, '#ffffffd9');
  ctx.strokeStyle = '#a7fff2';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.arc(0, 3, 5.5, 0.2, 1.65);
  ctx.stroke();
  ctx.restore();
}

/** Drawn once into a cached transparent texture, with the soil contact at y=80. */
export function paintMedicinalHerb(ctx: CanvasRenderingContext2D, kind: HerbKind) {
  ellipse(ctx, 80, 81, 32, 7, '#071e284d');
  ellipse(ctx, 80, 80, 25, 4, '#38493966');
  leaf(ctx, 73, 79, -1.1, 24, 7);
  leaf(ctx, 88, 80, 1.05, 27, 8);
  if (kind === 'linh_chi') {
    leaf(ctx, 96, 81, 0.7, 20, 6);
    stalk(ctx, 64, 79, 60, -3, 2.5);
    cap(ctx, 61, 59, 0.55, -0.2);
    stalk(ctx, 83, 81, 42, 1, 4);
    cap(ctx, 84, 42, 1, -0.08);
    stalk(ctx, 102, 82, 64, 2, 2.2);
    cap(ctx, 104, 63, 0.45, 0.16);
    ellipse(ctx, 67, 82, 6, 1.4, '#a4b56c99');
    ellipse(ctx, 94, 83, 8, 1.1, '#9db87488');
  } else {
    leaf(ctx, 78, 79, -0.7, 48, 13);
    leaf(ctx, 83, 80, 0.7, 42, 12);
    leaf(ctx, 80, 80, -0.08, 52, 15);
    dew(ctx, 79, 43, 9);
    dew(ctx, 58, 53, 5);
    dew(ctx, 103, 59, 4.3);
    ellipse(ctx, 89, 70, 1, 1, '#e6fff3');
    ellipse(ctx, 68, 70, 0.8, 0.8, '#e6fff3');
  }
}
