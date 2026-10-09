import Phaser from 'phaser';

/** White flash on the hit sprite. */
export function flash(scene: Phaser.Scene, sprite: Phaser.GameObjects.Sprite, color = 0xffffff, ms = 90) {
  sprite.setTintFill(color);
  scene.time.delayedCall(ms, () => {
    if (sprite.active) sprite.clearTint();
  });
}

/** Spark burst at the impact point. */
export function impact(scene: Phaser.Scene, x: number, y: number, tint = 0xbfefff, crit = false) {
  const burst = scene.add
    .image(x, y, 'fx_burst')
    .setBlendMode(Phaser.BlendModes.ADD)
    .setTint(tint)
    .setDepth(99000)
    .setScale(crit ? 0.7 : 0.45)
    .setRotation(Math.random() * Math.PI);
  scene.tweens.add({
    targets: burst,
    scale: crit ? 1.4 : 0.9,
    alpha: 0,
    duration: 220,
    onComplete: () => burst.destroy(),
  });
  const spark = scene.add
    .image(x, y, 'fx_spark')
    .setBlendMode(Phaser.BlendModes.ADD)
    .setTint(tint)
    .setDepth(99001)
    .setScale(crit ? 1.6 : 1);
  scene.tweens.add({ targets: spark, scale: 0.2, alpha: 0, angle: 90, duration: 260, onComplete: () => spark.destroy() });
}

/** Short push away from `from` using an arcade body velocity impulse. */
export function knockback(
  scene: Phaser.Scene,
  sprite: Phaser.Physics.Arcade.Sprite,
  fromX: number,
  fromY: number,
  force = 160,
) {
  const body = sprite.body as Phaser.Physics.Arcade.Body | null;
  if (!body) return;
  const a = Phaser.Math.Angle.Between(fromX, fromY, sprite.x, sprite.y);
  body.setVelocity(Math.cos(a) * force, Math.sin(a) * force);
  scene.time.delayedCall(110, () => {
    if (sprite.active && sprite.body) (sprite.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
  });
}
