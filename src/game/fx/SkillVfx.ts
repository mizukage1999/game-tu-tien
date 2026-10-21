import Phaser from 'phaser';
import { iso, isoVector } from '../art/iso';
import type { Vec2 } from '../types';

const ICE = [0xbfefff, 0x8fe3ff, 0xffffff];

export class SkillVfx {
  constructor(private scene: Phaser.Scene) {}

  private iceSprite(name: string, x: number, y: number, depth: number) {
    const animation = `skill_ice:${name}`;
    if (!this.scene.textures.exists('skill_ice') || !this.scene.anims.exists(animation)) return null;
    const sprite = this.scene.add.sprite(x, y, 'skill_ice', `${name}_0`).setDepth(depth).setBlendMode(Phaser.BlendModes.ADD);
    sprite.play(animation);
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      if (sprite.active) sprite.destroy();
    });
    return sprite;
  }

  private burstParticles(x: number, y: number, count: number, speed: number, tint = ICE, depth = 99500) {
    const em = this.scene.add.particles(x, y, 'fx_dot', {
      speed: { min: speed * 0.4, max: speed },
      angle: { min: 0, max: 360 },
      scale: { start: 0.9, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: { min: 300, max: 650 },
      tint,
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
    em.setDepth(depth);
    em.explode(count);
    this.scene.time.delayedCall(900, () => em.destroy());
  }

  /** Short arc trail in front of the player for basic attacks. */
  swing(origin: Vec2, facing: number, combo: number) {
    const base = iso(origin.x, origin.y);
    const dir = isoVector(Math.cos(facing), Math.sin(facing));
    const ang = Math.atan2(dir.y, dir.x);
    const slash = this.iceSprite('slash', base.x + dir.x * 26, base.y - 24 + dir.y * 26, base.y + 30);
    if (slash) {
      slash
        .setRotation(ang + (combo === 1 ? 0.3 : combo === 2 ? -0.3 : 0))
        .setScale(combo === 3 ? 1.05 : 0.9)
        .setFlipY(combo === 2)
        .setAlpha(0.9);
      return;
    }
    const s = this.scene.add
      .image(base.x + dir.x * 26, base.y - 24 + dir.y * 26, 'fx_slash')
      .setRotation(ang + (combo === 1 ? 0.3 : combo === 2 ? -0.3 : 0))
      .setScale(combo === 3 ? 0.55 : 0.45, combo === 3 ? 0.35 : 0.5)
      .setFlipY(combo === 2)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.85)
      .setDepth(base.y + 30);
    this.scene.tweens.add({ targets: s, alpha: 0, scaleX: s.scaleX * 1.25, duration: 200, onComplete: () => s.destroy() });
  }

  /** Crescent sword wave travelling forward (Băng Tâm Trảm). */
  crescent(origin: Vec2, facing: number, range: number) {
    const base = iso(origin.x, origin.y);
    const dir = isoVector(Math.cos(facing), Math.sin(facing));
    const ang = Math.atan2(dir.y, dir.x);
    const wave = this.iceSprite('wave', base.x, base.y - 26, 99400);
    if (wave) {
      wave.setOrigin(0.5, 0.82).setRotation(ang).setScale(1.2).setAlpha(0.95);
      this.scene.tweens.add({
        targets: wave,
        x: base.x + dir.x * range,
        y: base.y - 26 + dir.y * range,
        scale: 1.65,
        alpha: 0,
        duration: 420,
        ease: 'Cubic.Out',
        onComplete: () => {
          if (wave.active) wave.destroy();
        },
      });
    } else {
      for (let i = 0; i < 2; i++) {
        const s = this.scene.add
          .image(base.x, base.y - 26, 'fx_slash')
          .setRotation(ang)
          .setScale(0.6 + i * 0.25)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(0.95 - i * 0.3)
          .setDepth(99400);
        this.scene.tweens.add({
          targets: s,
          x: base.x + dir.x * range * (0.75 + i * 0.15),
          y: base.y - 26 + dir.y * range * (0.75 + i * 0.15),
          scale: 1.25 + i * 0.25,
          alpha: 0,
          delay: i * 50,
          duration: 380,
          ease: 'Cubic.Out',
          onComplete: () => s.destroy(),
        });
      }
    }
    const em = this.scene.add.particles(base.x, base.y - 26, 'fx_shard', {
      speed: { min: 200, max: 420 },
      angle: { min: Phaser.Math.RadToDeg(ang) - 35, max: Phaser.Math.RadToDeg(ang) + 35 },
      rotate: { min: 0, max: 360 },
      scale: { start: 0.8, end: 0.1 },
      alpha: { start: 1, end: 0 },
      lifespan: 450,
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
    em.setDepth(99450);
    em.explode(18);
    this.scene.time.delayedCall(700, () => em.destroy());
    this.scene.cameras.main.shake(90, 0.003);
  }

  /** Expanding frost ring around the caster (Hàn Băng Trận). */
  frostNova(origin: Vec2, radius: number) {
    const base = iso(origin.x, origin.y);
    const burst = this.iceSprite('explosion', base.x, base.y - 8, 99400);
    if (burst) {
      burst.setOrigin(0.5, 0.82).setScale((radius * 2) / 72, radius / 78).setAlpha(0.9);
    }
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const x = base.x + Math.cos(angle) * radius * 0.55;
      const y = base.y + Math.sin(angle) * radius * 0.28;
      const pillar = this.iceSprite('pillar', x, y, base.y + Math.sin(angle) * radius * 0.28);
      pillar?.setOrigin(0.5, 0.88).setScale(0.85);
    }
    const circle = this.scene.add
      .image(base.x, base.y, 'circle')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.1)
      .setAlpha(0.9)
      .setDepth(base.y - 5);
    this.scene.tweens.add({
      targets: circle,
      scaleX: (radius * 2) / 320,
      scaleY: radius / 320,
      angle: 120,
      duration: 380,
      ease: 'Cubic.Out',
    });
    this.scene.tweens.add({ targets: circle, alpha: 0, delay: 500, duration: 400, onComplete: () => circle.destroy() });
    const ring = this.scene.add
      .image(base.x, base.y, 'fx_ring')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.2, 0.12)
      .setDepth(99300);
    this.scene.tweens.add({
      targets: ring,
      scaleX: (radius * 2.2) / 256,
      scaleY: (radius * 1.4) / 256,
      alpha: 0,
      duration: 520,
      ease: 'Cubic.Out',
      onComplete: () => ring.destroy(),
    });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r = radius * (0.55 + Math.random() * 0.4);
      const shard = this.scene.add
        .image(base.x + Math.cos(a) * r, base.y + Math.sin(a) * r * 0.5, 'fx_shard')
        .setOrigin(0.5, 1)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(0.2)
        .setDepth(base.y + Math.sin(a) * r * 0.5);
      this.scene.tweens.add({
        targets: shard,
        scale: 1.1 + Math.random() * 0.6,
        duration: 160,
        delay: 80 + i * 18,
        ease: 'Back.Out',
        yoyo: true,
        hold: 260,
        onComplete: () => shard.destroy(),
      });
    }
    this.burstParticles(base.x, base.y - 10, 30, 260);
    this.scene.cameras.main.shake(140, 0.005);
  }

  /** Flying sword projectile; resolves when it reaches the end. */
  flyingSword(from: Vec2, to: Vec2, onArrive: () => void) {
    const a = iso(from.x, from.y);
    const b = iso(to.x, to.y);
    const ang = Phaser.Math.Angle.Between(a.x, a.y, b.x, b.y);
    const s = this.iceSprite('combo', a.x, a.y - 30, 99600) ?? this.scene.add.image(a.x, a.y - 30, 'fx_flysword');
    s.setRotation(ang).setBlendMode(Phaser.BlendModes.ADD).setDepth(99600);
    if (s instanceof Phaser.GameObjects.Sprite && s.texture.key === 'skill_ice') s.setScale(0.9);
    const trail = this.scene.add.particles(0, 0, 'fx_dot', {
      follow: s,
      speed: 10,
      scale: { start: 0.7, end: 0 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 260,
      frequency: 12,
      tint: ICE,
      blendMode: Phaser.BlendModes.ADD,
    });
    trail.setDepth(99590);
    const d = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
    this.scene.tweens.add({
      targets: s,
      x: b.x,
      y: b.y - 30,
      duration: Math.max(120, d * 0.9),
      ease: 'Quad.In',
      onComplete: () => {
        onArrive();
        this.burstParticles(s.x, s.y, 14, 180);
        s.destroy();
        trail.stop();
        this.scene.time.delayedCall(400, () => trail.destroy());
      },
    });
  }

  teleport(origin: Vec2) {
    const base = iso(origin.x, origin.y);
    const teleport = this.iceSprite('teleport', base.x, base.y, base.y + 1);
    if (teleport) {
      teleport.setOrigin(0.5, 0.88).setScale(0.9);
      return;
    }
    const ring = this.scene.add
      .image(base.x, base.y, 'fx_ring')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.25, 0.12)
      .setDepth(base.y + 1);
    this.scene.tweens.add({ targets: ring, scaleX: 1, alpha: 0, duration: 280, onComplete: () => ring.destroy() });
  }

  /** Afterimages while dashing. */
  afterimage(sprite: Phaser.GameObjects.Sprite) {
    const at = iso(sprite.x, sprite.y);
    const g = this.scene.add
      .image(at.x, at.y, sprite.texture.key, sprite.frame.name)
      .setOrigin(sprite.originX, sprite.originY)
      .setFlipX(sprite.flipX)
      .setTintFill(0x9fe3ff)
      .setAlpha(0.55)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(sprite.depth - 1);
    this.scene.tweens.add({ targets: g, alpha: 0, duration: 280, onComplete: () => g.destroy() });
  }

  /** Bright column and rings when leveling up or breaking through. */
  ascend(sprite: Phaser.GameObjects.Sprite, gold = false) {
    const tint = gold ? [0xfff1b0, 0xffd36a, 0xffffff] : ICE;
    const at = iso(sprite.x, sprite.y);
    const buff = this.iceSprite('buff', at.x, at.y - 30, sprite.depth + 3);
    buff?.setTint(gold ? 0xffd36a : 0xbfefff).setScale(1.15);
    const pillar = this.scene.add
      .image(at.x, at.y - 40, 'glow_cold')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(gold ? 0xffd36a : 0x9fe3ff)
      .setScale(0.6, 0.2)
      .setDepth(sprite.depth + 2);
    this.scene.tweens.add({
      targets: pillar,
      scaleY: 2.6,
      scaleX: 0.9,
      alpha: { from: 1, to: 0 },
      duration: 1100,
      ease: 'Cubic.Out',
      onComplete: () => pillar.destroy(),
    });
    const ring = this.scene.add
      .image(at.x, at.y, gold ? 'circle_gold' : 'circle')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.05, 0.025)
      .setDepth(at.y - 5);
    this.scene.tweens.add({
      targets: ring,
      scaleX: 0.5,
      scaleY: 0.25,
      angle: 180,
      alpha: { from: 1, to: 0 },
      duration: 1200,
      onComplete: () => ring.destroy(),
    });
    const em = this.scene.add.particles(at.x, at.y, 'fx_dot', {
      x: { min: -24, max: 24 },
      speedY: { min: -220, max: -90 },
      speedX: { min: -20, max: 20 },
      scale: { start: 0.9, end: 0 },
      lifespan: 900,
      quantity: 2,
      frequency: 25,
      tint,
      blendMode: Phaser.BlendModes.ADD,
    });
    em.setDepth(sprite.depth + 3);
    this.scene.time.delayedCall(700, () => em.stop());
    this.scene.time.delayedCall(1700, () => em.destroy());
  }

  /** Small blue/gold puff when an item is collected. */
  pickup(mapX: number, mapY: number, color: number) {
    const at = iso(mapX, mapY);
    this.burstParticles(at.x, at.y, 10, 120, [color, 0xffffff]);
  }

  /** Gathering motes while meditating. */
  meditateAura(target: Phaser.GameObjects.Sprite): Phaser.GameObjects.Particles.ParticleEmitter {
    const at = iso(target.x, target.y);
    const em = this.scene.add.particles(at.x, at.y - 26, 'fx_dot', {
      emitZone: {
        type: 'edge',
        source: new Phaser.Geom.Circle(0, 0, 60),
        quantity: 24,
      },
      moveToX: 0,
      moveToY: 0,
      lifespan: 900,
      scale: { start: 0.8, end: 0.1 },
      alpha: { start: 0, end: 1 },
      frequency: 60,
      tint: ICE,
      blendMode: Phaser.BlendModes.ADD,
    });
    em.setDepth(target.depth + 1);
    return em;
  }
}
