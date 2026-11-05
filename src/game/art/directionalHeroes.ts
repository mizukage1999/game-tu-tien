import type Phaser from 'phaser';
import { HEROES, type HeroId } from '../../data/heroes';
import startup from '../../data/startupAssets.json';
import { HERO_DIRECTIONS } from './heroDirections';
import { CHARACTERS, RIGS, frameName, registerCharacterArt } from './generate';
import { ensureImage } from './lazyImage';
import { playerArt } from '../systems/character';
import { preparedHeroTexture } from '../../data/startupPlan';

export function directionalArt(id: HeroId, child = false) {
  return preparedHeroTexture(id, child);
}
export function directionalAsset(id: HeroId, child = false) {
  return (startup.urls as Record<string, string>)[`hero-${child ? 'child' : 'adult'}-${id}`];
}
export function directionalReady(scene: Phaser.Scene, id: HeroId, child = false) {
  const key = directionalArt(id, child);
  return scene.textures.exists(key) && scene.textures.get(key).has(frameName('idle', 'down', 0));
}

/** Authored scale and feet anchors are prepared by the asset compiler. */
export function registerDirectionalHeroes(
  scene: Phaser.Scene,
  selected?: readonly { id: HeroId; child: boolean }[],
) {
  for (const child of [false, true]) {
    const cell = child ? 128 : 160,
      rig = `hero_v8${child ? '_child' : ''}`;
    RIGS[rig] = {
      frameWidth: cell,
      frameHeight: cell,
      originY: (child ? 118 : 150) / cell,
      dirs: [...HERO_DIRECTIONS],
      anims: {
        idle: { frames: 1, frameRate: 1, repeat: -1 },
        run: { frames: 4, frameRate: 9, repeat: -1 },
        attack: { frames: 3, frameRate: 8, repeat: 0, hitFrame: 1 },
        attack_1: { frames: 3, frameRate: 8, repeat: 0, hitFrame: 1 },
        attack_2: { frames: 3, frameRate: 8, repeat: 0, hitFrame: 1 },
        attack_3: { frames: 3, frameRate: 8, repeat: 0, hitFrame: 1 },
        cast: { frames: 3, frameRate: 7, repeat: 0, hitFrame: 1 },
        hurt: { frames: 2, frameRate: 9, repeat: 0 },
        downed: { frames: 1, frameRate: 1, repeat: 0 },
        meditate: { frames: 1, frameRate: 1, repeat: -1 },
      },
    };
    for (const hero of HEROES) {
      if (selected && !selected.some((s) => s.id === hero.id && s.child === child)) continue;
      const key = directionalArt(hero.id, child);
      if (!scene.textures.exists(key)) continue;
      const texture = scene.textures.get(key);
      if (!directionalReady(scene, hero.id, child)) {
        for (const [col, dir] of HERO_DIRECTIONS.entries()) {
          const add = (anim: string, poses: number[]) =>
            poses.forEach((row, i) =>
              texture.add(frameName(anim, dir, i), 0, col * cell, row * cell, cell, cell),
            );
          add('idle', [0]);
          add('run', [1, 0, 2, 0]);
          for (const anim of ['attack', 'attack_1', 'attack_2', 'attack_3', 'cast'])
            add(anim, [0, 3, 0]);
          add('hurt', [3, 0]);
          add('downed', [3]);
          add('meditate', [0]);
        }
      }
      CHARACTERS[key] = { rig, palette: hero.sex === 'male' ? 'player_male' : 'player' };
    }
  }
}

/** Keep a valid peer fallback until that character's prepared sheet arrives. */
export function ensureDirectionalHero(scene: Phaser.Scene, id: HeroId, child: boolean) {
  if (directionalReady(scene, id, child)) return Promise.resolve(true);
  const register = () => {
    registerDirectionalHeroes(scene, [{ id, child }]);
    registerCharacterArt(scene, new Set());
  };
  if (scene.textures.exists(directionalArt(id, child))) {
    register();
    return Promise.resolve(true);
  }
  registerCharacterArt(scene, new Set([playerArt(HEROES.find((hero) => hero.id === id)!.sex)]));
  return ensureImage(
    scene,
    directionalArt(id, child),
    directionalAsset(id, child),
    () => directionalReady(scene, id, child),
    register,
  );
}
