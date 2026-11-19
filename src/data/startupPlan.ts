import assets from './startupAssets.json';
import type { HeroId } from './heroes';
import { optimizedAsset } from './assetDelivery';

export const GROUND_PREFIX = 'ground:active';
export const VILLAGE_STARTUP_TEXTURE = 'village-startup';
export const villageGroundTexture = (key: string) => `${GROUND_PREFIX}:village:${key}`;
export const preparedHeroTexture = (id: HeroId, child: boolean) =>
  `hero-v8-${id}${child ? '-child' : ''}`;

/** The entry preloader and Phaser use the same keys/URLs, avoiding a second download. */
export const CORE_STARTUP_IMAGES = [
  { key: 'immortal-thanh_linh_thao', url: '/assets/ui/thanh-linh-thao-v3.webp' },
  ...['linh_thach', 'linh_khi', 'hoi_xuan_dan', 'nhan_bac', 'kiem_pho'].map((id) => ({
    key: `item-sprite-${id}`,
    url: `/assets/ui/item-${id.replace(/_/g, '-')}.png`,
  })),
];

/** Plain data: usable on the entry screen without importing the game renderer. */
export function villageStartupImages(id: HeroId, child: boolean) {
  const urls = assets.urls as Record<string, string>;
  return [
    ...CORE_STARTUP_IMAGES,
    { key: VILLAGE_STARTUP_TEXTURE, url: urls.village },
    ...assets.groundPages.map((page) => ({
      key: villageGroundTexture(page.key),
      url: urls[page.key],
    })),
    { key: 'village-dawn-v3', url: optimizedAsset('/assets/maps/village-dawn-v3.png') },
    { key: preparedHeroTexture(id, child), url: urls[`hero-${child ? 'child' : 'adult'}-${id}`] },
  ];
}
