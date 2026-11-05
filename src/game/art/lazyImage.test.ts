import type Phaser from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import { ensureImage } from './lazyImage';

type Listener = (...args: unknown[]) => void;
class Events {
  private listeners = new Map<string, Map<Listener, boolean>>();
  on(name: string, fn: Listener) {
    const entries = this.listeners.get(name) ?? new Map<Listener, boolean>();
    entries.set(fn, false);
    this.listeners.set(name, entries);
    return this;
  }
  once(name: string, fn: Listener) {
    this.on(name, fn);
    this.listeners.get(name)!.set(fn, true);
    return this;
  }
  off(name: string, fn: Listener) {
    this.listeners.get(name)?.delete(fn);
    return this;
  }
  emit(name: string, ...args: unknown[]) {
    for (const [fn, once] of [...(this.listeners.get(name) ?? [])]) {
      if (once) this.off(name, fn);
      fn(...args);
    }
    return true;
  }
  listenerCount(name: string) {
    return this.listeners.get(name)?.size ?? 0;
  }
}

function fixture() {
  const textures = new Set<string>();
  const load = Object.assign(new Events(), {
    image: vi.fn(),
    isLoading: vi.fn(() => false),
    start: vi.fn(),
  });
  const events = new Events();
  const scene = {
    game: {},
    textures: { exists: (key: string) => textures.has(key) },
    load,
    events,
  } as unknown as Phaser.Scene;
  let built = false;
  const prepare = vi.fn(() => {
    built = true;
  });
  const request = () =>
    ensureImage(scene, 'visitor-source', '/assets/custom.png', () => built, prepare);
  return { scene, textures, load, events, prepare, request };
}

describe('on-demand artwork', () => {
  it('shares concurrent work and prepares exactly once', async () => {
    const f = fixture(),
      a = f.request(),
      b = f.request();
    expect(a).toBe(b);
    expect(f.load.image).toHaveBeenCalledTimes(1);
    f.load.emit('filecomplete-image-visitor-source');
    expect(await a).toBe(true);
    expect(f.prepare).toHaveBeenCalledTimes(1);
    expect(await f.request()).toBe(true);
    expect(f.load.image).toHaveBeenCalledTimes(1);
    expect(f.load.listenerCount('loaderror')).toBe(0);
    expect(f.events.listenerCount('shutdown')).toBe(0);
  });
  it('does not restart an active map loader', () => {
    const f = fixture();
    f.load.isLoading.mockReturnValue(true);
    void f.request();
    expect(f.load.start).not.toHaveBeenCalled();
    f.events.emit('shutdown');
  });
  it('retries after a failed download and ignores failures of other files', async () => {
    const f = fixture(),
      request = f.request();
    f.load.emit('loaderror', { key: 'another-file' });
    expect(f.prepare).not.toHaveBeenCalled();
    f.load.emit('loaderror', { key: 'visitor-source' });
    expect(await request).toBe(false);
    const retry = f.request();
    expect(f.load.image).toHaveBeenCalledTimes(2);
    f.load.emit('filecomplete-image-visitor-source');
    expect(await retry).toBe(true);
  });
  it('releases a stopped map and prevents a late build', async () => {
    const f = fixture(),
      request = f.request();
    f.events.emit('shutdown');
    expect(await request).toBe(false);
    f.load.emit('filecomplete-image-visitor-source');
    expect(f.prepare).not.toHaveBeenCalled();
    expect(f.load.listenerCount('filecomplete-image-visitor-source')).toBe(0);
  });
  it('prepares an already downloaded source without fetching it twice', async () => {
    const f = fixture();
    f.textures.add('visitor-source');
    expect(await f.request()).toBe(true);
    expect(f.prepare).toHaveBeenCalledTimes(1);
    expect(f.load.image).not.toHaveBeenCalled();
  });
});
