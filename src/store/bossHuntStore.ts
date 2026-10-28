import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { BossEntry } from '../data/bossCatalog';

export interface BossSighting {
  id: string;
  type: string;
  homeX: number;
  homeY: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  respawnAt: number;
  generation: number;
}
export interface HuntSnapshot {
  mapId: string;
  sightings: BossSighting[];
}
export const bossHuntStore = createStore<HuntSnapshot>(() => ({ mapId: '', sightings: [] }));
export const useBossSightings = () => useStore(bossHuntStore);
export function publishBossSightings(next: HuntSnapshot) {
  const previous = bossHuntStore.getState();
  if (JSON.stringify(previous) !== JSON.stringify(next)) bossHuntStore.setState(next);
}
/** A different map is unknown; never invent a world-wide live timer. */
export function bossSighting(entry: BossEntry, snapshot: HuntSnapshot, here: string) {
  if (snapshot.mapId !== entry.mapId || here !== entry.mapId) return undefined;
  return snapshot.sightings
    .filter((s) => s.type === entry.type)
    .sort(
      (a, b) =>
        Math.hypot(a.homeX - (entry.x + 0.5) * 48, a.homeY - (entry.y + 0.5) * 48) -
        Math.hypot(b.homeX - (entry.x + 0.5) * 48, b.homeY - (entry.y + 0.5) * 48),
    )[0];
}
export function bossStatus(sighting: BossSighting | undefined, now: number) {
  if (!sighting) return { label: 'Chưa dò khu vực', tone: 'unknown', remaining: 0 };
  if (sighting.alive)
    return {
      label: sighting.hp < sighting.maxHp ? 'Đang giao chiến' : 'Đã xuất hiện',
      tone: 'alive',
      remaining: 0,
    };
  return {
    label: sighting.respawnAt > now ? 'Đang hồi sinh' : 'Chờ xuất hiện',
    tone: 'waiting',
    remaining: Math.max(0, sighting.respawnAt - now),
  };
}
