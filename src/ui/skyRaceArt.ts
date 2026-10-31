import { optimizedAsset } from '../data/assetDelivery';
import { SKY_LENGTH, type SkyRaceEngine } from '../game/systems/skyRace';
export const SKY_ART = optimizedAsset('/assets/ui/sky-race-v1.png');
// Actual row bounds of the generated atlas; the source artwork remains unchanged.
export const SKY_ROWS = [
  [0, 190],
  [194, 200],
  [400, 200],
  [608, 180],
  [804, 86],
  [891, 195],
] as const;
export function drawSkySprite(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  cell: number,
  x: number,
  y: number,
  size: number,
) {
  const w = image.naturalWidth / 8,
    [top, h] = SKY_ROWS[Math.floor(cell / 8)];
  ctx.drawImage(image, (cell % 8) * w, top, w, h, x - size / 2, y - size / 2, size, size);
}
export function drawSkyRace(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  race: SkyRaceEngine,
  width: number,
  height: number,
  axis: number,
  blend: number,
) {
  const alpha = Math.max(0, Math.min(1, blend));
  const distance = Math.min(
    SKY_LENGTH,
    race.phase === 'flying'
      ? race.previousDistance + (race.distance - race.previousDistance) * alpha
      : race.distance,
  );
  const riderX =
    race.phase === 'flying' ? race.previousX + (race.x - race.previousX) * alpha : race.x;
  const py = height * 0.72,
    scale = 0.32,
    at = (x: number, y: number) => ({
      x: width * 0.5 + x * width * 0.31,
      y: py - (y - distance) * scale,
    });
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#0c2649');
  bg.addColorStop(0.52, '#4c8aab');
  bg.addColorStop(1, '#c5e3e4');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  // Only visible scenery is drawn; the atlas is reused without allocating particles or textures.
  for (let i = -2; i < 15; i++) {
    const y =
      ((((i * 173 + distance * 0.11) % (height + 250)) + height + 250) % (height + 250)) - 100;
    const left = i % 2 === 0,
      x = left ? width * 0.07 : width * 0.93;
    ctx.globalAlpha = 0.7;
    drawSkySprite(ctx, image, 40 + ((i + 16) % 8), x, y, 155 + (i % 3) * 25);
  }
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#e2f5ff35';
  ctx.setLineDash([8, 16]);
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(width * 0.5 + side * width * 0.31, 0);
    ctx.lineTo(width * 0.5 + side * width * 0.31, height);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  for (const [i, g] of race.gates.entries()) {
    const p = at(g.x, g.y),
      h = at(g.hazardX, g.y - 220),
      orb = at(g.x, g.y - 110);
    if (p.y < -200 || h.y > height + 200) continue;
    ctx.globalAlpha = i < race.gate ? 0.45 : 1;
    drawSkySprite(ctx, image, i < race.gate ? 15 : 8 + (i === 8 ? 6 : i % 6), p.x, p.y, 136);
    ctx.globalAlpha = 1;
    ctx.font = '600 12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f7e6bc';
    ctx.strokeStyle = '#091d32';
    ctx.lineWidth = 3;
    const label = i === 8 ? 'THIÊN MÔN · ĐÍCH' : `THIÊN QUAN ${i + 1}`;
    ctx.strokeText(label, p.x, p.y - 69);
    ctx.fillText(label, p.x, p.y - 69);
    ctx.globalAlpha = race.obstacles.has(i) ? 0.45 : 1;
    drawSkySprite(ctx, image, 16 + g.hazard, h.x, h.y, 100);
    ctx.globalAlpha = 1;
    if (!race.pickups.has(i))
      drawSkySprite(
        ctx,
        image,
        g.orb === 3 ? 28 : 24 + g.orb,
        orb.x,
        orb.y,
        57 + Math.sin(race.elapsed / 180 + i) * 3,
      );
  }
  const player = at(riderX, distance);
  const direction = axis < -0.2 ? 3 : axis > 0.2 ? 5 : 4;
  ctx.save();
  ctx.translate(player.x, py + 26);
  ctx.rotate(-Math.PI / 2);
  ctx.globalAlpha = race.elapsed < race.boostUntil ? 0.8 : 0.45;
  drawSkySprite(
    ctx,
    image,
    32 + (Math.floor(race.elapsed / 90) % 8),
    0,
    0,
    race.elapsed < race.boostUntil ? 150 : 100,
  );
  ctx.restore();
  if (race.shields) {
    ctx.strokeStyle = '#96edff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(player.x, py, 40, 53, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  drawSkySprite(ctx, image, direction, player.x, py - 9 + Math.sin(race.elapsed / 210) * 2, 112);
  if (race.elapsed < race.flashUntil) {
    ctx.fillStyle = '#ff665c26';
    ctx.fillRect(0, 0, width, height);
  }
}
