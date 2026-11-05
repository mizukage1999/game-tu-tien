import type Phaser from 'phaser';
import { ensureImage } from './lazyImage';
import startup from '../../data/startupAssets.json';

export const REALM_CREST_TEXTURE = 'realm-crests-v1';
export const REALM_CREST_ASSET = (startup.urls as Record<string, string>)['realm-crests'];
export const REALM_CREST_CELL = { width: 256, height: 128 };

/** Children have no realm crest; fetch these when a cultivator first arrives. */
export function ensureRealmCrests(scene: Phaser.Scene) {
  return ensureImage(
    scene,
    REALM_CREST_TEXTURE,
    REALM_CREST_ASSET,
    () =>
      scene.textures.exists(REALM_CREST_TEXTURE) && scene.textures.get(REALM_CREST_TEXTURE).has('11'),
    () => {
      // The loader already uploaded this image. Add UV frames to that texture;
      // addSpriteSheet(sourceImage) would allocate and upload it a second time.
      const texture = scene.textures.get(REALM_CREST_TEXTURE);
      for (let i = 0; i < 12; i++)
        if (!texture.has(String(i))) texture.add(i, 0, (i % 3) * 256, Math.floor(i / 3) * 128, 256, 128);
    },
  );
}
