import type Phaser from 'phaser';
import { OUTFITS, type OutfitId } from '../../data/cosmetics';
import type { HeroId } from '../../data/heroes';
import { directionalArt, ensureDirectionalHero } from './directionalHeroes';
import { animKey, CHARACTERS, RIGS } from './generate';
import { addStaticTexture } from './staticTexture';
import { dyeGarmentCell } from './garmentPalette';
import { maskEmbeddedSword, replacesEmbeddedSword } from './embeddedSword';
import { HERO_DIRECTIONS } from './heroDirections';

export interface AppearanceLease {
  key: string;
  release(): void;
}
interface Entry {
  key: string;
  refs: number;
  used: number;
  ready: boolean;
  animations: string[];
  job: Promise<void>;
}
const caches = new WeakMap<Phaser.Game, Map<string, Entry>>();
const idleFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
function trim(scene: Phaser.Scene, cache: Map<string, Entry>) {
  const idle = [...cache.values()]
    .filter((e) => e.ready && e.refs === 0)
    .sort((a, b) => b.used - a.used);
  for (const entry of idle.slice(2)) {
    cache.delete(entry.key);
    for (const key of entry.animations) scene.anims.remove(key);
    if (scene.textures.exists(entry.key)) scene.textures.remove(entry.key);
    delete CHARACTERS[entry.key];
  }
}
async function prepare(
  scene: Phaser.Scene,
  base: string,
  entry: Entry,
  outfit: OutfitId | null,
  hero: HeroId,
  weaponless: boolean,
) {
  const palette = OUTFITS.find((x) => x.id === outfit)!;
  const source = scene.textures.get(base).getSourceImage() as HTMLImageElement;
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(source, 0, 0);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  // Four small cells per task keep an outfit switch from monopolizing a frame.
  for (let cell = 0; cell < 32; cell++) {
    if (palette)
      dyeGarmentCell(
        pixels.data,
        canvas.width,
        canvas.height,
        { x: (cell % 8) * 160, y: Math.floor(cell / 8) * 160, width: 160, height: 160 },
        palette,
      );
    if (cell % 4 === 3) {
      await idleFrame();
      if (!scene.sys.isActive()) throw Error('SCENE_STOPPED');
    }
  }
  ctx.putImageData(pixels, 0, 0);
  if (weaponless)
    for (let row = 0; row < 4; row++)
      for (const [col, dir] of HERO_DIRECTIONS.entries())
        maskEmbeddedSword(
          ctx,
          hero,
          dir,
          row === 3,
          col * 160,
          row * 160 + (row === 1 ? -1.5 : row === 2 ? 1.5 : 0),
        );
  const texture = addStaticTexture(scene, entry.key, canvas);
  if (!texture) throw Error('COSMETIC_TEXTURE_FAILED');
  const baseTexture = scene.textures.get(base);
  for (const name of baseTexture.getFrameNames()) {
    const f = baseTexture.get(name);
    texture.add(name, 0, f.cutX, f.cutY, f.cutWidth, f.cutHeight);
  }
  const cfg = CHARACTERS[base];
  CHARACTERS[entry.key] = { ...cfg };
  const rig = RIGS[cfg.rig],
    names = texture.getFrameNames();
  for (const [anim, def] of Object.entries(rig.anims))
    for (const dir of def.dirs ?? rig.dirs) {
      const prefix = `${anim}_${dir}_`,
        key = animKey(entry.key, anim, dir),
        frames = names
          .filter((n) => n.startsWith(prefix) && /^\d+$/.test(n.slice(prefix.length)))
          .sort((a, b) => Number(a.slice(prefix.length)) - Number(b.slice(prefix.length)));
      if (!frames.length) continue;
      scene.anims.create({
        key,
        frames: frames.map((frame) => ({ key: entry.key, frame })),
        frameRate: def.frameRate,
        repeat: def.repeat,
      });
      entry.animations.push(key);
    }
  entry.ready = true;
}

/** Shared by local/remote actors; only two unused sheets remain cached after switching. */
export async function acquireAppearance(
  scene: Phaser.Scene,
  hero: HeroId,
  child: boolean,
  outfit: OutfitId | null,
  weapon = false,
): Promise<AppearanceLease | null> {
  if (!(await ensureDirectionalHero(scene, hero, child)) || !scene.sys.isActive()) return null;
  const base = directionalArt(hero, child);
  const weaponless = weapon && replacesEmbeddedSword(hero) && !child;
  if (child || (!outfit && !weaponless)) return { key: base, release() {} };
  let cache = caches.get(scene.game);
  if (!cache) {
    cache = new Map();
    caches.set(scene.game, cache);
  }
  const key = `${base}${outfit ? `-outfit-${outfit}` : ''}${weaponless ? '-weaponless' : ''}`;
  let entry = cache.get(key);
  if (!entry) {
    entry = {
      key,
      refs: 0,
      used: performance.now(),
      ready: false,
      animations: [],
      job: Promise.resolve(),
    };
    cache.set(key, entry);
    entry.job = prepare(scene, base, entry, outfit, hero, weaponless);
  }
  entry.refs++;
  try {
    await entry.job;
  } catch {
    entry.refs--;
    cache.delete(key);
    for (const animation of entry.animations) scene.anims.remove(animation);
    if (scene.textures.exists(key)) scene.textures.remove(key);
    delete CHARACTERS[key];
    return null;
  }
  let released = false;
  return {
    key,
    release() {
      if (released) return;
      released = true;
      entry!.refs--;
      entry!.used = performance.now();
      trim(scene, cache!);
    },
  };
}
export function cosmeticTextureStats(game: Phaser.Game) {
  return [...(caches.get(game)?.values() ?? [])].map(({ key, refs, ready }) => ({
    key,
    refs,
    ready,
  }));
}
