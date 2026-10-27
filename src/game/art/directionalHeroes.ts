import type Phaser from 'phaser';
import { addStaticTexture } from './staticTexture';
import { HEROES, type HeroId } from '../../data/heroes';
import { HERO_DIRECTIONS } from './heroDirections';
import { CHARACTERS, RIGS, frameName, registerCharacterArt } from './generate';
import { directionalCell, type HERO_ATLASES } from './heroAtlas';
export const DIRECTIONAL_SOURCES = ['adults', 'children', 'casting'] as const;
const sources = new WeakMap<Phaser.Game, Map<string, HTMLImageElement>>();
export function directionalArt(id: HeroId, child = false) {
  return `hero-v8-${id}${child ? '-child' : ''}`;
}

/** Eight authored facings share their anatomical scale and feet anchor. */
export function registerDirectionalHeroes(
  scene: Phaser.Scene,
  selected?: readonly { id: HeroId; child: boolean }[],
) {
  let images = sources.get(scene.game);
  if (!images) {
    images = new Map();
    sources.set(scene.game, images);
  }
  for (const name of DIRECTIONAL_SOURCES) {
    const key = `hero-v8-${name}-source`;
    if (scene.textures.exists(key))
      images.set(name, scene.textures.get(key).getSourceImage() as HTMLImageElement);
  }
  for (const child of [false, true]) {
    const source = images.get(child ? 'children' : 'adults');
    if (!source) continue;
    const casting = !child ? (images.get('casting') ?? source) : source;
    const cell = child ? 128 : 160,
      foot = child ? 118 : 150,
      bodyHeight = child ? 76 : 108;
    const rig = `hero_v8${child ? '_child' : ''}`;
    RIGS[rig] = {
      frameWidth: cell,
      frameHeight: cell,
      originY: foot / cell,
      dirs: [...HERO_DIRECTIONS],
      anims: {
        idle: { frames: 1, frameRate: 1, repeat: -1 },
        run: { frames: 4, frameRate: 9, repeat: -1 },
        attack: { frames: 3, frameRate: 8, repeat: 0, hitFrame: 1 },
        attack_1: { frames: 3, frameRate: 8, repeat: 0, hitFrame: 1 },
        attack_2: { frames: 3, frameRate: 8, repeat: 0, hitFrame: 1 },
        attack_3: { frames: 3, frameRate: 8, repeat: 0, hitFrame: 1 },
        cast: { frames: 3, frameRate: 7, repeat: 0, hitFrame: 1 },
        hurt: { frames: 2, frameRate: 9, repeat: 0 },
        downed: { frames: 1, frameRate: 1, repeat: 0 },
        meditate: { frames: 1, frameRate: 1, repeat: -1 },
      },
    };
    const crop = (
      image: HTMLImageElement,
      row: number,
      col: number,
      source: keyof typeof HERO_ATLASES,
    ) => {
      const [x, y, w, h] = directionalCell(source, row, col);
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(image, x, y, w, h, 0, 0, w, h);
      const bytes = ctx.getImageData(0, 0, w, h).data;
      let l = w,
        t = h,
        r = 0,
        b = 0;
      for (let cy = 2; cy < h - 2; cy++)
        for (let cx = 2; cx < w - 2; cx++)
          if (bytes[(cy * w + cx) * 4 + 3] > 110) {
            l = Math.min(l, cx);
            r = Math.max(r, cx);
            t = Math.min(t, cy);
            b = Math.max(b, cy);
          }
      return { image, x: x + l, y: y + t, w: Math.max(1, r - l + 1), h: Math.max(1, b - t + 1) };
    };
    HEROES.forEach((hero, row) => {
      if (selected && !selected.some((s) => s.id === hero.id && s.child === child)) return;
      if (scene.textures.exists(directionalArt(hero.id, child))) return;
      const idle = HERO_DIRECTIONS.map((_, col) =>
          crop(source, row, col, child ? 'children' : 'adults'),
        ),
        cast = HERO_DIRECTIONS.map((_, col) =>
          crop(casting, row, col, child ? 'children' : casting === source ? 'adults' : 'casting'),
        );
      const scale = Math.min(
        bodyHeight / Math.max(...idle.map((p) => p.h)),
        (cell - 12) / Math.max(...idle.concat(cast).map((p) => p.w)),
      );
      const canvas = document.createElement('canvas');
      canvas.width = cell * 8;
      canvas.height = cell * 4;
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingQuality = 'high';
      const draw = (p: ReturnType<typeof crop>, col: number, row: number, lift = 0) =>
        ctx.drawImage(
          p.image,
          p.x,
          p.y,
          p.w,
          p.h,
          col * cell + (cell - p.w * scale) / 2,
          row * cell + foot - p.h * scale + lift,
          p.w * scale,
          p.h * scale,
        );
      idle.forEach((p, col) => {
        draw(p, col, 0);
        draw(p, col, 1, -1.5);
        draw(p, col, 2, 1.5);
      });
      cast.forEach((p, col) => draw(p, col, 3));
      const art = directionalArt(hero.id, child),
        texture = addStaticTexture(scene, art, canvas)!;
      const add = (anim: string, dir: string, poses: number[]) =>
        poses.forEach((r, i) =>
          texture.add(
            frameName(anim, dir, i),
            0,
            HERO_DIRECTIONS.indexOf(dir as (typeof HERO_DIRECTIONS)[number]) * cell,
            r * cell,
            cell,
            cell,
          ),
        );
      for (const dir of HERO_DIRECTIONS) {
        add('idle', dir, [0]);
        add('run', dir, [1, 0, 2, 0]);
        for (const anim of ['attack', 'attack_1', 'attack_2', 'attack_3', 'cast'])
          add(anim, dir, [0, 3, 0]);
        add('hurt', dir, [3, 0]);
        add('downed', dir, [3]);
        add('meditate', dir, [0]);
      }
      CHARACTERS[art] = { rig, palette: hero.sex === 'male' ? 'player_male' : 'player' };
    });
  }
  for (const name of DIRECTIONAL_SOURCES)
    if (scene.textures.exists(`hero-v8-${name}-source`))
      scene.textures.remove(`hero-v8-${name}-source`);
}

/** Build a peer's school/age only when that actor actually enters the map. */
export function ensureDirectionalHero(scene: Phaser.Scene, id: HeroId, child: boolean) {
  if (scene.textures.exists(directionalArt(id, child))) return;
  registerDirectionalHeroes(scene, [{ id, child }]);
  registerCharacterArt(scene, new Set());
}
