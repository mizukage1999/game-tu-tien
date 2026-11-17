import type Phaser from 'phaser';
import { expect, it } from 'vitest';
import { CosmeticWeapon } from './CosmeticWeapon';
import { runningSwordHand } from './embeddedSword';
import { HERO_DIRECTIONS } from './heroDirections';

function fixture() {
  const image = {
    visible: false,
    depth: 0,
    x: 0,
    y: 0,
    originX: 0,
    originY: 0,
    texture: { key: 'shadow' },
    frame: { name: '__BASE' },
    setVisible(visible: boolean) {
      this.visible = visible;
      return this;
    },
    setTexture(key: string, name: string) {
      this.texture = { key };
      this.frame = { name };
      return this;
    },
    setOrigin(x: number, y: number) {
      this.originX = x;
      this.originY = y;
      return this;
    },
    setDisplaySize() {
      return this;
    },
    setRotation() {
      return this;
    },
    setPosition(x: number, y: number) {
      this.x = x;
      this.y = y;
      return this;
    },
    setDepth(depth: number) {
      this.depth = depth;
      return this;
    },
    destroy() {},
  };
  const scene = {
    add: { image: () => image },
    textures: { exists: () => true, get: () => ({ has: () => true }) },
  } as unknown as Phaser.Scene;
  return { image, weapon: new CosmeticWeapon(scene) };
}
it('never displays a replacement over the original embedded sword while its clean body is loading', () => {
  const { image, weapon } = fixture();
  weapon.sync('kiem_anh_cuu_huyen', { x: 0, y: 0 }, 'down', false, false, 'hero-v8-wang_lam');
  expect(image.visible).toBe(false);
  weapon.sync(
    'kiem_anh_cuu_huyen',
    { x: 0, y: 0 },
    'down',
    false,
    false,
    'hero-v8-wang_lam-weaponless',
  );
  expect(image.visible).toBe(true);
  expect(image.frame.name).toBe('kiem_anh_cuu_huyen');
});
it('keeps exactly the current replacement until the original body returns after removing a skin', () => {
  const { image, weapon } = fixture();
  weapon.sync(
    'kiem_anh_thanh_van',
    { x: 0, y: 0 },
    'up',
    false,
    false,
    'hero-v8-wang_lam-weaponless',
  );
  weapon.sync(null, { x: 0, y: 0 }, 'up', false, true, 'hero-v8-wang_lam-weaponless');
  expect(image.visible).toBe(true);
  expect(image.frame.name).toBe('kiem_anh_thanh_van');
  weapon.sync(null, { x: 0, y: 0 }, 'up', false, false, 'hero-v8-wang_lam');
  expect(image.visible).toBe(false);
});
it('switches skins on the same cleaned body and hides the hand weapon while mounted', () => {
  const { image, weapon } = fixture(),
    key = 'hero-v8-wang_lam-outfit-ao_cuu_huyen-weaponless';
  weapon.sync('kiem_anh_thanh_van', { x: 0, y: 0 }, 'down', false, false, key);
  weapon.sync('kiem_anh_huyet_nguyet', { x: 0, y: 0 }, 'right', false, true, key);
  expect(image.frame.name).toBe('kiem_anh_huyet_nguyet');
  expect(image.visible).toBe(true);
  weapon.sync('kiem_anh_huyet_nguyet', { x: 0, y: 0 }, 'right', true, false, key);
  expect(image.visible).toBe(false);
});
it('anchors the right-facing handle at the authored hand instead of outside the body', () => {
  const { image, weapon } = fixture();
  weapon.sync(
    'kiem_anh_huyet_nguyet',
    { x: 100, y: 200 },
    'right',
    false,
    false,
    'hero-v8-wang_lam-weaponless',
  );
  expect(image.x).toBeCloseTo(100 + 11 * 0.94);
  expect(image.y).toBeCloseTo(200 - 41 * 0.94);
  expect(image.originX).toBe(0.5);
  expect(image.originY).toBe(213 / 256);
});
it('follows the authored right hand through all eight running poses and directions', () => {
  const { image, weapon } = fixture(),
    key = 'hero-v8-wang_lam-weaponless';
  for (const direction of HERO_DIRECTIONS)
    for (let phase = 0; phase < 8; phase++) {
      const frameY = (phase + 2) * 160,
        [x, y] = runningSwordHand(direction, frameY);
      weapon.sync('kiem_anh_cuu_huyen', { x: 100, y: 200 }, direction, false, false, key, frameY);
      expect(image.visible).toBe(true);
      expect(image.x).toBeCloseTo(100 + x * 0.94);
      expect(image.y).toBeCloseTo(200 + y * 0.94);
    }
});
it('uses a native sword only for empty-handed adult Wang running frames and restores baked idle', () => {
  const { image, weapon } = fixture();
  weapon.sync(null, { x: 0, y: 0 }, 'up', false, false, 'hero-v8-wang_lam', 320);
  expect(image.visible).toBe(true);
  expect(image.texture.key).toBe('running-native-sword');
  expect(image.originX).toBe(30 / 192);
  weapon.sync(null, { x: 0, y: 0 }, 'up', false, false, 'hero-v8-wang_lam', 0);
  expect(image.visible).toBe(false);
  weapon.sync(null, { x: 0, y: 0 }, 'up', false, false, 'hero-v8-wang_lam-child', 320);
  expect(image.visible).toBe(false);
  weapon.sync(null, { x: 0, y: 0 }, 'up', true, false, 'hero-v8-wang_lam', 320);
  expect(image.visible).toBe(false);
});
