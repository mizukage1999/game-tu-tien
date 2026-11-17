import type Phaser from 'phaser';
import { HEROES, type HeroId } from '../../data/heroes';
import { OUTFITS, type OutfitId } from '../../data/cosmetics';
import assets from '../../data/heroActionAssets.json';
import { HERO_DIRECTIONS } from './heroDirections';
import {
  HERO_ACTIONS,
  type HeroActionAtlas,
  setHeroAnimationDefinition,
  heroAnimationDefinition,
} from './heroActionSpec';
import { animKey, CHARACTERS } from './generate';
import { addStaticTexture } from './staticTexture';
import { dyeGarmentCell } from './garmentPalette';

interface Page {
  key: string;
  textures: string[];
  refs: number;
  used: number;
  ready: boolean;
  job: Promise<void>;
  animations: Set<string>;
}
const pages = new WeakMap<Phaser.Game, Map<string, Page>>();
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
// Generated JSON is validated by verify-runtime-assets (including four-number grip tuples).
const catalog = assets as unknown as Record<HeroId, HeroActionAtlas>;
const textureKey = (group: string, page: number) => group + '-p' + page;
const usable = (scene: Phaser.Scene) => scene.sys.isActive() || scene.sys.isPaused();
async function uploadOpportunity(scene: Phaser.Scene) {
  const start = performance.now();
  do {
    await nextFrame();
    if (!usable(scene)) throw Error('SCENE_STOPPED');
  } while (
    !scene.sys.isPaused() &&
    (scene as Phaser.Scene & { player?: { ctrl: { locked: boolean } } }).player?.ctrl.locked &&
    performance.now() - start < 750
  );
}
function download(scene: Phaser.Scene, url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.fetchPriority = 'low';
    let finished = false;
    const end = (ready: boolean) => {
      if (finished) return;
      finished = true;
      scene.events.off('shutdown', stopped);
      image.onload = null;
      image.onerror = null;
      if (ready) resolve(image);
      else reject(Error('ACTION_IMAGE_FAILED'));
    };
    const stopped = () => {
      end(false);
      image.src = '';
    };
    scene.events.once('shutdown', stopped);
    image.onerror = () => end(false);
    image.onload = () => {
      void image.decode().then(
        () => end(true),
        () => end(false),
      );
    };
    image.src = url;
  });
}
function installFrames(
  texture: Phaser.Textures.Texture,
  atlas: HeroActionAtlas,
  pageIndex: number,
) {
  for (const [name, f] of Object.entries(atlas.frames)) {
    if (f.page !== pageIndex) continue;
    if (texture.has(name)) continue;
    const frame = texture.add(name, 0, f.x, f.y, f.w, f.h);
    if (!frame) throw Error('ACTION_FRAME_FAILED');
    frame.setTrim(160, 160, f.ox, f.oy, f.w, f.h);
    Object.assign(frame.customData, {
      heroAction: name.replace(/_(down(?:-left|-right)?|up(?:-left|-right)?|left|right)_\d+$/, ''),
      heroAuthored: true,
      heroHand: f.hand,
    });
  }
}
function drop(scene: Phaser.Scene, cache: Map<string, Page>, page: Page) {
  cache.delete(page.key);
  for (const key of page.animations) scene.anims.remove(key);
  for (const key of page.textures) if (scene.textures.exists(key)) scene.textures.remove(key);
}
function trim(scene: Phaser.Scene, cache: Map<string, Page>) {
  const unused = [...cache.values()]
    .filter((p) => p.ready && p.refs === 0)
    .sort((a, b) => b.used - a.used);
  for (const page of unused.slice(1)) {
    drop(scene, cache, page);
  }
}
function pageFor(
  scene: Phaser.Scene,
  hero: HeroId,
  outfit: OutfitId | null,
  cache: Map<string, Page>,
): Page {
  const atlas = catalog[hero];
  const key = 'hero-actions-v1-' + hero + (outfit ? '-outfit-' + outfit : '');
  const existing = cache.get(key);
  if (existing) return existing;
  const page: Page = {
    key,
    textures: atlas.pages.map((_, i) => textureKey(key, i)),
    refs: 0,
    used: performance.now(),
    ready: false,
    animations: new Set(),
    job: Promise.resolve(),
  };
  cache.set(key, page);
  page.job = (async () => {
    if (!outfit) {
      const images = await Promise.all(
        atlas.pages.map((p, i) =>
          scene.textures.exists(textureKey(key, i)) ? null : download(scene, p.url),
        ),
      );
      for (const [i, image] of images.entries()) {
        await uploadOpportunity(scene);
        const texture = image
          ? scene.textures.addImage(textureKey(key, i), image)
          : scene.textures.get(textureKey(key, i));
        if (!texture) throw Error('ACTION_IMAGE_FAILED');
        installFrames(texture, atlas, i);
      }
    } else {
      const base = pageFor(scene, hero, null, cache);
      base.refs++;
      try {
        await base.job;
        if (!usable(scene)) throw Error('SCENE_STOPPED');
        for (let pageIndex = 0; pageIndex < atlas.pages.length; pageIndex++) {
          const source = scene.textures
            .get(textureKey(base.key, pageIndex))
            .getSourceImage() as HTMLImageElement;
          const canvas = document.createElement('canvas');
          canvas.width = source.width;
          canvas.height = source.height;
          const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
          ctx.drawImage(source, 0, 0);
          const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const palette = OUTFITS.find((x) => x.id === outfit)!;
          let processed = 0;
          for (const f of Object.values(atlas.frames)) {
            if (f.page !== pageIndex) continue;
            dyeGarmentCell(
              pixels.data,
              canvas.width,
              canvas.height,
              { x: f.x, y: f.y, width: f.w, height: f.h },
              palette,
            );
            if (++processed % 8 === 0) {
              await nextFrame();
              if (!usable(scene)) throw Error('SCENE_STOPPED');
            }
          }
          ctx.putImageData(pixels, 0, 0);
          await uploadOpportunity(scene);
          const texture = addStaticTexture(scene, textureKey(key, pageIndex), canvas);
          if (!texture) throw Error('ACTION_OUTFIT_FAILED');
          installFrames(texture, atlas, pageIndex);
        }
      } finally {
        base.refs--;
        base.used = performance.now();
        if (base.refs === 0 && !base.ready) drop(scene, cache, base);
      }
    }
    page.ready = true;
  })();
  return page;
}

/** Separate from startup/movement sheets. Refcounts cover local and remote controllers. */
export async function ensureHeroActions(
  scene: Phaser.Scene,
  bodyKey: string,
): Promise<(() => void) | null> {
  if (!bodyKey.startsWith('hero-v8-') || bodyKey.includes('-child') || !CHARACTERS[bodyKey])
    return null;
  const hero = HEROES.find((h) => bodyKey.startsWith('hero-v8-' + h.id))?.id;
  if (!hero || !catalog[hero]) return null;
  const outfit = OUTFITS.find((o) => bodyKey.includes('-outfit-' + o.id))?.id ?? null;
  let cache = pages.get(scene.game);
  if (!cache) {
    cache = new Map();
    pages.set(scene.game, cache);
  }
  const page = pageFor(scene, hero, outfit, cache);
  page.refs++;
  try {
    await page.job;
    if (!usable(scene)) throw Error('SCENE_STOPPED');
    for (const [name, def] of Object.entries(HERO_ACTIONS))
      for (const dir of HERO_DIRECTIONS) {
        const key = animKey(bodyKey, name, dir) + ':authored',
          previous = scene.anims.get(key);
        if (heroAnimationDefinition(previous) === def) continue;
        // Fallback animations keep their own keys: removing one would stop in-flight hits in Phaser.
        const animation = scene.anims.create({
          key,
          frames: Array.from({ length: def.frames }, (_, i) => ({
            key: textureKey(
              page.key,
              catalog[hero].frames[def.source + '_' + dir + '_' + (def.poses?.[i] ?? i)].page,
            ),
            frame: def.source + '_' + dir + '_' + (def.poses?.[i] ?? i),
            duration: def.durations?.[i] ?? 0,
          })),
          frameRate: def.frameRate,
          repeat: def.repeat,
        });
        if (!animation) throw Error('ACTION_ANIMATION_FAILED');
        setHeroAnimationDefinition(animation, def);
        page.animations.add(key);
      }
  } catch {
    page.refs--;
    if (page.refs === 0) drop(scene, cache, page);
    return null;
  }
  trim(scene, cache);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    page.refs--;
    page.used = performance.now();
    trim(scene, cache!);
  };
}
export function heroActionTextureStats(game: Phaser.Game) {
  return [...(pages.get(game)?.values() ?? [])].map(({ key, refs, ready, textures }) => ({
    key,
    refs,
    ready,
    pages: textures.length,
  }));
}
