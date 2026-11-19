import { heroFor } from '../data/heroes';
import startup from '../data/startupAssets.json';
import type { SaveData } from '../game/systems/save';
import { isChildhood } from '../game/systems/origin';
import { warmImages, warmVillageStartup, type ResourceProgress } from '../game/art/startupCache';

/** Called only after account hydration; never preload another account's character. */
export function prepareEntryResources(
  save: SaveData | null,
  report: (progress: ResourceProgress) => void,
) {
  const hero = heroFor(save?.player ?? {}).id;
  const child = save ? isChildhood(save.player) : true;
  if (!save || save.mapId === 'vuong_gia_thon') return warmVillageStartup(hero, child, report);
  // A returning player outside the village must not download an unused village.
  // That destination's map pack stays owned by its normal scene loader.
  return warmImages(
    [(startup.urls as Record<string, string>)[`hero-${child ? 'child' : 'adult'}-${hero}`]],
    report,
  );
}
