import type Phaser from 'phaser';
import { addStaticTexture } from './staticTexture';
import { HEROES, HERO_ASSETS, type HeroId } from '../../data/heroes';
import { HERO_SPELLS, heroSpell } from '../../data/heroSkills';
import { CHARACTERS, RIGS, frameName } from './generate';
import { cacheHeroSpellIcon } from './heroSpellIcons';
import {
  schoolSheet,
  spellCell,
  spellRuntimeCell,
  spellSource,
  spellTexture,
} from '../../data/heroSpellArt';

export const ROSTER_SOURCE = 'hero-roster-v7-source';
export const ROSTER_POSES_URL = `${HERO_ASSETS}/poses.png`;
export const SPELL_CELL = 192;

export function rosterArt(id: HeroId) {
  return `hero-${id}-v7`;
}

/** Trim measured opaque bounds, while preserving the original soft alpha pixels. */
function bounds(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const pixels = ctx.getImageData(x, y, w, h).data;
  let left = w,
    top = h,
    right = 0,
    bottom = 0;
  for (let cy = 2; cy < h - 2; cy++)
    for (let cx = 2; cx < w - 2; cx++) {
      if (pixels[(cy * w + cx) * 4 + 3] < 110) continue;
      left = Math.min(left, cx);
      right = Math.max(right, cx);
      top = Math.min(top, cy);
      bottom = Math.max(bottom, cy);
    }
  return right > left
    ? { x: x + left, y: y + top, w: right - left + 1, h: bottom - top + 1 }
    : { x, y, w, h };
}

export function registerRosterArt(scene: Phaser.Scene) {
  if (!scene.textures.exists(ROSTER_SOURCE)) return;
  const source = scene.textures.get(ROSTER_SOURCE).getSourceImage() as HTMLImageElement;
  const original = document.createElement('canvas');
  original.width = source.width;
  original.height = source.height;
  const measure = original.getContext('2d')!;
  measure.drawImage(source, 0, 0);
  const cell = 160,
    foot = 150,
    sw = source.width / 6,
    sh = source.height / 8;
  RIGS.hero_v7 = {
    frameWidth: cell,
    frameHeight: cell,
    originY: foot / cell,
    dirs: ['side'],
    anims: {
      idle: { frames: 1, frameRate: 1, repeat: -1 },
      run: { frames: 4, frameRate: 8, repeat: -1 },
      attack: { frames: 3, frameRate: 8, repeat: 0, hitFrame: 1 },
      attack_1: { frames: 3, frameRate: 8, repeat: 0, hitFrame: 1 },
      attack_2: { frames: 3, frameRate: 9, repeat: 0, hitFrame: 1 },
      attack_3: { frames: 3, frameRate: 7, repeat: 0, hitFrame: 1 },
      cast: { frames: 3, frameRate: 7, repeat: 0, hitFrame: 1 },
      hurt: { frames: 2, frameRate: 9, repeat: 0 },
      downed: { frames: 1, frameRate: 1, repeat: 0 },
      meditate: { frames: 1, frameRate: 1, repeat: -1 },
    },
  };
  HEROES.forEach((hero, row) => {
    const poses = Array.from({ length: 6 }, (_, col) =>
      bounds(measure, Math.round(col * sw), Math.round(row * sh), Math.floor(sw), Math.floor(sh)),
    );
    // One scale per character; defeated poses retain their anatomical size.
    const scale = Math.min(108 / poses[0].h, 148 / Math.max(...poses.map((p) => p.w)));
    const canvas = document.createElement('canvas');
    canvas.width = cell * 6;
    canvas.height = cell;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    poses.forEach((p, col) =>
      ctx.drawImage(
        source,
        p.x,
        p.y,
        p.w,
        p.h,
        col * cell + (cell - p.w * scale) / 2,
        foot - p.h * scale,
        p.w * scale,
        p.h * scale,
      ),
    );
    const texture = addStaticTexture(scene, rosterArt(hero.id), canvas)!;
    const add = (anim: string, sequence: number[]) =>
      sequence.forEach((pose, i) =>
        texture.add(frameName(anim, 'side', i), 0, pose * cell, 0, cell, cell),
      );
    add('idle', [0]);
    add('run', [1, 0, 2, 0]);
    for (const anim of ['attack', 'attack_1', 'attack_2', 'attack_3']) add(anim, [0, 3, 0]);
    add('cast', [0, 4, 0]);
    add('hurt', [3, 0]);
    add('downed', [5]);
    add('meditate', [0]);
    CHARACTERS[rosterArt(hero.id)] = {
      rig: 'hero_v7',
      palette: hero.sex === 'male' ? 'player_male' : 'player',
    };
  });
  scene.textures.remove(ROSTER_SOURCE);
}

export function registerHeroSpells(scene: Phaser.Scene) {
  for (const hero of HEROES) {
    const key = spellSource(hero.id);
    if (!scene.textures.exists(key)) continue;
    const source = scene.textures.get(key).getSourceImage() as HTMLImageElement;
    const layout = schoolSheet(hero.id);
    const canvas = document.createElement('canvas');
    canvas.width = layout.cell * layout.columns;
    canvas.height = layout.cell * layout.rows;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    for (const art of Object.values(HERO_SPELLS).filter((a) => a.hero === hero.id)) {
      for (let frame = 0; frame < layout.frames; frame++) {
        const [x, y, w, h] = spellCell(art.id, frame);
        ctx.drawImage(source, x, y, w, h, ...spellRuntimeCell(art.id, frame));
      }
      const icon = document.createElement('canvas');
      icon.width = 192;
      icon.height = 192;
      const ic = icon.getContext('2d')!;
      ic.imageSmoothingQuality = 'high';
      ic.beginPath();
      ic.arc(96, 96, 95, 0, Math.PI * 2);
      ic.clip();
      const [x, y, w, h] = spellCell(art.id);
      ic.drawImage(source, x, y, w, h, 0, 0, 192, 192);
      cacheHeroSpellIcon(art.id, icon.toDataURL('image/png'));
    }
    const texture = addStaticTexture(scene, spellTexture(hero.id), canvas)!;
    for (const art of Object.values(HERO_SPELLS).filter((a) => a.hero === hero.id)) {
      for (let frame = 0; frame < layout.frames; frame++)
        texture.add(`${art.id}:${frame}`, 0, ...spellRuntimeCell(art.id, frame));
    }
    scene.textures.remove(key);
  }
}

export function hasHeroSpell(id: string) {
  return !!heroSpell(id);
}
