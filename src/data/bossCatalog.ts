import { DUNGEONS, MONSTERS, type MonsterDef } from './index';
import { DUNGEON_CATALOG, dungeonVariant, type DungeonEntry } from './dungeonCatalog';
import { speciesForArt } from './bestiary';
import { getMap, MAP_IDS } from '../game/maps';
import { FIELD_BANDS } from '../game/systems/scale';

export type BossCategory = 'world' | 'elite' | 'personal' | 'sect' | 'event';
export const BOSS_CATEGORIES = [
  ['world', 'Thế giới'],
  ['elite', 'Tinh anh'],
  ['personal', 'Cá nhân'],
  ['sect', 'Tông môn'],
  ['event', 'Sự kiện'],
] as const;
export interface BossEntry {
  key: string;
  category: BossCategory;
  type: string;
  mapId: string;
  x: number;
  y: number;
  dungeon?: DungeonEntry;
}
let catalog: BossEntry[] | undefined;
let pending: Promise<BossEntry[]> | undefined;
function* buildCatalog(): Generator<void, BossEntry[]> {
  const entries: BossEntry[] = [];
  for (const mapId of MAP_IDS) {
    const map = getMap(mapId);
    if (map.arena || map.private) {
      yield;
      continue;
    }
    const seen = new Set<string>();
    for (const spawn of map.monsters) {
      if (seen.has(spawn.type)) continue;
      seen.add(spawn.type);
      const def = MONSTERS[spawn.type],
        species = speciesForArt(def.art);
      const category = def.boss
        ? 'world'
        : species?.sheet === 'elite' || FIELD_BANDS.some((b) => b.elite === spawn.type)
          ? 'elite'
          : null;
      if (category)
        entries.push({
          key: `${mapId}:${spawn.type}`,
          category,
          type: spawn.type,
          mapId,
          x: spawn.x,
          y: spawn.y,
        });
    }
    yield;
  }
  for (const dungeon of DUNGEON_CATALOG) {
    const def = DUNGEONS[dungeonVariant(dungeon)],
      map = getMap(def.map);
    entries.push({
      key: `personal:${dungeon.key}`,
      category: 'personal',
      type: def.boss,
      mapId: def.map,
      x: map.arena?.boss[0] ?? 0,
      y: map.arena?.boss[1] ?? 0,
      dungeon,
    });
  }
  return entries.sort(
    (a, b) => MONSTERS[a.type].level - MONSTERS[b.type].level || a.key.localeCompare(b.key),
  );
}
/** Synchronous access for data tools; live UI uses the yielding loader below. */
export function bossCatalog(): BossEntry[] {
  if (catalog) return catalog;
  const work = buildCatalog();
  let next = work.next();
  while (!next.done) next = work.next();
  catalog = next.value;
  return catalog;
}
export function cachedBossCatalog() {
  return catalog ?? null;
}
/** Keep cold map generation out of the click/render task. Share one in-flight build. */
export function loadBossCatalog(): Promise<BossEntry[]> {
  if (catalog) return Promise.resolve(catalog);
  if (pending) return pending;
  const yieldTurn = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
  pending = (async () => {
    const work = buildCatalog();
    let next: IteratorResult<void, BossEntry[]>;
    do {
      await yieldTurn();
      if (catalog) return catalog;
      next = work.next();
    } while (!next.done);
    catalog = next.value;
    return catalog;
  })().finally(() => {
    pending = undefined;
  });
  return pending;
}
export function bossTheme(def: MonsterDef): {
  art: number;
  color: string;
  element: string;
  x: number;
  y: number;
} {
  const id = speciesForArt(def.art)?.id ?? def.art;
  if (/hoa|ma_ton|kim_o|fire/.test(id))
    return /kim_o/.test(id)
      ? { art: 4, color: '#f5c568', element: 'Kim · Lôi', x: 79, y: 78 }
      : { art: 1, color: '#f38568', element: 'Hỏa', x: 78, y: 26 };
  if (/bang|cuu_vi|tuyet|frost/.test(id))
    return { art: 2, color: '#87d8ff', element: 'Băng', x: 25, y: 24 };
  if (/moc|co_thu|kinh_nguu/.test(id))
    return { art: 3, color: '#7bdbb2', element: 'Mộc', x: 46, y: 50 };
  if (/loi|long_than|thien_lang/.test(id))
    return { art: 4, color: '#f5d185', element: 'Lôi', x: 79, y: 78 };
  return { art: 5, color: '#cd9cff', element: 'U Minh', x: 25, y: 77 };
}
