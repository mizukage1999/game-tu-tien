import assets from './startupAssets.json';
import type { HeroId } from './heroes';
import { optimizedAsset } from './assetDelivery';

export const GROUND_PREFIX = 'ground:active';
export const VILLAGE_STARTUP_TEXTURE = 'village-startup';
export const villageGroundTexture = (key: string) => `${GROUND_PREFIX}:village:${key}`;
export const preparedHeroTexture = (id: HeroId, child: boolean) =>
  `hero-v8-${id}${child ? '-child' : ''}`;

/** Plain data: usable on the entry screen without importing the game renderer. */
export function villageStartupImages(id: HeroId, child: boolean) {
  const urls = assets.urls as Record<string, string>;
  return [
    { key: VILLAGE_STARTUP_TEXTURE, url: urls.village },
    ...assets.groundPages.map((page) => ({
      key: villageGroundTexture(page.key),
      url: urls[page.key],
    })),
    { key: 'village-dawn-v3', url: optimizedAsset('/assets/maps/village-dawn-v3.png') },
    { key: preparedHeroTexture(id, child), url: urls[`hero-${child ? 'child' : 'adult'}-${id}`] },
  ];
}
