import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { clearStartupWarmCache, warmImage, warmedImage } from './startupCache';

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
