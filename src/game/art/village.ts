import type Phaser from 'phaser';
import { makeCanvas } from './canvas';
import { WORLD_PROPS } from './world';

export const VILLAGE_ATLASES = ['village-architecture-v3', 'village-nature-v3', 'village-materials-v3', 'village-dawn-v3'] as const;

// Each sheet has six square cells. Trim only transparent padding; retain the
// original alpha so leaves, roof edges and lanterns blend into the ground.
const SPRITES = [
  ['home', 0, 340, .89, 'pillar'],
  ['apothecary', 1, 310, .89, 'pillar'],
  ['school', 2, 305, .89, 'pillar'],
  ['well', 3, 180, .88, 'rock'],
  ['workbench', 4, 110, .80, 'rock'],
  ['shrine', 5, 190, .87, 'pillar'],
  ['willow', 6, 355, .96, 'tree_cherry'],
  ['peach', 7, 295, .96, 'tree_cherry'],
  ['bridge', 8, 188, .57, 'rock'],
  ['fence', 9, 76, .78, 'rock'],
  ['herbs', 10, 56, .80, 'bush'],
  ['lantern', 11, 146, .96, 'pillar'],
] as const;

export function registerVillageArt(scene: Phaser.Scene) {
  for (const [name, index, height, originY, fallback] of SPRITES) {
    const atlas = VILLAGE_ATLASES[index < 6 ? 0 : 1];
    const key = `village25d-${name}`;
    WORLD_PROPS[key] = {
      atlas, region: [0, 0, 1, 1], height, originY, fallback,
      fade: ['home', 'apothecary', 'school', 'willow', 'peach', 'shrine'].includes(name),
      ground: name === 'bridge' || name === 'herbs',
      glowY: name === 'lantern' ? 65 : undefined,
    };
    if (!scene.textures.exists(atlas)) continue;
    const texture = scene.textures.get(atlas);
    const source = texture.getSourceImage() as HTMLImageElement;
    const size = Math.floor(source.width / 3);
    const cell = index % 6, sx = cell % 3 * size, sy = Math.floor(cell / 3) * size;
    const [, ctx] = makeCanvas(size, size);
    ctx.drawImage(source, sx, sy, size, size, 0, 0, size, size);
    const pixels = ctx.getImageData(0, 0, size, size).data;
    let left = size, top = size, right = -1, bottom = -1;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      if (pixels[(y * size + x) * 4 + 3] < 32) continue;
      left = Math.min(left, x); right = Math.max(right, x);
      top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
    if (right < left) { WORLD_PROPS[key].atlas = ''; continue; }
    left = Math.max(0, left - 2); top = Math.max(0, top - 2);
    right = Math.min(size - 1, right + 2); bottom = Math.min(size - 1, bottom + 2);
    if (!texture.has(key)) texture.add(key, 0, sx + left, sy + top, right - left + 1, bottom - top + 1);
  }
}
