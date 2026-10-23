import type Phaser from 'phaser';
import { COURTYARD_ATLAS, COURTYARD_PROPS } from './courtyard';
import { makeCanvas } from './canvas';
import { CHARACTERS, RIGS } from './generate';

export const WORLD_ATLASES = ['world-sect', 'world-nature', 'world-village', 'world-people'] as const;
export const worldNpcPortraits: Record<string, string> = {};
type Prop = { atlas: string; region: [number, number, number, number]; height: number; originY: number; originX?: number; fade?: boolean; fallback: string; glowY?: number };
const prop = (atlas: string, region: Prop['region'], height: number, fallback = 'rock', originY = .97): Prop => ({ atlas, region, height, fallback, originY });
export const WORLD_PROPS: Record<string, Prop> = {
  ...Object.fromEntries(Object.entries(COURTYARD_PROPS).map(([key, p]) => [key, { ...p, atlas: COURTYARD_ATLAS }])),
  'sect-hall': { ...prop('world-sect', [0, 0, .35, .51], 340, 'pillar'), fade: true },
  'sect-pavilion': { ...prop('world-sect', [.355, 0, .315, .51], 245, 'pillar'), fade: true },
  'sect-gate': { ...prop('world-sect', [.672, 0, .328, .51], 250, 'pillar'), fade: true },
  'sect-wall': prop('world-sect', [0, .52, .335, .45], 155, 'pillar', .85),
  'sect-bridge': prop('world-sect', [.34, .59, .335, .365], 125, 'rock', .7),
  'sect-cherry': { ...prop('world-sect', [.675, .51, .325, .46], 220, 'tree_cherry'), fade: true },
  'world-tree': { ...prop('world-nature', [0, 0, .335, .53], 235, 'tree_pine'), fade: true },
  'world-waterfall': prop('world-nature', [.34, 0, .325, .54], 330, 'rock'),
  'world-cave': prop('world-nature', [.67, 0, .33, .54], 260, 'rock'),
  'world-rock': prop('world-nature', [0, .54, .34, .46], 110, 'rock'),
  'world-crystal': prop('world-nature', [.35, .54, .325, .44], 145, 'rock'),
  'world-fence': prop('world-nature', [.69, .59, .31, .36], 75, 'rock', .78),
  'village-house': { ...prop('world-village', [0, 0, .435, .465], 230, 'pillar'), fade: true },
  'village-well': prop('world-village', [.44, .03, .24, .45], 145, 'rock'),
  'village-workbench': prop('world-village', [.69, .06, .31, .40], 110, 'rock'),
  'village-willow': { ...prop('world-village', [0, .465, .36, .52], 250, 'tree_cherry'), fade: true },
  'village-farm': prop('world-village', [.36, .50, .37, .45], 78, 'bush'),
  'village-shrine': prop('world-village', [.74, .51, .26, .44], 155, 'pillar'),
};

export function registerWorldArt(scene: Phaser.Scene) {
  RIGS.child = { frameWidth: 136, frameHeight: 136, originY: .97, dirs: ['side'], anims: { idle: { frames: 4, frameRate: 4, repeat: -1 }, run: { frames: 4, frameRate: 9, repeat: -1 } } };
  CHARACTERS.thiet_tru = { rig: 'child', palette: 'player_male' };
  if (scene.textures.exists('world-people')) {
    const source = scene.textures.get('world-people').getSourceImage() as HTMLImageElement;
    for (const [i, id] of ['vuong_phu', 'vuong_mau', 'duoc_ba', 'tien_sinh', 'vuong_thuc', 'giu_suoi'].entries()) {
      const [canvas, ctx] = makeCanvas(180, 180);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(source, (i % 3) * source.width / 3, Math.floor(i / 3) * source.height / 2, source.width / 3, source.height / 2, 0, 0, 180, 180);
      scene.textures.addCanvas(`npc-village-${id}`, canvas);
      worldNpcPortraits[id] = canvas.toDataURL();
    }
  }
  for (const [key, p] of Object.entries(WORLD_PROPS)) {
    if (p.atlas === COURTYARD_ATLAS || !scene.textures.exists(p.atlas)) continue;
    const texture = scene.textures.get(p.atlas);
    const source = texture.getSourceImage() as HTMLImageElement;
    const [x, y, w, h] = p.region;
    if (!texture.has(key)) texture.add(key, 0, Math.round(x * source.width), Math.round(y * source.height), Math.round(w * source.width), Math.round(h * source.height));
  }
  if (!scene.textures.exists('child-source')) return;
  const source = scene.textures.get('child-source').getSourceImage() as HTMLImageElement;
  const [canvas, ctx] = makeCanvas(136 * 4, 136 * 2);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  const texture = scene.textures.addCanvas('thiet_tru', canvas);
  for (let row = 0; row < 2; row++) for (let col = 0; col < 4; col++) {
    ctx.drawImage(source, col * source.width / 4, row * source.height / 2, source.width / 4, source.height / 2, col * 136 + 12, row * 136 + 18, 112, 112);
    texture?.add(`${row ? 'run' : 'idle'}_side_${col}`, 0, col * 136, row * 136, 136, 136);
  }
  texture?.refresh();
}
