import type Phaser from 'phaser';
import { addStaticTexture } from './staticTexture';
import { GROUND_PREFIX } from '../../data/startupPlan';
export { GROUND_PREFIX } from '../../data/startupPlan';
interface GroundPage {
  key: string;
  x: number;
  y: number;
}
interface GroundEntry {
  pages: GroundPage[];
  bytes: number;
}
interface GroundCache {
  active: string | null;
  entries: Map<string, GroundEntry>;
}
const caches = new WeakMap<Phaser.Game, GroundCache>();
function cacheFor(scene: Phaser.Scene) {
  let cache = caches.get(scene.game);
  if (!cache) {
    cache = { active: null, entries: new Map() };
    caches.set(scene.game, cache);
  }
  return cache;
}
const budget = () =>
  (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches ? 48 : 96) *
  1024 *
  1024;
function evict(scene: Phaser.Scene, reserve = 0) {
  const cache = cacheFor(scene);
  let bytes = [...cache.entries.values()].reduce((n, e) => n + e.bytes, 0) + reserve;
  for (const [id, entry] of cache.entries) {
    if (bytes <= budget()) break;
    if (id === cache.active) continue;
    for (const p of entry.pages) if (scene.textures.exists(p.key)) scene.textures.remove(p.key);
    cache.entries.delete(id);
    bytes -= entry.bytes;
  }
}
export function releaseGroundTextures(scene: Phaser.Scene) {
  cacheFor(scene).active = null;
  evict(scene);
}
function drawPages(scene: Phaser.Scene, pages: GroundPage[]) {
  for (const p of pages)
    scene.add.image(p.x, p.y, p.key, 'ground').setOrigin(0, 0).setDepth(-10000);
}
export function rememberGroundTextures(scene: Phaser.Scene, mapId: string, pages: GroundPage[]) {
  const cache = cacheFor(scene);
  const bytes = pages.reduce((n, p) => {
    const source = scene.textures.get(p.key).getSourceImage() as HTMLImageElement;
    return n + source.width * source.height * 4;
  }, 0);
  cache.entries.delete(mapId);
  cache.entries.set(mapId, { pages, bytes });
  cache.active = mapId;
  evict(scene);
}
export function groundTextureStats(scene: Phaser.Scene) {
  const cache = cacheFor(scene);
  return {
    active: cache.active,
    budget: budget(),
    entries: [...cache.entries].map(([id, e]) => ({ id, bytes: e.bytes, pages: e.pages.length })),
  };
}
/** Revisit an immutable map without repainting or uploading its ground again. */
export function reuseGroundTextures(scene: Phaser.Scene, mapId: string) {
  const cache = cacheFor(scene),
    entry = cache.entries.get(mapId);
  if (!entry || entry.pages.some((p) => !scene.textures.exists(p.key))) return false;
  cache.entries.delete(mapId);
  cache.entries.set(mapId, entry);
  cache.active = mapId;
  drawPages(scene, entry.pages);
  return true;
}
/** Immutable pages with a bounded GPU cache; no full RGBA readback. */
export function addGroundTextures(scene: Phaser.Scene, source: HTMLCanvasElement, mapId: string) {
  const cache = cacheFor(scene),
    pages: GroundPage[] = [],
    page = 1024;
  cache.active = null;
  evict(scene, (source.width + 2) * (source.height + 2) * 4);
  let bytes = 0;
  for (let y = 0; y < source.height; y += page)
    for (let x = 0; x < source.width; x += page) {
      const width = Math.min(page, source.width - x),
        height = Math.min(page, source.height - y);
      const canvas = document.createElement('canvas');
      canvas.width = width + 2;
      canvas.height = height + 2;
      canvas
        .getContext('2d')!
        .drawImage(source, x - 1, y - 1, width + 2, height + 2, 0, 0, width + 2, height + 2);
      const key = GROUND_PREFIX + ':' + mapId + ':' + x + ':' + y,
        texture = addStaticTexture(scene, key, canvas)!;
      texture.add('ground', 0, 1, 1, width, height);
      pages.push({ key, x, y });
      bytes += canvas.width * canvas.height * 4;
    }
  cache.entries.set(mapId, { pages, bytes });
  cache.active = mapId;
  evict(scene);
  drawPages(scene, pages);
  source.width = source.height = 1;
}
