import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  clearStartupWarmCache,
  warmImage,
  warmedImage,
  warmImages,
  warmVillageStartup,
  readyStartupTextures,
} from './startupCache';

const created: FakeImage[] = [];
class FakeImage {
  decoding = '';
  fetchPriority = '';
  src = '';
  onload: (() => Promise<void>) | null = null;
  onerror: ((event?: Event) => void) | null = null;
  decode = vi.fn(() => Promise.resolve());
  constructor() {
    created.push(this);
  }
}
beforeEach(() => {
  clearStartupWarmCache();
  created.length = 0;
  vi.stubGlobal('Image', FakeImage);
});
afterEach(() => {
  clearStartupWarmCache();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it('bounds decoding to three resources and reports completed work, reusing cached images', async () => {
  const progress = vi.fn();
  const pending = warmImages(['/a.webp', '/b.webp', '/c.webp', '/d.webp', '/a.webp'], progress);
  expect(created).toHaveLength(3);
  expect(progress).toHaveBeenLastCalledWith({ completed: 0, total: 4, failed: 0 });
  await created[0].onload!();
  await Promise.resolve();
  expect(created).toHaveLength(4);
  for (const image of created.slice(1)) await image.onload!();
  expect(await pending).toEqual({ completed: 4, total: 4, failed: 0 });
  expect(await warmImages(['/a.webp', '/b.webp'])).toEqual({ completed: 2, total: 2, failed: 0 });
  expect(created).toHaveLength(4);
});
it('settles a stalled image and allows a real retry instead of hanging on the entry screen', async () => {
  vi.useFakeTimers();
  const pending = warmImage('/stalled.webp');
  await vi.advanceTimersByTimeAsync(15000);
  expect(await pending).toBe(false);
  expect(warmedImage('/stalled.webp')).toBeUndefined();
  const retry = warmImage('/stalled.webp');
  await created[1].onload!();
  expect(await retry).toBe(true);
});
it('cancels obsolete queues when the world takes ownership, without blanking decoded textures', async () => {
  const first = warmImage('/ready.webp');
  await created[0].onload!();
  await first;
  const source = created[0].src;
  const pending = warmImages(['/a.webp', '/b.webp', '/c.webp', '/d.webp']);
  clearStartupWarmCache();
  await pending;
  expect(created).toHaveLength(4);
  expect(created[0].src).toBe(source);
});
it('exposes the exact decoded village images for GPU upload with no new download on selection', async () => {
  const pending = warmVillageStartup('wang_lam', true);
  for (let done = 0; done < 17; done++) {
    const image = created[done];
    expect(image).toBeDefined();
    await image.onload!();
    await Promise.resolve();
  }
  expect((await pending).failed).toBe(0);
  expect(readyStartupTextures()).toHaveLength(17);
  const count = created.length;
  await warmVillageStartup('wang_lam', true);
  expect(created).toHaveLength(count);
});

it('shares a download and exposes the image only after decoding completes', async () => {
  const first = warmImage('/assets/custom.webp'),
    second = warmImage('/assets/custom.webp');
  expect(first).toBe(second);
  expect(created).toHaveLength(1);
  expect(created[0].fetchPriority).toBe('low');
  expect(warmedImage('/assets/custom.webp')).toBeUndefined();
  await created[0].onload!();
  expect(await first).toBe(true);
  expect(warmedImage('/assets/custom.webp')).toBe(created[0]);
});
it('lets the normal loader retry when fetching or decoding fails', async () => {
  const failed = warmImage('/assets/custom.webp');
  created[0].onerror!();
  expect(await failed).toBe(false);
  const decodeFailed = warmImage('/assets/custom.webp');
  created[1].decode.mockRejectedValueOnce(new Error('decode failed'));
  await created[1].onload!();
  expect(await decodeFailed).toBe(false);
  const retry = warmImage('/assets/custom.webp');
  await created[2].onload!();
  expect(await retry).toBe(true);
  expect(created).toHaveLength(3);
});
it('releases selection previews when the map has taken its textures', async () => {
  const pending = warmImage('/assets/custom.webp');
  await created[0].onload!();
  await pending;
  clearStartupWarmCache();
  expect(warmedImage('/assets/custom.webp')).toBeUndefined();
});
