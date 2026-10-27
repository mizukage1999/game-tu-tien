import type Phaser from 'phaser';
import type { MapDef } from '../maps/MapBuilder';
import { makeCanvas } from './canvas';
import { setMapPreview } from './mapPreviews';
import { mapArtSize } from '../systems/mapProjection';

/** Bake the actual ground and scenery into a small shared radar/local-map image.
 * Run before actors are added, so moving dots remain live UI overlays. */
export function publishWorldPreview(scene: Phaser.Scene, map: MapDef) {
  const size = mapArtSize(map), width = 768, scale = width / size.width;
  const [canvas, ctx] = makeCanvas(width, Math.round(size.height * scale));
  ctx.imageSmoothingQuality = 'high'; ctx.scale(scale, scale);
  const images = scene.children.list.filter(child => child.type === 'Image') as Phaser.GameObjects.Image[];
  for (const image of images.sort((a, b) => a.depth - b.depth)) {
    if (!image.visible || image.texture.key.startsWith('glow_')) continue;
    const frame = image.frame;
    ctx.save(); ctx.translate(image.x, image.y); ctx.rotate(image.rotation);
    ctx.scale(image.scaleX * (image.flipX ? -1 : 1), image.scaleY * (image.flipY ? -1 : 1));
    ctx.globalAlpha = image.alpha;
    ctx.drawImage(frame.source.image as CanvasImageSource, frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight,
      -image.displayOriginX, -image.displayOriginY, frame.cutWidth, frame.cutHeight);
    ctx.restore();
  }
  setMapPreview(map.id, canvas);
}
