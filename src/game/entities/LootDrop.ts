import Phaser from 'phaser';
import { ITEMS } from '../../data';
import { LOOT_LIFETIME_MS, MAGNET_RADIUS, PICKUP_RADIUS } from '../systems/loot';
import type { Vec2 } from '../types';
import type { WorldScene } from '../scenes/WorldScene';

export class LootDrop extends Phaser.Physics.Arcade.Image {
  ready = false;
  collected = false;
  private glow: Phaser.GameObjects.Image;
  private age = 0;
  private bobTween: Phaser.Tweens.Tween | null = null;

  constructor(
    private world: WorldScene,
    readonly item: string,
    readonly qty: number,
    from: Vec2,
    to: Vec2,
  ) {
    super(world, from.x, from.y, `loot_${item}`);
    world.add.existing(this);
    world.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(PICKUP_RADIUS, 16 - PICKUP_RADIUS, 16 - PICKUP_RADIUS);
    body.setAllowGravity(false);
    body.moves = false;
    this.setOrigin(0.5, 0.5).setScale(item === 'linh_khi' ? 0.85 : 0.9);
    const color = Phaser.Display.Color.HexStringToColor(ITEMS[item]?.color ?? '#ffffff').color;
    this.glow = world.add
      .image(from.x, from.y, 'fx_dot')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(color)
      .setScale(3)
      .setAlpha(0.7);

    // pop out of the monster in an arc
    const peak = Math.min(from.y, to.y) - 46;
    this.world.tweens.add({ targets: this, x: to.x, duration: 520, ease: 'Linear' });
    this.world.tweens.chain({
      targets: this,
      tweens: [
        { y: peak, duration: 240, ease: 'Quad.Out' },
        { y: to.y, duration: 280, ease: 'Bounce.Out' },
      ],
      onComplete: () => {
        this.ready = true;
        this.bobTween = this.world.tweens.add({
          targets: this,
          y: to.y - 5,
          yoyo: true,
          repeat: -1,
          duration: 700,
          ease: 'Sine.InOut',
        });
      },
    });
  }

  tick(dt: number, player: Vec2) {
    if (this.collected) return;
    this.age += dt;
    this.setDepth(this.y);
    this.glow.setPosition(this.x, this.y + 2).setDepth(this.y - 1);
    if (this.age > LOOT_LIFETIME_MS - 5000) this.setAlpha(Math.floor(this.age / 150) % 2 ? 0.3 : 1);
    if (this.age > LOOT_LIFETIME_MS) {
      this.destroy();
      return;
    }
    if (!this.ready) return;
    const d = Math.hypot(player.x - this.x, player.y - 24 - this.y);
    if (d < MAGNET_RADIUS) {
      this.bobTween?.stop();
      const k = Math.min(1, (dt / 1000) * 9);
      this.x += (player.x - this.x) * k;
      this.y += (player.y - 24 - this.y) * k;
      (this.body as Phaser.Physics.Arcade.Body).updateFromGameObject();
    }
  }

  destroy(fromScene?: boolean) {
    this.glow?.destroy();
    this.bobTween?.stop();
    super.destroy(fromScene);
  }
}
