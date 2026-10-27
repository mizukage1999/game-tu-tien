import type Phaser from 'phaser';

/** Immutable artwork does not need CanvasTexture's permanent full RGBA readback. */
export function addStaticTexture(
  scene: Pick<Phaser.Scene, 'textures'>,
  key: string,
  canvas: HTMLCanvasElement,
) {
  const texture = scene.textures.create(key, canvas);
  if (!texture) return null;
  texture.add('__BASE', 0, 0, 0, canvas.width, canvas.height);
  scene.textures.emit('addtexture', key, texture);
  scene.textures.emit(`addtexture-${key}`, texture);
  return texture;
}
