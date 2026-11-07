import type Phaser from 'phaser';
import { expect, it } from 'vitest';
import { CosmeticWeapon } from './CosmeticWeapon';

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
it('moves the sword with both lifted run poses without drifting away from the hand', () => {
  const { image, weapon } = fixture(),
    key = 'hero-v8-wang_lam-weaponless';
  weapon.sync('kiem_anh_cuu_huyen', { x: 100, y: 200 }, 'right', false, false, key, 0);
  const idleY = image.y,
    idleX = image.x;
  weapon.sync('kiem_anh_cuu_huyen', { x: 100, y: 200 }, 'right', false, false, key, 160);
  expect(image.y).toBeCloseTo(idleY - 1.5 * 0.94);
  expect(image.x).toBe(idleX);
  weapon.sync('kiem_anh_cuu_huyen', { x: 100, y: 200 }, 'right', false, false, key, 320);
  expect(image.y).toBeCloseTo(idleY + 1.5 * 0.94);
  expect(image.x).toBe(idleX);
});
