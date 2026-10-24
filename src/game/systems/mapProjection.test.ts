import { describe, expect, it } from 'vitest';
import { MAP_IDS, getMap } from '../maps';
import { overviewPoint, overviewTile } from './mapProjection';
import { TILE } from '../art/tiles';

describe('painted map coordinates', () => {
  it('maps a click back to the exact source tile across map sizes and mobile aspect ratios', () => {
    for (const id of MAP_IDS) {
      const map = getMap(id);
      for (const [width, height] of [[640, 420], [1000, 400], [320, 180]]) {
        for (const [x, y] of [[0, 0], map.playerSpawn, [map.width - 1, map.height - 1], ...map.npcs.map(n => [n.x, n.y])]) {
          const p = overviewPoint(map, (x + .5) * TILE, (y + .5) * TILE, width, height);
          expect(overviewTile(map, p.x, p.y, width, height), `${id} ${x},${y}`).toEqual({ x, y });
        }
      }
    }
  });
  it('ignores clicks in the illustrated sky outside the map diamond', () => {
    const map = getMap('vuong_gia_thon');
    for (const [x, y] of [[0, 0], [639, 0], [0, 419], [639, 419]]) expect(overviewTile(map, x, y, 640, 420)).toBeNull();
  });
});
