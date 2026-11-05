import type Phaser from 'phaser';
import { expect, it, vi } from 'vitest';
import { ensureRealmCrests, REALM_CREST_ASSET, REALM_CREST_TEXTURE } from './realmCrests';

type Listener = (...args: unknown[]) => void;
class Events {
  private listeners = new Map<string, Set<Listener>>();
  on(name: string, listener: Listener) {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name)!.add(listener);
    return this;
  }
  off(name: string, listener: Listener) {
    this.listeners.get(name)?.delete(listener);
    return this;
  }
  once(name: string, listener: Listener) {
    const run: Listener = (...args) => {
      this.off(name, run);
      listener(...args);
    };
    return this.on(name, run);
  }
  emit(name: string, ...args: unknown[]) {
    for (const listener of [...(this.listeners.get(name) ?? [])]) listener(...args);
  }
}

it('loads one small realm image and adds frames without uploading a second texture', async () => {
  const frames = new Set<number>();
  const texture = {
    has: (frame: string) => frames.has(Number(frame)),
    add: vi.fn((frame: number) => frames.add(frame)),
  };
  let downloaded = false;
  const load = Object.assign(new Events(), {
    image: vi.fn(),
    start: vi.fn(),
    isLoading: () => false,
  });
  const textures = { exists: () => downloaded, get: () => texture, addSpriteSheet: vi.fn() };
  const scene = { game: {}, textures, load, events: new Events() } as unknown as Phaser.Scene;
  const first = ensureRealmCrests(scene),
    second = ensureRealmCrests(scene);
  expect(first).toBe(second);
  expect(load.image).toHaveBeenCalledTimes(1);
  expect(load.image).toHaveBeenCalledWith(REALM_CREST_TEXTURE, REALM_CREST_ASSET);
  downloaded = true;
  load.emit(`filecomplete-image-${REALM_CREST_TEXTURE}`);
  expect(await first).toBe(true);
  expect(frames.size).toBe(12);
  expect(texture.add).toHaveBeenLastCalledWith(11, 0, 512, 384, 256, 128);
  expect(textures.addSpriteSheet).not.toHaveBeenCalled();
  expect(await ensureRealmCrests(scene)).toBe(true);
  expect(load.image).toHaveBeenCalledTimes(1);
  expect(texture.add).toHaveBeenCalledTimes(12);
});
