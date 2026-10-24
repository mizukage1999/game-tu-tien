import type { MapDef } from '../maps/MapBuilder';
import { buildMaterialGround } from './villageGround';
import { worldTerrainPalette, worldTheme } from './worldPalette';
import { iso } from './iso';
import { TILE } from './tiles';

export function buildWorldGround(map: MapDef, source: HTMLImageElement) {
  const palette = worldTerrainPalette(map), theme = worldTheme(map);
  const ground = buildMaterialGround(map, source, {
    columns: 4, rows: 3, palette, meadow: palette.grass,
    dirt: palette.dirt, bank: theme === 'sect' || theme === 'forest' ? 11 : 6,
    cool: ['ice', 'cave'].includes(theme),
  });
  if (['dai_thua_vien', 'linh_son_tong'].includes(map.id)) {
    const ctx = ground.canvas.getContext('2d')!;
    const at = iso(24 * TILE, (map.id === 'dai_thua_vien' ? 18 : 20) * TILE);
    ctx.save(); ctx.translate(at.x, at.y); ctx.scale(1, .5);
    ctx.fillStyle = 'rgba(11, 31, 46, .12)'; ctx.strokeStyle = 'rgba(218, 197, 147, .52)'; ctx.lineWidth = 3;
    for (const r of [150, 141, 68]) { ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(0, 0, 140, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  return ground;
}
