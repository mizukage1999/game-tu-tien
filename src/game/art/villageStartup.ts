import type Phaser from 'phaser';
import startup from '../../data/startupAssets.json';
import { VILLAGE_STARTUP_SPRITES } from '../../data/villageStartupLayout';
import { WORLD_PROPS, worldNpcPortraits } from './world';
import { VILLAGE_STARTUP_TEXTURE, villageGroundTexture } from '../../data/startupPlan';

export { VILLAGE_STARTUP_TEXTURE, villageGroundTexture } from '../../data/startupPlan';
export const villageGroundKeys = () =>
  new Set(startup.groundPages.map((p) => villageGroundTexture(p.key)));

export function addPreparedVillageGround(scene: Phaser.Scene) {
  if (!startup.groundPages.every((page) => scene.textures.exists(villageGroundTexture(page.key))))
    return false;
  for (const page of startup.groundPages) {
    const key = villageGroundTexture(page.key),
      texture = scene.textures.get(key);
    if (!texture.has('ground')) texture.add('ground', 0, 1, 1, page.width, page.height);
    scene.add.image(page.x, page.y, key, 'ground').setOrigin(0, 0).setDepth(-10000);
  }
  return true;
}

/** Register full-resolution crops without reading canvas pixels at boot. */
export function registerVillageStartup(scene: Phaser.Scene) {
  if (!scene.textures.exists(VILLAGE_STARTUP_TEXTURE)) return;
  const texture = scene.textures.get(VILLAGE_STARTUP_TEXTURE);
  for (const [key, [x, y, width, height]] of Object.entries(startup.frames))
    if (!texture.has(key)) texture.add(key, 0, x, y, width, height);
  for (const [name, , height, originY, fallback] of VILLAGE_STARTUP_SPRITES) {
    WORLD_PROPS[`village25d-${name}`] = {
      atlas: VILLAGE_STARTUP_TEXTURE,
      region: [0, 0, 1, 1],
      height,
      originY,
      fallback,
      fade: ['home', 'apothecary', 'school', 'willow', 'peach', 'shrine'].includes(name),
      ground: name === 'bridge' || name === 'herbs',
      glowY: name === 'lantern' ? 65 : undefined,
    };
  }
  WORLD_PROPS['village-reference-court-notice'] = {
    atlas: VILLAGE_STARTUP_TEXTURE,
    region: [0, 0, 1, 1],
    height: 136,
    originY: 0.97,
    fallback: 'pillar',
    fade: true,
  };
  for (const [key, url] of Object.entries(startup.urls))
    if (key.startsWith('npc-')) worldNpcPortraits[key.slice(4)] = url;
}

export function villageNpcFrame(id: string) {
  const key = `npc-village-${id}`;
  return key in startup.frames ? key : undefined;
}
export function villageNpcBounds(id: string) {
  return (startup.npcBounds as Record<string, { top: number; bottom: number }>)[id];
}
