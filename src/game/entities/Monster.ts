import Phaser from 'phaser';
import { MONSTERS, type MonsterDef } from '../../data';
import { AnimationController } from '../anim/AnimationController';
import { flash, impact, knockback } from '../fx/HitEffect';
import { createBrain, isHostile, provoke, stepMonsterAI, type MonsterBrain } from '../systems/monsterAI';
import type { Vec2 } from '../types';
import type { WorldScene } from '../scenes/WorldScene';

export class Monster extends Phaser.Physics.Arcade.Sprite {
  readonly def: MonsterDef;
  readonly brain: MonsterBrain;
  readonly ctrl: AnimationController;
  hp: number;
  alive = true;
  slowTimer = 0;

  private shadow: Phaser.GameObjects.Image;
  private label: Phaser.GameObjects.Text;
  private bar: Phaser.GameObjects.Graphics;
  private attacking = false;
  private hurtTimer = 0;
  private wasSlowed = false;
  private barDirty = true;
  private lastBarPos = { x: 0, y: 0 };

  constructor(
    private world: WorldScene,
    readonly type: string,
    x: number,
    y: number,
  ) {
    const def = MONSTERS[type];
    super(world, x, y, def.art);
    this.def = def;
    this.hp = def.hp;
    world.add.existing(this);
    world.physics.add.existing(this);
    this.ctrl = new AnimationController(this, def.art);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(34, 16);
    body.setOffset(this.ctrl.rig.frameWidth / 2 - 17, this.ctrl.rig.frameHeight * this.ctrl.rig.originY - 14);
    this.brain = createBrain({ x, y });
    if (type === 'hoa_ho') this.setScale(1.15);

    this.shadow = world.add.image(x, y, 'shadow').setScale(1.2, 1).setDepth(-100);
    this.label = world.add
      .text(x, y, def.name, {
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: type === 'hoa_ho' ? '#ffb27a' : '#ffd6d6',
        stroke: '#2a0a0a',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setDepth(89000);
    this.bar = world.add.graphics().setDepth(89000);
    this.setFlipX(Math.random() < 0.5);
    this.ctrl.play('idle', this.flipX ? 'left' : 'right');
  }

  distanceTo(p: Vec2) {
    return Math.hypot(p.x - this.x, p.y - this.y);
  }

  get hostile() {
    return this.alive && isHostile(this.brain);
  }

  update(dt: number, player: Vec2 | null) {
    if (!this.alive) return;
    this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    this.slowTimer = Math.max(0, this.slowTimer - dt);
    const body = this.body as Phaser.Physics.Arcade.Body;
    const out = stepMonsterAI(this.brain, this.def, {
      pos: { x: this.x, y: this.y },
      player,
      dt,
    });

    if (this.brain.state === 'return' && this.hp < this.def.hp) {
      this.hp = Math.min(this.def.hp, this.hp + this.def.hp * 0.002 * dt);
      this.barDirty = true;
    }

    if (out.attack && player && !this.attacking) this.startAttack(player);

    if (this.attacking || this.hurtTimer > 0) {
      if (this.hurtTimer <= 0) body.setVelocity(0, 0);
    } else {
      const slow = this.slowTimer > 0 ? 0.45 : 1;
      body.setVelocity(out.velocity.x * slow, out.velocity.y * slow);
      const moving = Math.hypot(out.velocity.x, out.velocity.y) > 5;
      if (Math.abs(out.velocity.x) > 3) this.setFlipX(out.velocity.x < 0);
      else if (player && isHostile(this.brain)) this.setFlipX(player.x < this.x);
      this.ctrl.play(moving ? 'run' : 'idle', this.flipX ? 'left' : 'right');
    }
    const slowed = this.slowTimer > 0;
    if (slowed !== this.wasSlowed) {
      this.wasSlowed = slowed;
      if (slowed) this.setTint(0xa8dcff);
      else this.clearTint();
    }
    this.syncDecor();
  }

  private syncDecor() {
    this.setDepth(this.y);
    this.shadow.setPosition(this.x, this.y - 2);
    const top = this.y - 66 * this.scaleY;
    this.label.setPosition(this.x, top - 6);
    if (this.barDirty || this.lastBarPos.x !== this.x || this.lastBarPos.y !== this.y) {
      this.barDirty = false;
      this.lastBarPos = { x: this.x, y: this.y };
      const w = 44;
      this.bar.clear();
      this.bar.fillStyle(0x140a0a, 0.8).fillRoundedRect(this.x - w / 2 - 1, top - 4, w + 2, 6, 2);
      this.bar.fillStyle(0xe8443a, 1).fillRoundedRect(this.x - w / 2, top - 3, Math.max(0, (w * this.hp) / this.def.hp), 4, 2);
    }
  }

  private startAttack(player: Vec2) {
    this.attacking = true;
    this.setFlipX(player.x < this.x);
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.ctrl.play('attack', this.flipX ? 'left' : 'right', {
      lock: true,
      force: true,
      onComplete: () => {
        this.attacking = false;
      },
    });
    // telegraph: brief red glow during wind-up, then resolve the bite
    this.setTintFill(0xff9a7a);
    this.world.time.delayedCall(70, () => this.alive && this.clearTint());
    this.world.time.delayedCall(this.def.attackWindup, () => {
      if (!this.alive) return;
      this.world.monsterHitPlayer(this);
    });
  }

  hit(amount: number, crit: boolean, from: Vec2) {
    if (!this.alive) return;
    this.hp = Math.max(0, this.hp - amount);
    this.barDirty = true;
    provoke(this.brain);
    flash(this.world, this);
    impact(this.world, this.x, this.y - 28, crit ? 0xffe28a : 0xbfefff, crit);
    this.world.damageText.show(this.x, this.y - 60, `-${amount}`, crit ? 'crit' : 'enemy');
    if (this.hp <= 0) {
      this.die();
      return;
    }
    if (!this.attacking) {
      this.hurtTimer = 140;
      knockback(this.world, this, from.x, from.y, crit ? 220 : 140);
      this.ctrl.play('hurt', this.flipX ? 'left' : 'right', { force: true });
    }
  }

  private die() {
    this.alive = false;
    this.attacking = false;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.enable = false;
    this.ctrl.play('die', this.flipX ? 'left' : 'right', { force: true, lock: true });
    this.label.setVisible(false);
    this.bar.clear();
    this.world.onMonsterKilled(this);
    this.world.tweens.add({
      targets: [this, this.shadow],
      alpha: 0,
      delay: 450,
      duration: 500,
      onComplete: () => this.setVisible(false),
    });
    this.world.time.delayedCall(this.def.respawnMs, () => this.respawn());
  }

  private respawn() {
    if (!this.scene) return;
    const { home } = this.brain;
    this.setPosition(home.x, home.y);
    Object.assign(this.brain, createBrain(home));
    this.hp = this.def.hp;
    this.alive = true;
    this.barDirty = true;
    this.ctrl.unlock();
    this.ctrl.play('idle', 'right', { force: true });
    (this.body as Phaser.Physics.Arcade.Body).enable = true;
    (this.body as Phaser.Physics.Arcade.Body).reset(home.x, home.y);
    this.setVisible(true).setAlpha(0);
    this.label.setVisible(true);
    this.world.tweens.add({ targets: [this, this.shadow], alpha: 1, duration: 600 });
  }

  destroy(fromScene?: boolean) {
    this.shadow?.destroy();
    this.label?.destroy();
    this.bar?.destroy();
    super.destroy(fromScene);
  }
}
