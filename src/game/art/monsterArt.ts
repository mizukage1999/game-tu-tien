import type Phaser from 'phaser';
import { BESTIARY, BESTIARY_SHEETS, speciesArt } from '../../data/bestiary';
import { CHARACTERS, RIGS, frameName } from './generate';

export { BESTIARY_SHEETS };
const CELL = 224,
  FOOT = 212;

/** Trim inside an authored cell; discard detached scraps from adjacent rows. */
function poseBounds(source: HTMLImageElement, col: number, row: number, insetTop = 0) {
  const x = Math.floor((col * source.width) / 4),
    y = Math.floor((row * source.height) / 6) + insetTop;
  const w = Math.floor(((col + 1) * source.width) / 4) - x,
    h = Math.floor(((row + 1) * source.height) / 6) - y;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(source, x, y, w, h, 0, 0, w, h);
  const rgba = ctx.getImageData(0, 0, w, h).data;
  let first = 2,
    last = h - 3,
    longest = 0,
    start = -1;
  for (let cy = 2; cy <= h - 2; cy++) {
    let occupied = false;
    if (cy < h - 2)
      for (let cx = 2; cx < w - 2; cx++)
        if (rgba[(cy * w + cx) * 4 + 3] >= 96) {
          occupied = true;
          break;
        }
    if (occupied && start < 0) start = cy;
    if (!occupied && start >= 0) {
      if (cy - start > longest) {
        longest = cy - start;
        first = start;
        last = cy - 1;
      }
      start = -1;
    }
  }
  let left = w,
    top = h,
    right = -1,
    bottom = -1;
  for (let cy = first; cy <= last; cy++)
    for (let cx = 2; cx < w - 2; cx++) {
      if (rgba[(cy * w + cx) * 4 + 3] < 96) continue;
      left = Math.min(left, cx);
      right = Math.max(right, cx);
      top = Math.min(top, cy);
      bottom = Math.max(bottom, cy);
    }
  return right < left
    ? { x, y, w, h }
    : { x: x + left, y: y + top, w: right - left + 1, h: bottom - top + 1 };
}

export function registerMonsterArt(scene: Phaser.Scene) {
  RIGS.monster_v6 = {
    frameWidth: CELL,
    frameHeight: CELL,
    originY: FOOT / CELL,
    dirs: ['side'],
    anims: {
      idle: { frames: 1, frameRate: 1, repeat: -1 },
      run: { frames: 2, frameRate: 6, repeat: -1 },
      attack: { frames: 3, frameRate: 8, repeat: 0, hitFrame: 1 },
      hurt: { frames: 2, frameRate: 10, repeat: 0 },
      die: { frames: 2, frameRate: 6, repeat: 0 },
    },
  };
  for (const species of BESTIARY) {
    const key = speciesArt(species.id),
      sourceKey = `bestiary-${species.sheet}-source`;
    CHARACTERS[key] = { rig: 'monster_v6', palette: 'beast_snow' };
    if (!scene.textures.exists(sourceKey)) continue;
    const source = scene.textures.get(sourceKey).getSourceImage() as HTMLImageElement;
    const poses = Array.from({ length: 4 }, (_, col) =>
      poseBounds(
        source,
        col,
        species.row,
        species.id === 'thien_dao_kim_o' && col < 2 ? Math.round((source.height / 1254) * 13) : 0,
      ),
    );
    // Anatomical scale is shared by all poses: a fallen beast does not grow to standing height.
    const scale = Math.min(
      species.height / poses[0].h,
      (CELL - 16) / Math.max(...poses.map((p) => p.w)),
      (FOOT - 6) / Math.max(...poses.map((p) => p.h)),
    );
    const canvas = document.createElement('canvas');
    canvas.width = CELL * 4;
    canvas.height = CELL;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    poses.forEach((p, col) =>
      ctx.drawImage(
        source,
        p.x,
        p.y,
        p.w,
        p.h,
        col * CELL + (CELL - p.w * scale) / 2,
        FOOT - p.h * scale,
        p.w * scale,
        p.h * scale,
      ),
    );
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const texture = scene.textures.addCanvas(key, canvas)!;
    const sequences: Record<string, number[]> = {
      idle: [0],
      run: [0, 1],
      attack: [0, 2, 0],
      hurt: [2, 0],
      die: [0, 3],
    };
    for (const [anim, sequence] of Object.entries(sequences))
      sequence.forEach((col, i) =>
        texture.add(frameName(anim, 'side', i), 0, col * CELL, 0, CELL, CELL),
      );
  }
  for (const sheet of BESTIARY_SHEETS)
    if (scene.textures.exists(`bestiary-${sheet}-source`))
      scene.textures.remove(`bestiary-${sheet}-source`);
}
