import { DUNGEONS, MONSTERS, NPCS, QUESTS, ZONE_NAMES } from '../../data';
import type { Objective, QuestDef } from '../../data';
import { getMap, MAP_IDS } from '../maps';
import type { MapDef, PortalDef } from '../maps/MapBuilder';
import { canEnterField, fieldForLevel } from './scale';
import { findPath, type Tile } from './path';
import type { QuestLog, QuestProgress } from './quest';

export interface QuestStop {
  mapId: string;
  tile: Tile;
  label: string;
  talkTo?: string;
  meditate?: boolean;
  monsterType?: string;
  inside?: [number, number, number, number];
}

export type QuestNav =
  | { kind: 'go'; stop: QuestStop }
  | { kind: 'menu'; menu: 'skills'; label: string }
  | { kind: 'toast'; text: string };

export type MapRoute =
  | { kind: 'path'; tiles: Tile[] }
  | { kind: 'there' }
  | { kind: 'wait' }
  | { kind: 'fail'; text: string };

let pendingQuest: string | null = null;

export function trackQuest(id: string | null) {
  pendingQuest = id;
}

export function trackedQuest() {
  return pendingQuest;
}

function canVisit(mapId: string, level: number) {
  const map = getMap(mapId);
  if (map.arena) return false;
  if (!map.level) return true;
  return canEnterField(level, map.level).ok;
}

function lockedText(mapId: string) {
  const map = getMap(mapId);
  if (map.level) return `${map.name} chỉ mở cho cấp ${map.level.min}-${map.level.max}.`;
  return 'Không tới được chỗ này.';
}

function npcAt(id: string) {
  for (const mapId of MAP_IDS) {
    const n = getMap(mapId).npcs.find((npc) => npc.id === id);
    if (n) return { mapId, x: n.x, y: n.y };
  }
  return null;
}

function monsterSpawns(type: string) {
  const out: { mapId: string; x: number; y: number }[] = [];
  for (const mapId of MAP_IDS) {
    const map = getMap(mapId);
    if (map.arena) continue;
    for (const s of map.monsters) if (s.type === type) out.push({ mapId, x: s.x, y: s.y });
  }
  return out;
}

function pickSpawn(type: string, level: number, here: string, from?: Tile): QuestNav {
  const spawns = monsterSpawns(type);
  const open = spawns.filter((s) => canVisit(s.mapId, level));
  if (!open.length) {
    return { kind: 'toast', text: spawns[0] ? lockedText(spawns[0].mapId) : 'Không thấy quái này trên bản đồ.' };
  }
  const local = open.filter((s) => s.mapId === here);
  const pool = local.length ? local : open;
  const origin = from ?? { x: 0, y: 0 };
  const spot = pool.reduce((best, s) => {
    const d = Math.hypot(s.x - origin.x, s.y - origin.y);
    return d < best.d ? { s, d } : best;
  }, { s: pool[0], d: Infinity }).s;
  return {
    kind: 'go',
    stop: { mapId: spot.mapId, tile: { x: spot.x, y: spot.y }, label: MONSTERS[type]?.name ?? type, monsterType: type },
  };
}

function goNpc(id: string, level: number, label: string): QuestNav {
  const at = npcAt(id);
  if (!at) return { kind: 'toast', text: 'Không thấy người này trên bản đồ.' };
  if (!canVisit(at.mapId, level)) return { kind: 'toast', text: lockedText(at.mapId) };
  const name = NPCS[id]?.name ?? label;
  return { kind: 'go', stop: { mapId: at.mapId, tile: { x: at.x, y: at.y }, label: name, talkTo: id } };
}

function goZone(zoneId: string, level: number, meditate: boolean): QuestNav {
  for (const mapId of MAP_IDS) {
    const map = getMap(mapId);
    if (map.id === zoneId) {
      if (!canVisit(mapId, level)) return { kind: 'toast', text: lockedText(mapId) };
      const [x, y] = map.playerSpawn;
      return { kind: 'go', stop: { mapId, tile: { x, y }, label: ZONE_NAMES[zoneId] ?? map.name } };
    }
    const zone = map.zones.find((z) => z.id === zoneId);
    if (!zone) continue;
    if (!canVisit(mapId, level)) return { kind: 'toast', text: lockedText(mapId) };
    const [x, y, w, h] = zone.rect;
    return {
      kind: 'go',
      stop: {
        mapId,
        tile: { x: x + Math.floor(w / 2), y: y + Math.floor(h / 2) },
        label: zone.name,
        meditate,
        inside: zone.rect,
      },
    };
  }
  return { kind: 'toast', text: 'Không thấy địa điểm này.' };
}

function aimOf(def: QuestDef, q: QuestProgress): Objective | 'turnin' {
  if (q.status === 'ready') return 'turnin';
  const i = def.objectives.findIndex((o, idx) => (q.progress[idx] ?? 0) < o.count);
  return def.objectives[Math.max(0, i)] ?? 'turnin';
}

export function questDestination(id: string, log: QuestLog, level: number, here: string, from?: Tile): QuestNav {
  const def = QUESTS[id];
  const q = log[id];
  if (!def || !q) return { kind: 'toast', text: 'Không thấy nhiệm vụ.' };
  if (q.status === 'done') return { kind: 'toast', text: 'Nhiệm vụ này đã hoàn thành.' };
  if (q.status === 'ready') {
    if (!def.turnIn) return { kind: 'toast', text: 'Nhiệm vụ đã xong.' };
    return goNpc(def.turnIn, level, def.name);
  }
  const aim = aimOf(def, q);
  if (aim === 'turnin') return { kind: 'toast', text: 'Nhiệm vụ đã xong.' };
  switch (aim.type) {
    case 'talk':
      return goNpc(aim.npc, level, def.name);
    case 'kill':
      return pickSpawn(aim.target, level, here, from);
    case 'collect': {
      const type = Object.entries(MONSTERS).find(([, m]) => m.loot.some((l) => l.item === aim.item))?.[0];
      if (!type) return { kind: 'toast', text: 'Hãy nhặt vật phẩm này khi đánh quái.' };
      return pickSpawn(type, level, here, from);
    }
    case 'enterZone':
      return goZone(aim.zone, level, false);
    case 'meditate':
      return goZone(aim.zone, level, true);
    case 'reachLevel':
      return goZone('linh_dai', level, true);
    case 'upgradeSkill':
      return { kind: 'menu', menu: 'skills', label: 'Kỹ Năng' };
    case 'clearDungeon':
      return goNpc('su_huynh', level, DUNGEONS[aim.dungeon]?.name ?? 'Phó bản');
  }
}

function walkGrid(map: MapDef): boolean[][] {
  const grid = map.blocked.map((row) => row.slice());
  for (const n of map.npcs) if (grid[n.y]) grid[n.y][n.x] = true;
  return grid;
}

function portalTile(p: PortalDef): Tile {
  const [x, y, w, h] = p.rect;
  return { x: x + Math.floor((w - 1) / 2), y: y + Math.floor((h - 1) / 2) };
}

function portalToward(map: MapDef, destMap: string, level: number): PortalDef | null {
  for (const p of map.portals) {
    if (p.levelBand && fieldForLevel(level).id === destMap) return p;
    if (!p.levelBand && p.to === destMap) return p;
  }
  return map.portals.find((p) => p.to === 'dai_thua_vien') ?? map.portals[0] ?? null;
}

function inside(tile: Tile, rect: [number, number, number, number]) {
  const [x, y, w, h] = rect;
  return tile.x >= x && tile.y >= y && tile.x < x + w && tile.y < y + h;
}

/** Next tiles on the current map: the goal itself, or the portal that leads toward it. */
export function routeOnMap(map: MapDef, from: Tile, stop: QuestStop, level: number): MapRoute {
  const grid = walkGrid(map);
  if (stop.mapId === map.id) {
    if (stop.inside && inside(from, stop.inside)) return { kind: 'there' };
    const path = findPath(grid, from.x, from.y, stop.tile.x, stop.tile.y, stop.talkTo || stop.monsterType || stop.meditate ? 1 : 0);
    if (!path.reached) return { kind: 'fail', text: 'Không tìm được đường.' };
    if (path.tiles.length === 0) return { kind: 'there' };
    return { kind: 'path', tiles: path.tiles };
  }
  const portal = portalToward(map, stop.mapId, level);
  if (!portal) return { kind: 'fail', text: 'Không có đường tới đó.' };
  const tile = portalTile(portal);
  const path = findPath(grid, from.x, from.y, tile.x, tile.y, 0);
  if (!path.reached) return { kind: 'fail', text: 'Không tìm được đường ra cổng.' };
  if (path.tiles.length === 0) return { kind: 'wait' };
  return { kind: 'path', tiles: path.tiles };
}
