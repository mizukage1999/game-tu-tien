import type { MapDef } from '../maps/MapBuilder';
import { TILE } from '../art/tiles';

type MapSize = Pick<MapDef, 'width' | 'height'>;
export function mapArtSize(map: MapSize) {
  return { width: (map.width + map.height) * TILE + 32, height: (map.width + map.height) * TILE / 2 + 58 };
}

/** Independent of the active scene's global isometric origin. */
export function mapArtPoint(map: MapSize, x: number, y: number) {
  return { x: map.height * TILE + 16 + x - y, y: 16 + (x + y) / 2 };
}

export function overviewFrame(map: MapSize, width: number, height: number) {
  const size = mapArtSize(map), scale = Math.min(width / size.width, height / size.height);
  return { scale, x: (width - size.width * scale) / 2, y: (height - size.height * scale) / 2, width: size.width * scale, height: size.height * scale };
}

export function overviewPoint(map: MapSize, x: number, y: number, width: number, height: number) {
  const f = overviewFrame(map, width, height), p = mapArtPoint(map, x, y);
  return { x: f.x + p.x * f.scale, y: f.y + p.y * f.scale };
}

/** Reject the sky outside the diamond instead of walking to a different tile. */
export function overviewTile(map: MapSize, x: number, y: number, width: number, height: number) {
  const f = overviewFrame(map, width, height);
  const dx = (x - f.x) / f.scale - map.height * TILE - 16, dy = (y - f.y) / f.scale - 16;
  const mx = dy + dx / 2, my = dy - dx / 2;
  if (mx < 0 || my < 0 || mx >= map.width * TILE || my >= map.height * TILE) return null;
  return { x: Math.floor(mx / TILE), y: Math.floor(my / TILE) };
}
