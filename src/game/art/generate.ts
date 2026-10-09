import Phaser from 'phaser';
import animData from '../../data/animations.json';
import { makeCanvas } from './canvas';
import { drawHuman, PALETTES } from './character';
import { BEAST_PALETTES, drawBeast } from './beast';
import { beastPose, humanPose } from './poses';
import { buildTileset } from './tiles';
import { buildDecor } from './decor';
import { buildFx } from './fx';
import { buildLootTextures } from './icons';

export interface AnimDef {
  frames: number;
  frameRate: number;
  repeat: number;
  hitFrame?: number;
  dirs?: string[];
}

export interface RigDef {
  frameWidth: number;
  frameHeight: number;
  originY: number;
  dirs: string[];
  anims: Record<string, AnimDef>;
}

export const RIGS = animData.rigs as Record<string, RigDef>;
export const CHARACTERS = animData.characters as Record<string, { rig: string; palette: string }>;

export function frameName(anim: string, dir: string, i: number) {
  return `${anim}_${dir}_${i}`;
}

export function animKey(art: string, anim: string, dir: string) {
  return `${art}:${anim}:${dir}`;
}

function addCanvas(scene: Phaser.Scene, key: string, canvas: HTMLCanvasElement) {
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, canvas);
}

function buildCharacterSheet(scene: Phaser.Scene, art: string, rig: RigDef, rigName: string, palette: string) {
  const frames: { anim: string; dir: string; i: number; n: number }[] = [];
  for (const [anim, def] of Object.entries(rig.anims)) {
    for (const dir of def.dirs ?? rig.dirs) {
      for (let i = 0; i < def.frames; i++) frames.push({ anim, dir, i, n: def.frames });
    }
  }
  const cols = 16;
  const rows = Math.ceil(frames.length / cols);
  const fw = rig.frameWidth;
  const fh = rig.frameHeight;
  const [canvas, ctx] = makeCanvas(cols * fw, rows * fh);
  frames.forEach((f, idx) => {
    const x = (idx % cols) * fw;
    const y = Math.floor(idx / cols) * fh;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, fw, fh);
    ctx.clip();
    const cx = x + fw / 2;
    const fy = y + Math.round(fh * rig.originY);
    if (rigName === 'beast') drawBeast(ctx, cx, fy, BEAST_PALETTES[palette], beastPose(f.anim, f.i, f.n));
    else drawHuman(ctx, cx, fy, f.dir as 'down' | 'up' | 'side', PALETTES[palette], humanPose(f.anim, f.i, f.n));
    ctx.restore();
  });
  const tex = scene.textures.addCanvas(art, canvas);
  if (!tex) return;
  frames.forEach((f, idx) => {
    tex.add(frameName(f.anim, f.dir, f.i), 0, (idx % cols) * fw, Math.floor(idx / cols) * fh, fw, fh);
  });
}

function createAnims(scene: Phaser.Scene, art: string, rig: RigDef) {
  const tex = scene.textures.get(art);
  const names = tex.getFrameNames();
  for (const [anim, def] of Object.entries(rig.anims)) {
    for (const dir of def.dirs ?? rig.dirs) {
      const key = animKey(art, anim, dir);
      if (scene.anims.exists(key)) continue;
      // external atlases may ship a different number of frames; use whatever exists
      const prefix = `${anim}_${dir}_`;
      const found = names
        .filter((n) => n.startsWith(prefix))
        .sort((a, b) => Number(a.slice(prefix.length)) - Number(b.slice(prefix.length)));
      if (found.length === 0) continue;
      scene.anims.create({
        key,
        frames: found.map((frame) => ({ key: art, frame })),
        frameRate: def.frameRate,
        repeat: def.repeat,
      });
    }
  }
}

/** Builds every texture the game needs. Textures already loaded from real assets are kept. */
export function generateArt(scene: Phaser.Scene) {
  addCanvas(scene, 'tiles', buildTileset());
  for (const [key, c] of Object.entries(buildDecor())) addCanvas(scene, key, c);
  for (const [key, c] of Object.entries(buildFx())) addCanvas(scene, key, c);
  for (const [key, c] of Object.entries(buildLootTextures())) addCanvas(scene, key, c);
  for (const [art, cfg] of Object.entries(CHARACTERS)) {
    const rig = RIGS[cfg.rig];
    if (!scene.textures.exists(art)) buildCharacterSheet(scene, art, rig, cfg.rig, cfg.palette);
    createAnims(scene, art, rig);
  }
}
