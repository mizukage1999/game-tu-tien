import type { MapDef } from '../maps/MapBuilder';
import type { Terrain } from './tiles';

export type WorldTheme = 'sect' | 'forest' | 'fire' | 'ice' | 'cave';
export function worldTheme(map: Pick<MapDef, 'id' | 'ambient'>): WorldTheme {
  if (['bi_canh_thach_linh', 'pb_u_minh', 'tu_van_phong'].includes(map.id)) return 'cave';
  if (map.ambient === 'snow') return 'ice';
  if (map.ambient === 'embers') return 'fire';
  if (['rung_linh_thu', 'linh_thu_lam', 'thanh_van_coc', 'u_minh_trach'].includes(map.id)) return 'forest';
  return 'sect';
}

export function worldTerrainPalette(map: Pick<MapDef, 'id' | 'ambient'>): Record<Terrain, number> {
  const theme = worldTheme(map);
  const palette = { grass: 0, flower: 0, stone: 4, path: 1, wall: 6, water: 3, platform: 4, dirt: 2, darkgrass: 5, bridge: -1, cave: 6, farmland: 7, marble: 4 };
  if (theme === 'forest') { palette.grass = 5; palette.flower = 5; palette.stone = 1; }
  if (theme === 'fire') {
    palette.grass = palette.darkgrass = palette.flower = palette.stone = palette.dirt = 9;
    palette.path = palette.platform = palette.marble = 6;
  }
  if (theme === 'ice') {
    palette.grass = palette.darkgrass = palette.flower = palette.stone = palette.dirt = 8;
    palette.path = palette.platform = palette.marble = 4;
  }
  if (theme === 'cave') {
    palette.grass = palette.darkgrass = palette.flower = palette.stone = palette.cave = 6;
    palette.path = palette.platform = palette.marble = 10;
  }
  if (map.id === 'vuong_gia_thon') palette.stone = 1;
  return palette;
}
