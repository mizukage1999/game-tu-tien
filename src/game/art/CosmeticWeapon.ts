import type Phaser from 'phaser';
import { WEAPON_SKINS, type WeaponSkinId } from '../../data/cosmetics';
import { ensureImage } from './lazyImage';
import { placeActor } from './actorDepth';
import { flightRotation } from '../systems/flightVisual';
import { isoVector } from './iso';
import { HERO_WORLD_SCALE } from './heroVisual';
import type { HeroDirection } from './heroDirections';
import type { Vec2 } from '../types';

export const COSMETIC_WEAPONS_URL = '/assets/ui/cosmetic-weapons-v1.webp';
const TEXTURE = 'cosmetic-weapon-skins';
export const COSMETIC_HAND: Record<HeroDirection, [number, number, number, number]> = {
  down: [-17, -44, -0.7, 0.85],
  'down-left': [-17, -44, -0.6, 0.85],
  left: [-15, -44, -0.4, 0.95],
  'up-left': [-18, -45, -0.35, 0.9],
  up: [-18, -44, -0.4, 0.85],
  'up-right': [18, -44, 0.4, 0.85],
  right: [18, -44, 0.65, 0.8],
  'down-right': [14, -44, 0.85, 0.65],
};
export function ensureCosmeticWeapons(scene: Phaser.Scene) {
  return ensureImage(
    scene,
    TEXTURE,
    COSMETIC_WEAPONS_URL,
    () => scene.textures.exists(TEXTURE) && scene.textures.get(TEXTURE).has(WEAPON_SKINS[0].id),
    () => {
      const t = scene.textures.get(TEXTURE),
        s = t.getSourceImage() as HTMLImageElement;
      WEAPON_SKINS.forEach((skin, i) => {
        if (!t.has(skin.id)) t.add(skin.id, 0, (i * s.width) / 3, 0, s.width / 3, s.height);
      });
    },
  );
}

/** An opt-in sword appearance; no hit box, attacks, stats or default equipment are changed. */
export class CosmeticWeapon {
  private image: Phaser.GameObjects.Image;
  private skin: WeaponSkinId | null = null;
  private requested = false;
  constructor(private scene: Phaser.Scene) {
    this.image = scene.add.image(0, 0, 'shadow').setVisible(false);
  }
  sync(
    skin: WeaponSkinId | null,
    spot: Vec2,
    direction: HeroDirection,
    hidden: boolean,
    casting = false,
  ) {
    this.skin = skin;
    if (skin && !this.requested) {
      this.requested = true;
      void ensureCosmeticWeapons(this.scene);
    }
    const ready =
      !!skin && this.scene.textures.exists(TEXTURE) && this.scene.textures.get(TEXTURE).has(skin);
    this.image.setVisible(ready && !hidden);
    if (!ready || hidden) return;
    let [x, y, dx, dy] = COSMETIC_HAND[direction];
    if (casting) {
      const side = direction.includes('right') ? 1 : -1;
      x = side * 14;
      y = -53;
      dx = side;
      dy = 0.15;
    }
    const back = direction.startsWith('up');
    if (this.image.texture.key !== TEXTURE || this.image.frame.name !== skin)
      this.image.setTexture(TEXTURE, skin!);
    this.image
      .setOrigin(0.5, 0.8)
      .setDisplaySize(28 * HERO_WORLD_SCALE, 78 * HERO_WORLD_SCALE)
      .setRotation(Math.atan2(dy, dx) + Math.PI / 2);
    placeActor(
      this.image,
      spot.x + x * HERO_WORLD_SCALE,
      spot.y + y * HERO_WORLD_SCALE,
      spot.y + (back ? -0.05 : 0.05),
    );
  }
  placeMount(
    image: Phaser.GameObjects.Image,
    mount: 'sword' | 'crane',
    facing: Vec2,
    spot: Vec2,
    lift: number,
  ) {
    const dressed =
      mount === 'sword' &&
      this.skin &&
      this.scene.textures.exists(TEXTURE) &&
      this.scene.textures.get(TEXTURE).has(this.skin);
    if (dressed)
      image
        .setTexture(TEXTURE, this.skin!)
        .setOrigin(0.5)
        .setDisplaySize(28, 145)
        .setFlipX(false)
        .setRotation(flightRotation(facing) + Math.PI / 2);
    else
      image
        .setTexture(`immortal-${mount}`)
        .setOrigin(0.5)
        .setDisplaySize(160, 100)
        .setFlipX(mount === 'crane' && isoVector(facing.x, facing.y).x < 0)
        .setRotation(mount === 'sword' ? flightRotation(facing) : 0);
    placeActor(
      image,
      spot.x,
      spot.y - lift + (dressed ? 8 : mount === 'sword' ? -1 : 20),
      spot.y - 0.1,
    );
  }
  destroy() {
    this.image.destroy();
  }
}
