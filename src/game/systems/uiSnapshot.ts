import type { MinimapData } from '../../store/gameStore';

type Marker = { x: number; y: number; boss?: boolean; level?: number; name?: string };
const sameMarkers = (a: Marker[], b: Marker[]) =>
  a.length === b.length &&
  a.every((p, i) => {
    const q = b[i];
    return (
      p.x === q.x && p.y === q.y && p.boss === q.boss && p.level === q.level && p.name === q.name
    );
  });

/** A fresh array is not a visual change. Keep the minimap canvas idle while standing still. */
export function sameMinimap(a: MinimapData, b: MinimapData) {
  return (
    a.player.x === b.player.x &&
    a.player.y === b.player.y &&
    sameMarkers(a.monsters, b.monsters) &&
    sameMarkers(a.npcs, b.npcs) &&
    sameMarkers(a.loot, b.loot)
  );
}
