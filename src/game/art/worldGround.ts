import type { MapDef } from '../maps/MapBuilder';
import { buildMaterialGround } from './villageGround';
import { worldTerrainPalette, worldTheme } from './worldPalette';
import { iso } from './iso';
import { TILE } from './tiles';

export function buildWorldGround(map: MapDef, source: HTMLImageElement) {
  const palette = worldTerrainPalette(map),
    theme = worldTheme(map);
  const ground = buildMaterialGround(map, source, {
    columns: 4,
    rows: 3,
    palette,
    meadow: palette.grass,
    dirt: palette.dirt,
    bank: theme === 'sect' || theme === 'forest' ? 11 : 6,
    cool: ['ice', 'cave'].includes(theme),
  });
  if (map.id.startsWith('activity_ruins_')) {
    // Bake low stone walls once, making the maze's collision boundaries readable.
    const ctx = ground.canvas.getContext('2d')!,
      walls: { x: number; y: number }[] = [];
    map.blocked.forEach((row, y) =>
      row.forEach((blocked, x) => {
        if (blocked) walls.push({ x, y });
      }),
    );
    const polygon = (points: { x: number; y: number }[], color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      points.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.closePath();
      ctx.fill();
    };
    for (const { x, y } of walls.sort((a, b) => a.x + a.y - b.x - b.y)) {
      const p = iso((x + 0.5) * TILE, (y + 0.5) * TILE),
        h = 14;
      const top = { x: p.x, y: p.y - TILE / 2 - h },
        right = { x: p.x + TILE, y: p.y - h },
        bottom = { x: p.x, y: p.y + TILE / 2 - h },
        left = { x: p.x - TILE, y: p.y - h };
      polygon(
        [left, bottom, { x: bottom.x, y: bottom.y + h }, { x: left.x, y: left.y + h }],
        '#0b202b',
      );
      polygon(
        [bottom, right, { x: right.x, y: right.y + h }, { x: bottom.x, y: bottom.y + h }],
        '#102c38',
      );
      polygon([top, right, bottom, left], (x + y) % 2 ? '#274653' : '#203d49');
      ctx.save();
      ctx.translate(p.x, p.y - h);
      ctx.transform(1, 0.5, -1, 0.5, 0, 0);
      ctx.drawImage(
        source,
        ((palette.wall % 4) * source.width) / 4,
        (Math.floor(palette.wall / 4) * source.height) / 3,
        source.width / 4,
        source.height / 3,
        -TILE / 2,
        -TILE / 2,
        TILE,
        TILE,
      );
      ctx.restore();
      ctx.strokeStyle = '#75bcc936';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  if (['dai_thua_vien', 'linh_son_tong'].includes(map.id)) {
    const ctx = ground.canvas.getContext('2d')!;
    const at = iso(24 * TILE, (map.id === 'dai_thua_vien' ? 18 : 20) * TILE);
    ctx.save();
    ctx.translate(at.x, at.y);
    ctx.scale(1, 0.5);
    ctx.fillStyle = 'rgba(11, 31, 46, .12)';
    ctx.strokeStyle = 'rgba(218, 197, 147, .52)';
    ctx.lineWidth = 3;
    for (const r of [150, 141, 68]) {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 140, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  return ground;
}
