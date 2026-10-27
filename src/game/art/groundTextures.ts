import type Phaser from 'phaser';
import { addStaticTexture } from './staticTexture';

export const GROUND_PREFIX = 'ground:active';
export function clearGroundTextures(scene: Phaser.Scene) {
  for (const key of Object.keys(scene.textures.list))
    if (key.startsWith(GROUND_PREFIX)) scene.textures.remove(key);
}

/** Small immutable pages avoid oversized GPU uploads and full-map RGBA readback. */
export function addGroundTextures(scene: Phaser.Scene, source: HTMLCanvasElement) {
  const page = 1024;
  for (let y = 0; y < source.height; y += page)
    for (let x = 0; x < source.width; x += page) {
      const width = Math.min(page, source.width - x),
        height = Math.min(page, source.height - y);
      const canvas = document.createElement('canvas');
      canvas.width = width + 2;
      canvas.height = height + 2;
      // One texel of neighbouring ground keeps linear filtering seamless at zoomed edges.
      canvas
        .getContext('2d')!
        .drawImage(source, x - 1, y - 1, width + 2, height + 2, 0, 0, width + 2, height + 2);
      const key = `${GROUND_PREFIX}:${x}:${y}`,
        texture = addStaticTexture(scene, key, canvas)!;
      texture.add('ground', 0, 1, 1, width, height);
      scene.add.image(x, y, key, 'ground').setOrigin(0, 0).setDepth(-10000);
    }
  // The preview reads the registered pages, so the temporary full map can go now.
  source.width = source.height = 1;
}
