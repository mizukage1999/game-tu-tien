import Phaser from 'phaser';
import { SKILLS, type SkillId } from '../../data';
import { gameStore } from '../../store/gameStore';
import { AnimationController } from '../anim/AnimationController';
import { virtualInput } from '../EventBus';
import { flash, knockback } from '../fx/HitEffect';
import {
  canAct,
  canBeHit,
  createLife,
  grantInvuln,
  knockDown,
  tickLife,
  DOWNED_DURATION_MS,
  type LifeState,
} from '../systems/respawn';
import { dirFromVector, dirVector, type Dir, type Vec2 } from '../types';
import type { WorldScene } from '../scenes/WorldScene';
import type { Monster } from './Monster';

type Keys = Record<'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd', Phaser.Input.Keyboard.Key>;

const SKILL_ANIM: Partial<Record<SkillId, string>> = {
  bang_tam_tram: 'attack_2',
  phi_kiem: 'cast',
  han_bang_tran: 'cast',
};

export class Player extends Phaser.Physics.Arcade.Sprite {
  readonly ctrl: AnimationController;
  readonly life: LifeState = createLife();
  dir: Dir = 'down';
  cooldowns: Partial<Record<SkillId, number>> = {};
  meditating = false;
  lastDamageAt = -99999;

  private keys: Keys;
  private combo = 0;
  private comboTimer = 0;
  private queuedAttack = false;
  private dashTime = 0;
  private dashVec: Vec2 = { x: 0, y: 0 };
  private afterimageTimer = 0;
  private shadow: Phaser.GameObjects.Image;
  private label: Phaser.GameObjects.Text;
  private bar: Phaser.GameObjects.Graphics;
  private aura: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private blink: Phaser.Tweens.Tween | null = null;

  constructor(
    private world: WorldScene,
    x: number,
    y: number,
  ) {
    super(world, x, y, 'player');
    world.add.existing(this);
    world.physics.add.existing(this);
    this.ctrl = new AnimationController(this, 'player');
    const body = this.body as Phaser.Physics.Arcade.Body;
    const fw = this.ctrl.rig.frameWidth;
    const fh = this.ctrl.rig.frameHeight;
    body.setSize(22, 14);
    body.setOffset(fw / 2 - 11, fh * this.ctrl.rig.originY - 12);
    body.setCollideWorldBounds(true);

    this.shadow = world.add.image(x, y, 'shadow').setDepth(-100);
    this.label = world.add
      .text(x, y, gameStore.getState().player.name, {
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#1a2240',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setDepth(90000);
    this.bar = world.add.graphics().setDepth(90000);

    const kb = world.input.keyboard!;
    this.keys = kb.addKeys({
      up: 'UP',
      down: 'DOWN',
      left: 'LEFT',
      right: 'RIGHT',
      w: 'W',
      a: 'A',
      s: 'S',
      d: 'D',
    }) as Keys;

    this.ctrl.play('idle', this.dir);
  }

  get facing(): Vec2 {
    return dirVector(this.dir);
  }

  get feet(): Vec2 {
    return { x: this.x, y: this.y };
  }

  private manualInput(): Vec2 {
    const k = this.keys;
    let x = (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0);
    let y = (k.down.isDown || k.s.isDown ? 1 : 0) - (k.up.isDown || k.w.isDown ? 1 : 0);
    if (x === 0 && y === 0) {
      x = virtualInput.x;
      y = virtualInput.y;
    }
    const l = Math.hypot(x, y);
    return l > 1 ? { x: x / l, y: y / l } : { x, y };
  }

  faceToward(p: Vec2) {
    this.dir = dirFromVector(p.x - this.x, p.y - this.y, this.dir);
  }

  update(dt: number) {
    if (tickLife(this.life, dt)) this.revive();
    for (const id of Object.keys(this.cooldowns) as SkillId[]) {
      this.cooldowns[id] = Math.max(0, (this.cooldowns[id] ?? 0) - dt);
    }
    this.comboTimer = Math.max(0, this.comboTimer - dt);
    const body = this.body as Phaser.Physics.Arcade.Body;

    if (!canAct(this.life)) {
      body.setVelocity(0, 0);
    } else if (this.dashTime > 0) {
      this.dashTime -= dt;
      body.setVelocity(this.dashVec.x, this.dashVec.y);
      this.afterimageTimer -= dt;
      if (this.afterimageTimer <= 0) {
        this.afterimageTimer = 30;
        this.world.vfx.afterimage(this);
      }
    } else {
      let move = this.manualInput();
      const manual = Math.hypot(move.x, move.y) > 0.1;
      if (!manual && gameStore.getState().auto && !this.meditating) move = this.autoControl();
      if (manual && this.meditating) this.stopMeditate();

      if (this.ctrl.locked || this.meditating) {
        body.setVelocity(0, 0);
      } else {
        const speed = gameStore.getState().stats.speed;
        const mag = Math.hypot(move.x, move.y);
        body.setVelocity(move.x * speed, move.y * speed);
        if (mag > 0.1) {
          this.dir = dirFromVector(move.x, move.y, this.dir);
          this.ctrl.play('run', this.dir);
        } else {
          this.ctrl.play('idle', this.dir);
        }
      }
    }

    this.setDepth(this.y);
    this.shadow.setPosition(this.x, this.y - 2);
    this.label.setPosition(this.x, this.y - 84);
    this.drawBar();
  }

  private drawBar() {
    const { player, stats } = gameStore.getState();
    const w = 46;
    this.bar.clear();
    this.bar.fillStyle(0x10131f, 0.75).fillRoundedRect(this.x - w / 2 - 1, this.y - 82, w + 2, 6, 2);
    this.bar.fillStyle(0x4cd96b, 1).fillRoundedRect(this.x - w / 2, this.y - 81, (w * player.hp) / stats.maxHp, 4, 2);
  }

  // ---- auto combat -------------------------------------------------------

  private autoControl(): Vec2 {
    const w = this.world;
    const range = SKILLS.basic.range;
    let target = w.target && w.target.alive && w.target.distanceTo(this) < 520 ? w.target : null;
    if (!target) target = w.nearestMonster(this, 420);
    const nearbyLoot = w.nearestLoot(this, 260);
    const engaged = target && target.distanceTo(this) < range + 40;

    if (!engaged && nearbyLoot) return this.toward(nearbyLoot);
    if (!target) return { x: 0, y: 0 };
    w.setTarget(target);
    const d = target.distanceTo(this);
    // use skills first, then basic attacks
    for (const id of ['han_bang_tran', 'bang_tam_tram', 'phi_kiem'] as SkillId[]) {
      const sk = SKILLS[id];
      if (d <= sk.range * 0.8 && this.skillReady(id)) {
        this.faceToward(target);
        this.castSkill(id);
        return { x: 0, y: 0 };
      }
    }
    if (d <= range - 8) {
      this.faceToward(target);
      this.attack();
      return { x: 0, y: 0 };
    }
    return this.toward(target);
  }

  private toward(p: Vec2): Vec2 {
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const l = Math.hypot(dx, dy) || 1;
    return { x: dx / l, y: dy / l };
  }

  // ---- actions -----------------------------------------------------------

  skillReady(id: SkillId) {
    return (this.cooldowns[id] ?? 0) <= 0 && gameStore.getState().player.mp >= SKILLS[id].mpCost;
  }

  private autoFace(range: number) {
    const t = this.world.target?.alive && this.world.target.distanceTo(this) <= range ? this.world.target : this.world.nearestMonster(this, range);
    if (t) this.faceToward(t);
    return t;
  }

  attack() {
    if (!canAct(this.life) || this.dashTime > 0) return;
    if (this.meditating) this.stopMeditate();
    if (this.ctrl.locked) {
      this.queuedAttack = true;
      return;
    }
    if ((this.cooldowns.basic ?? 0) > 0) return;
    this.queuedAttack = false;
    this.combo = this.comboTimer > 0 ? (this.combo % 3) + 1 : 1;
    this.comboTimer = 900;
    this.cooldowns.basic = SKILLS.basic.cooldownMs;
    this.autoFace(SKILLS.basic.range + 50);
    const combo = this.combo;
    this.ctrl.play(`attack_${combo}`, this.dir, {
      lock: true,
      force: true,
      onHit: () => this.world.playerMeleeHit(combo),
      onComplete: () => {
        if (this.queuedAttack) {
          this.queuedAttack = false;
          this.attack();
        }
      },
    });
  }

  castSkill(id: SkillId) {
    if (id === 'basic') return this.attack();
    if (id === 'than_phap') return this.dash();
    const store = gameStore.getState();
    if (!canAct(this.life) || this.ctrl.locked || this.dashTime > 0) return;
    if ((this.cooldowns[id] ?? 0) > 0) return;
    const sk = SKILLS[id];
    let target: Monster | null = null;
    if (id === 'phi_kiem') {
      target = this.autoFace(sk.range);
      if (!target) {
        store.toast('Không có mục tiêu trong tầm', 'warn');
        return;
      }
    } else {
      this.autoFace(sk.range);
    }
    if (!store.spendMp(sk.mpCost)) {
      store.toast('Không đủ linh lực (MP)', 'warn');
      return;
    }
    if (this.meditating) this.stopMeditate();
    this.cooldowns[id] = sk.cooldownMs;
    this.ctrl.play(SKILL_ANIM[id] ?? 'cast', this.dir, {
      lock: true,
      force: true,
      onHit: () => this.world.executeSkill(id, target),
    });
  }

  dash() {
    if (!canAct(this.life) || this.dashTime > 0) return;
    if ((this.cooldowns.than_phap ?? 0) > 0) return;
    const store = gameStore.getState();
    if (!store.spendMp(SKILLS.than_phap.mpCost)) return;
    if (this.meditating) this.stopMeditate();
    let v = this.manualInput();
    if (Math.hypot(v.x, v.y) < 0.1) v = this.facing;
    const l = Math.hypot(v.x, v.y) || 1;
    const speed = 820;
    this.dashVec = { x: (v.x / l) * speed, y: (v.y / l) * speed };
    this.dir = dirFromVector(v.x, v.y, this.dir);
    this.dashTime = 180;
    this.cooldowns.than_phap = SKILLS.than_phap.cooldownMs;
    grantInvuln(this.life, 320);
    this.ctrl.unlock();
    this.ctrl.play('run', this.dir, { force: true });
  }

  startMeditate() {
    if (!canAct(this.life) || this.meditating) return;
    if (this.world.time.now - this.lastDamageAt < 3000) {
      gameStore.getState().toast('Đang chiến đấu, không thể tọa thiền', 'warn');
      return;
    }
    this.meditating = true;
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.ctrl.play('meditate', 'down', { force: true });
    this.aura = this.world.vfx.meditateAura(this);
    gameStore.getState().patch({ meditating: true });
    gameStore.getState().addLog('Bắt đầu tọa thiền, hấp thu linh khí...');
  }

  stopMeditate() {
    if (!this.meditating) return;
    this.meditating = false;
    this.aura?.destroy();
    this.aura = null;
    this.ctrl.play('idle', this.dir, { force: true });
    gameStore.getState().patch({ meditating: false });
  }

  /** Returns false if the hit was ignored (invulnerable / downed). */
  takeHit(amount: number, crit: boolean, from: Vec2): boolean {
    if (!canBeHit(this.life)) return false;
    const store = gameStore.getState();
    this.lastDamageAt = this.world.time.now;
    if (this.meditating) this.stopMeditate();
    const hp = store.damagePlayer(amount);
    flash(this.world, this, 0xff6b6b);
    this.world.damageText.show(this.x, this.y - 70, `-${amount}`, crit ? 'crit' : 'player');
    if (amount > store.stats.maxHp * 0.08 || crit) this.world.cameras.main.shake(120, 0.006);
    if (hp <= 0) {
      this.goDown();
      return true;
    }
    if (!this.ctrl.locked && this.dashTime <= 0) {
      knockback(this.world, this, from.x, from.y, 120);
      this.ctrl.play('hurt', this.dir, { lock: true, force: true });
    }
    return true;
  }

  private goDown() {
    knockDown(this.life);
    this.queuedAttack = false;
    this.dashTime = 0;
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.ctrl.play('downed', this.dir, { lock: true, force: true });
    this.setTint(0x8890a8);
    const s = gameStore.getState();
    s.patch({ status: 'downed', downedRemaining: DOWNED_DURATION_MS });
    s.addLog('Bạn bị trọng thương! Hồi sinh sau 2.5 giây.');
    this.world.cameras.main.shake(250, 0.01);
    this.world.cameras.main.flash(250, 120, 0, 0);
  }

  private revive() {
    const s = gameStore.getState();
    s.restore(s.stats.maxHp, s.stats.maxMp);
    s.patch({ status: 'alive', downedRemaining: 0 });
    s.addLog('Hồi sinh thành công, HP/MP đã hồi đầy');
    this.clearTint();
    this.ctrl.unlock();
    this.ctrl.play('idle', this.dir, { force: true });
    this.world.vfx.ascend(this);
    this.blink?.stop();
    this.blink = this.world.tweens.add({
      targets: this,
      alpha: 0.35,
      yoyo: true,
      repeat: 6,
      duration: 100,
      onComplete: () => this.setAlpha(1),
    });
  }

  destroy(fromScene?: boolean) {
    this.shadow?.destroy();
    this.label?.destroy();
    this.bar?.destroy();
    this.aura?.destroy();
    super.destroy(fromScene);
  }
}
