import { MapBuilder } from './MapBuilder';
import { activityMonster, ruinRooms } from '../systems/worldActivities';
export function ancientRuins(seed: number, level = 30) {
  const b = new MapBuilder(32, 22, 'wall', seed),
    r = ruinRooms(seed);
  for (let n = 0; n < 24; n++) {
    const p = r.center(n);
    b.fill(p.x - 1, p.y - 1, 3, 3, 'cave');
  }
  for (const [a, c] of r.edges) {
    const p = r.center(a),
      q = r.center(c);
    b.fill(
      Math.min(p.x, q.x),
      Math.min(p.y, q.y),
      Math.abs(p.x - q.x) + 1,
      Math.abs(p.y - q.y) + 1,
      'stone',
    );
  }
  const points = [
    {
      id: 'activity_exit',
      name: 'Rời động phủ',
      ...r.center(0),
      text: 'Trở về tông môn.',
      repeatable: true,
    },
    ...r.switches.map((n, i) => ({
      id: `activity_seal_${i}`,
      name: `Phá phong ấn ${i + 1}`,
      text: 'Phá một phong ấn bảo vệ cổ thú.',
      ...r.center(n),
    })),
    ...r.treasures.map((n, i) => ({
      id: `activity_cache_${i}`,
      name: 'Rương cổ',
      text: 'Tìm được kho báu.',
      ...r.center(n),
    })),
    {
      id: 'activity_reward',
      name: 'Bảo vật cổ đại',
      text: 'Nhận thưởng sau khi hạ cổ thú.',
      ...r.center(23),
    },
  ];
  return b.build({
    id: `activity_ruins_${seed}`,
    name: 'Động Phủ Viễn Cổ',
    description: 'Mê cung cổ · phá hai phong ấn để đánh thức cổ thú',
    private: true,
    requiresAdmission: true,
    playerSpawn: [3, 3],
    monsters: [{ type: activityMonster(level, 'ruins'), ...r.center(23) }],
    npcs: [],
    zones: [],
    portals: [],
    points,
    ambient: 'fireflies',
  });
}
