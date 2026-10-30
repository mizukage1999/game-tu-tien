import { FIELD_BANDS } from './scale';
import { seeded } from '../art/canvas';
import { optimizedAsset } from '../../data/assetDelivery';
export type ActivityKind = 'treasure' | 'ruins';
export const ACTIVITY_PERIOD = 3 * 60 * 60 * 1000;
export const ACTIVITY_ART = optimizedAsset('/assets/ui/world-activities-v1.png');
export interface ActivityPlan {
  kind: ActivityKind;
  id: string;
  start: number;
  end: number;
  next: number;
  open: boolean;
  seed: number;
  mapId: string;
  level: number;
  name: string;
}
export function activityPlan(kind: ActivityKind, now = Date.now()): ActivityPlan {
  const shift = 7 * 3600000,
    offset = kind === 'ruins' ? 3600000 : 0;
  const start =
    Math.floor((now + shift - offset) / ACTIVITY_PERIOD) * ACTIVITY_PERIOD - shift + offset;
  const seed = Math.floor(start / 1000),
    end = start + (kind === 'ruins' ? 40 : 25) * 60000;
  const band = FIELD_BANDS[Math.floor(seeded(seed)() * FIELD_BANDS.length)];
  return {
    kind,
    id: `${kind}:${seed}`,
    start,
    end,
    next: start + ACTIVITY_PERIOD,
    open: now >= start && now < end,
    seed,
    mapId: kind === 'ruins' ? `activity_ruins_${seed}` : band.id,
    level: Math.ceil((band.minLevel + band.maxLevel) / 20) * 10,
    name: kind === 'ruins' ? 'Động Phủ Viễn Cổ' : 'Thiên Giáng Dị Bảo',
  };
}
export function activityMonster(level: number, kind: ActivityKind) {
  return `activity_${kind}_${Math.max(10, Math.min(120, Math.ceil(level / 10) * 10))}`;
}
export function ruinRooms(seed: number) {
  const rng = seeded(seed),
    visited = new Set([0]),
    edges: [number, number][] = [];
  const visit = (cell: number) => {
    const x = cell % 6,
      y = Math.floor(cell / 6),
      neighbors = [
        x > 0 ? cell - 1 : -1,
        x < 5 ? cell + 1 : -1,
        y > 0 ? cell - 6 : -1,
        y < 3 ? cell + 6 : -1,
      ].filter((n) => n >= 0);
    const shuffled = neighbors.map((n) => ({ n, r: rng() })).sort((a, b) => a.r - b.r);
    for (const { n } of shuffled)
      if (!visited.has(n)) {
        visited.add(n);
        edges.push([cell, n]);
        visit(n);
      }
  };
  visit(0);
  return {
    edges,
    center: (n: number) => ({ x: 3 + (n % 6) * 5, y: 3 + Math.floor(n / 6) * 5 }),
    switches: [7, 16],
    treasures: [11, 20],
    traps: [4, 8, 12, 15, 18, 22],
  };
}
