import { DUNGEONS, MONSTERS } from '../../data';
import { BESTIARY, speciesArt } from '../../data/bestiary';
import type { MapDef } from '../maps/MapBuilder';

/** Include every possible wave and boss on a shared dungeon map, not just its first wave. */
export function mapMonsterArt(map: MapDef) {
  const types = new Set(map.monsters.map((m) => m.type));
  if (map.arena)
    for (const dungeon of Object.values(DUNGEONS)) {
      if (dungeon.map !== map.id) continue;
      types.add(dungeon.boss);
      for (const wave of dungeon.waves) for (const spawn of wave) types.add(spawn.type);
    }
  return new Set(
    [...types].map((type) => MONSTERS[type]?.art).filter((art): art is string => !!art),
  );
}
export function monsterSheets(arts: ReadonlySet<string>) {
  return [
    ...new Set(
      BESTIARY.filter((species) => arts.has(speciesArt(species.id))).map(
        (species) => species.sheet,
      ),
    ),
  ];
}
