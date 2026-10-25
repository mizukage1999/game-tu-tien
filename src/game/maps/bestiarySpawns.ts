import { BESTIARY_HABITATS, BESTIARY_MONSTERS } from '../../data/bestiary';
import type { MapDef } from './MapBuilder';
import { herbNodes } from '../systems/immortal';

/** Add wildlife only on reachable, spacious ground away from entrances and quest stops. */
export function populateBestiary(map: MapDef): MapDef {
  const roster = BESTIARY_HABITATS[map.id];
  if (!roster || map.arena || map.private) return map;
  const blocked = map.blocked.map((row) => row.slice());
  for (const n of map.npcs) blocked[n.y][n.x] = true;
  const [sx, sy] = map.playerSpawn,
    reachable = new Set([`${sx},${sy}`]),
    queue = [[sx, sy]];
  for (let i = 0; i < queue.length; i++) {
    const [x, y] = queue[i];
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx,
        ny = y + dy,
        key = `${nx},${ny}`;
      if (
        nx < 0 ||
        ny < 0 ||
        nx >= map.width ||
        ny >= map.height ||
        blocked[ny][nx] ||
        reachable.has(key)
      )
        continue;
      reachable.add(key);
      queue.push([nx, ny]);
    }
  }
  const protectedStops = [
    ...map.npcs,
    ...(map.points ?? []),
    ...herbNodes(map.id),
    ...map.portals.map((p) => ({ x: p.rect[0] + p.rect[2] / 2, y: p.rect[1] + p.rect[3] / 2 })),
  ];
  const monsters = map.monsters.slice();
  roster.forEach((type, i) => {
    const boss = !!BESTIARY_MONSTERS[type].boss;
    const tx = map.width * (0.38 + ((i * 0.31) % 0.48)),
      ty = map.height * (0.22 + ((i * 0.27) % 0.58));
    const candidates = queue.filter(([x, y]) => {
      if (
        x < 2 ||
        y < 2 ||
        x >= map.width - 2 ||
        y >= map.height - 2 ||
        Math.hypot(x - sx, y - sy) < 8
      )
        return false;
      if (protectedStops.some((p) => Math.hypot(x - p.x, y - p.y) < 5)) return false;
      if (monsters.some((p) => Math.hypot(x - p.x, y - p.y) < (boss ? 5 : 2.5))) return false;
      return (
        !boss ||
        [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ].every(([dx, dy]) => !blocked[y + dy][x + dx])
      );
    });
    candidates.sort((a, b) => Math.hypot(a[0] - tx, a[1] - ty) - Math.hypot(b[0] - tx, b[1] - ty));
    if (candidates[0]) monsters.push({ type, x: candidates[0][0], y: candidates[0][1] });
  });
  return { ...map, monsters };
}
