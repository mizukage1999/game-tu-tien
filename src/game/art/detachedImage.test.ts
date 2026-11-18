import { afterEach, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import { ensureDetachedImage } from './detachedImage';

function fixture() {
  const images: FakeImage[] = [],
    callbacks = new Set<() => void>();
  class FakeImage {
    src = '';
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    decode = () => Promise.resolve();
    constructor() {
      images.push(this);
    }
  }
  vi.stubGlobal('Image', FakeImage);
  vi.stubGlobal('requestAnimationFrame', (fn: () => void) => {
    fn();
    return 0;
  });
  const scene = {
    game: {},
    events: {
      once: (_: string, fn: () => void) => callbacks.add(fn),
      off: (_: string, fn: () => void) => callbacks.delete(fn),
    },
  } as unknown as Phaser.Scene;
  let ready = false;
  const prepare = vi.fn(() => {
    ready = true;
  });
  const load = () => ensureDetachedImage(scene, 'gate', '/gate.webp', () => ready, prepare);
  return { load, images, prepare, shutdown: () => [...callbacks].forEach((fn) => fn()) };
}
afterEach(() => vi.unstubAllGlobals());
it('deduplicates background requests and prepares once without a Phaser loader', async () => {
  const f = fixture(),
    a = f.load(),
    b = f.load();
  expect(a).toBe(b);
  expect(f.images).toHaveLength(1);
  f.images[0].onload!();
  expect(await a).toBe(true);
  expect(f.prepare).toHaveBeenCalledOnce();
  expect(await f.load()).toBe(true);
  expect(f.images).toHaveLength(1);
});
it('cancels the departed scene and allows the next scene to retry', async () => {
  const f = fixture(),
    a = f.load();
  f.shutdown();
  expect(await a).toBe(false);
  expect(f.images[0].src).toBe('');
  expect(f.prepare).not.toHaveBeenCalled();
  const b = f.load();
  f.images[1].onload!();
  expect(await b).toBe(true);
});
it('does not upload stale decoded art after scene shutdown', async () => {
  const f = fixture();
  let decode!: () => void;
  const a = f.load();
  f.images[0].decode = () =>
    new Promise<void>((r) => {
      decode = r;
    });
  f.images[0].onload!();
  f.shutdown();
  decode();
  await Promise.resolve();
  expect(await a).toBe(false);
  expect(f.prepare).not.toHaveBeenCalled();
});
it('a failed download does not poison the retry cache', async () => {
  const f = fixture(),
    a = f.load();
  f.images[0].onerror!();
  expect(await a).toBe(false);
  const b = f.load();
  f.images[1].onload!();
  expect(await b).toBe(true);
});
