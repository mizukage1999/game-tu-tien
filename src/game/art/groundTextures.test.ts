import { afterEach, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import {
  groundTextureStats,
  releaseGroundTextures,
  rememberGroundTextures,
  reuseGroundTextures,
} from './groundTextures';

function fixture() {
  const sources = new Map<string, { width: number; height: number }>();
  const removed: string[] = [],
    drawn: string[] = [];
  const scene = {
    game: {},
    textures: {
      exists: (key: string) => sources.has(key),
      get: (key: string) => ({ getSourceImage: () => sources.get(key)! }),
      remove: (key: string) => {
        removed.push(key);
        sources.delete(key);
      },
    },
    add: {
      image: (_x: number, _y: number, key: string) => {
        drawn.push(key);
        return {
          setOrigin() {
            return this;
          },
          setDepth() {
            return this;
          },
        };
      },
    },
  } as unknown as Phaser.Scene;
  const add = (id: string, mib: number) => {
    sources.set(id, { width: 1024, height: mib * 256 });
    rememberGroundTextures(scene, id, [{ key: id, x: 0, y: 0 }]);
  };
  return { scene, sources, removed, drawn, add };
}
afterEach(() => vi.unstubAllGlobals());
it('reuses immutable pages on return instead of repacking or uploading, and refuses missing pages', () => {
  const f = fixture();
  f.add('courtyard', 12);
  releaseGroundTextures(f.scene);
  expect(reuseGroundTextures(f.scene, 'courtyard')).toBe(true);
  expect(f.drawn).toEqual(['courtyard']);
  expect(f.removed).toEqual([]);
  f.sources.delete('courtyard');
  expect(reuseGroundTextures(f.scene, 'courtyard')).toBe(false);
});
it('evicts least recently used inactive maps within the mobile budget, including prepared village pages', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  const f = fixture();
  f.add('village', 20);
  releaseGroundTextures(f.scene);
  f.add('courtyard', 20);
  releaseGroundTextures(f.scene);
  reuseGroundTextures(f.scene, 'village');
  releaseGroundTextures(f.scene);
  f.add('waterfall', 20);
  expect(f.removed).toEqual(['courtyard']);
  expect(groundTextureStats(f.scene).entries.map((e) => e.id)).toEqual(['village', 'waterfall']);
});
it('keeps an oversized active ground valid and releases it when the scene leaves', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  const f = fixture();
  f.add('large-field', 64);
  expect(f.removed).toEqual([]);
  releaseGroundTextures(f.scene);
  expect(f.removed).toEqual(['large-field']);
});
