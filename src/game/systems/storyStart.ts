import { QUESTS } from '../../data';
import { acceptQuest } from './quest';
import type { SaveData } from './save';

/** Existing heroes enter the new opening once, retaining their earned progress. */
export function startVillageChapter(save: SaveData): SaveData {
  if (save.player.origin) return save;
  return {
    ...save,
    player: {
      ...save.player,
      origin: 'vuong_gia_thon',
      admitted: false,
      world: {
        interactions: { ...save.player.world?.interactions },
        discovered: [...new Set([...(save.player.world?.discovered ?? []), 'vuong_gia_thon'])],
      },
    },
    quests: acceptQuest(save.quests, QUESTS, 'village_0', { level: save.player.level }),
    mapId: 'vuong_gia_thon',
    pos: null,
  };
}
