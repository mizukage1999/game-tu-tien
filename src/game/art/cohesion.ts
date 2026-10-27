import type Phaser from 'phaser';
import { addStaticTexture } from './staticTexture';
import { makeCanvas } from './canvas';
import { worldNpcPortraits, WORLD_PROPS } from './world';
import { PAINTED_NPC_GROUPS } from '../systems/npcArt';
import { COURTYARD_ATLAS, COURTYARD_PROPS } from './courtyard';

export const COHESION_ATLASES = [
  'sect-v2',
  'court-props-v2',
  'city-people-v2',
  'travel-people-v2',
  'biome-props-v2',
] as const;
type Region = [number, number, number, number];
// Hand-checked bounds keep broad roofs and tall column bases intact.
export const COHESIVE_REGIONS: Record<string, Region[]> = {
  'sect-v2': [
    [0, 0, 0.395, 0.56],
    [0.395, 0, 0.335, 0.56],
    [0.73, 0, 0.27, 0.54],
    [0, 0.56, 0.34, 0.44],
    [0.34, 0.59, 0.345, 0.4],
    [0.685, 0.54, 0.315, 0.46],
  ],
  'court-props-v2': [
    [0, 0, 1 / 3, 0.39],
    [1 / 3, 0, 1 / 3, 0.39],
    [2 / 3, 0, 1 / 3, 0.39],
    [0, 0.39, 1 / 3, 0.27],
    [1 / 3, 0.39, 1 / 3, 0.27],
    [2 / 3, 0.36, 1 / 3, 0.32],
    [0, 0.64, 1 / 3, 0.36],
    [1 / 3, 0.66, 1 / 3, 0.34],
    [2 / 3, 0.66, 1 / 3, 0.34],
  ],
  'biome-props-v2': [
    [0, 0, 0.38, 0.55],
    [0.38, 0, 0.31, 0.55],
    [0.69, 0.08, 0.31, 0.47],
    [0, 0.55, 0.36, 0.45],
    [0.36, 0.55, 0.33, 0.45],
    [0.69, 0.55, 0.31, 0.45],
  ],
};

/** Use the same texture treatment throughout the world; keep the village reference intact. */
export function sceneryKey(key: string, village: boolean, ambient: string, mapId = '') {
  if (village) return key.startsWith('court-') ? `village-reference-${key}` : key;
  if (['rung_linh_thu', 'linh_thu_lam'].includes(mapId) && (key === 'world-tree' || key.startsWith('tree_pine'))) return 'world-bamboo';
  if (key.startsWith('tree_cherry')) return 'sect-cherry';
  if (key.startsWith('tree_pine')) return ambient === 'embers' ? 'biome-autumn' : 'biome-pine';
  if (key === 'rock')
    return ambient === 'snow'
      ? 'biome-snow-rock'
      : ambient === 'embers'
        ? 'biome-dry-rock'
        : 'biome-moss-rock';
  if (key === 'bush') return 'biome-shrub';
  return (
    (
      { pillar: 'court-stone-post', lantern: 'court-lantern', burner: 'court-burner' } as Record<
        string,
        string
      >
    )[key] ?? key
  );
}

export function registerVillageReferenceProps(scene: Phaser.Scene) {
  // The opening village is the visual reference. Retain its original small props.
  for (const [key, original] of Object.entries(COURTYARD_PROPS)) {
    const prop = { ...original, atlas: COURTYARD_ATLAS };
    if (!scene.textures.exists(prop.atlas)) continue;
    const texture = scene.textures.get(prop.atlas),
      frame = texture.get(key);
    const alias = `village-reference-${key}`;
    if (!texture.has(alias))
      texture.add(
        alias,
        frame.sourceIndex,
        frame.cutX,
        frame.cutY,
        frame.cutWidth,
        frame.cutHeight,
      );
    WORLD_PROPS[alias] = { ...prop };
  }
}

export function registerCohesiveArt(scene: Phaser.Scene) {
  registerVillageReferenceProps(scene);
  const assignProps = (atlas: string, entries: [string, number][]) => {
    if (!scene.textures.exists(atlas)) return;
    const texture = scene.textures.get(atlas);
    const image = texture.getSourceImage() as HTMLImageElement;
    entries.forEach(([key, height], i) => {
      const region = COHESIVE_REGIONS[atlas][i];
      const [x, y, w, h] = region;
      if (!texture.has(key))
        texture.add(
          key,
          0,
          Math.round(x * image.width),
          Math.round(y * image.height),
          Math.round(w * image.width),
          Math.round(h * image.height),
        );
      WORLD_PROPS[key] = {
        ...WORLD_PROPS[key],
        atlas,
        region,
        height,
        originY: 0.95,
        fallback: WORLD_PROPS[key]?.fallback ?? 'rock',
      };
    });
  };
  assignProps('sect-v2', [
    ['sect-hall', 340],
    ['sect-pavilion', 245],
    ['sect-gate', 250],
    ['sect-wall', 150],
    ['sect-bridge', 125],
    ['sect-cherry', 220],
  ]);
  assignProps('court-props-v2', [
    ['court-column', 200],
    ['court-column-banner', 200],
    ['court-lantern', 155],
    ['court-stone-post', 95],
    ['court-railing', 115],
    ['court-banner', 160],
    ['court-notice', 130],
    ['court-burner', 115],
    ['court-planter', 80],
  ]);
  assignProps('biome-props-v2', [
    ['biome-pine', 200],
    ['biome-autumn', 200],
    ['biome-moss-rock', 105],
    ['biome-dry-rock', 120],
    ['biome-snow-rock', 110],
    ['biome-shrub', 65],
  ]);
  for (const [atlas, ids] of Object.entries(PAINTED_NPC_GROUPS)) {
    if (!scene.textures.exists(atlas)) continue;
    const image = scene.textures.get(atlas).getSourceImage() as HTMLImageElement;
    ids.forEach((id, i) => {
      const col = i % 3,
        row = Math.floor(i / 3);
      const rowCut = atlas === 'city-people-v2' ? [0.51, 0.495, 0.525][col] : 0.5;
      const cellY = row ? rowCut * image.height : 0;
      const cellHeight = (row ? 1 - rowCut : rowCut) * image.height;
      const [cell, source] = makeCanvas(Math.floor(image.width / 3), Math.floor(cellHeight));
      source.drawImage(
        image,
        (col * image.width) / 3,
        cellY,
        image.width / 3,
        cellHeight,
        0,
        0,
        cell.width,
        cell.height,
      );
      const pixels = source.getImageData(0, 0, cell.width, cell.height).data;
      let left = cell.width,
        top = cell.height,
        right = 0,
        bottom = 0;
      for (let y = 0; y < cell.height; y++)
        for (let x = 0; x < cell.width; x++)
          if (pixels[(y * cell.width + x) * 4 + 3] > 32) {
            left = Math.min(left, x);
            top = Math.min(top, y);
            right = Math.max(right, x);
            bottom = Math.max(bottom, y);
          }
      if (right <= left || bottom <= top) return;
      const [canvas, ctx] = makeCanvas(180, 180);
      const width = right - left + 1,
        height = bottom - top + 1,
        scale = Math.min(160 / width, 164 / height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(
        cell,
        left,
        top,
        width,
        height,
        (180 - width * scale) / 2,
        174 - height * scale,
        width * scale,
        height * scale,
      );
      addStaticTexture(scene, `npc-painted-${id}`, canvas);
      worldNpcPortraits[id] = canvas.toDataURL();
    });
  }
}
