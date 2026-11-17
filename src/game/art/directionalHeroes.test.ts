import { expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import { HEROES } from '../../data/heroes';
import { HERO_DIRECTIONS } from './heroDirections';
import { directionalArt, registerDirectionalHeroes } from './directionalHeroes';
import { RIGS } from './generate';

vi.mock('./generate', () => ({
  RIGS: {},
  CHARACTERS: {},
  frameName: (anim: string, dir: string, frame: number) => `${anim}_${dir}_${frame}`,
  registerCharacterArt: vi.fn(),
}));
vi.mock('./lazyImage', () => ({ ensureImage: vi.fn() }));
vi.mock('../systems/character', () => ({ playerArt: vi.fn() }));

it('registers eight different run cells for every facing, hero and age, preserving combat impact poses', () => {
  const textures = new Map<string, Map<string, { x: number; y: number; w: number }>>();
  for (const hero of HEROES)
    for (const child of [false, true]) textures.set(directionalArt(hero.id, child), new Map());
  const scene = {
    textures: {
      exists: (key: string) => textures.has(key),
      get: (key: string) => ({
        has: (name: string) => textures.get(key)!.has(name),
        add: (name: string, _source: number, x: number, y: number, w: number) =>
          textures.get(key)!.set(name, { x, y, w }),
      }),
    },
  } as unknown as Phaser.Scene;
  registerDirectionalHeroes(scene);
  for (const hero of HEROES)
    for (const child of [false, true]) {
      const cell = child ? 128 : 160,
        frames = textures.get(directionalArt(hero.id, child))!;
      for (const [col, dir] of HERO_DIRECTIONS.entries()) {
        const running = Array.from({ length: 8 }, (_, i) => frames.get(`run_${dir}_${i}`)!);
        expect(new Set(running.map((f) => f.y)).size).toBe(8);
        expect(running.every((f) => f.x === col * cell && f.w === cell && f.y >= 2 * cell)).toBe(
          true,
        );
        expect(frames.get(`idle_${dir}_0`)!.y).toBe(0);
        expect(frames.get(`cast_${dir}_1`)!.y).toBe(cell);
        expect(frames.get(`attack_1_${dir}_1`)!.y).toBe(cell);
      }
    }
  expect(RIGS.hero_v8.anims.run.frames).toBe(8);
  expect(RIGS.hero_v8.anims.run.frameRate).toBe(12);
});
