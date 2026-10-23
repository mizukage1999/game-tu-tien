import type Phaser from 'phaser';
import { makeCanvas } from './canvas';
import { CHARACTERS } from './generate';
export const EXPANSION_ATLASES = ['mu-uyen-child', 'wanderers', 'spirit-companions'] as const;
export function registerExpansionArt(scene: Phaser.Scene) {
  CHARACTERS.mu_uyen_child = { rig: 'child', palette: 'player' };
  if (scene.textures.exists('mu-uyen-child')) {
    const src = scene.textures.get('mu-uyen-child').getSourceImage() as HTMLImageElement;
    const [canvas, ctx] = makeCanvas(544, 272),
      texture = scene.textures.addCanvas('mu_uyen_child', canvas);
    ctx.imageSmoothingQuality = 'high';
    for (let row = 0; row < 2; row++)
      for (let col = 0; col < 4; col++) {
        ctx.drawImage(
          src,
          (col * src.width) / 4,
          (row * src.height) / 2,
          src.width / 4,
          src.height / 2,
          col * 136 + 12,
          row * 136 + 18,
          112,
          112,
        );
        texture?.add(`${row ? 'run' : 'idle'}_side_${col}`, 0, col * 136, row * 136, 136, 136);
      }
    texture?.refresh();
  }
  for (const [atlas, prefix] of [
    ['wanderers', 'wanderer'],
    ['spirit-companions', 'companion'],
  ]) {
    if (!scene.textures.exists(atlas)) continue;
    const src = scene.textures.get(atlas).getSourceImage() as HTMLImageElement;
    for (let i = 0; i < 6; i++) {
      const [cell, c] = makeCanvas(Math.floor(src.width / 3), Math.floor(src.height / 2));
      c.drawImage(
        src,
        ((i % 3) * src.width) / 3,
        (Math.floor(i / 3) * src.height) / 2,
        src.width / 3,
        src.height / 2,
        0,
        0,
        cell.width,
        cell.height,
      );
      const data = c.getImageData(0, 0, cell.width, cell.height).data;
      let left = cell.width,
        top = cell.height,
        right = 0,
        bottom = 0;
      for (let y = 0; y < cell.height; y++)
        for (let x = 0; x < cell.width; x++)
          if (data[(y * cell.width + x) * 4 + 3] > 32) {
            left = Math.min(left, x);
            right = Math.max(right, x);
            top = Math.min(top, y);
            bottom = Math.max(bottom, y);
          }
      const [out, ctx] = makeCanvas(180, 180),
        w = right - left + 1,
        h = bottom - top + 1,
        scale = Math.min(164 / w, 164 / h);
      if (w <= 0 || h <= 0) continue;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(
        cell,
        left,
        top,
        w,
        h,
        (180 - w * scale) / 2,
        174 - h * scale,
        w * scale,
        h * scale,
      );
      scene.textures.addCanvas(`${prefix}-${i}`, out);
    }
  }
}
