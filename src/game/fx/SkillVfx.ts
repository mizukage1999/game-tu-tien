import Phaser from 'phaser';
import { iso, isoVector } from '../art/iso';
import type { Vec2 } from '../types';
import { wangEffect, wangVisual, type WangVisualOptions } from '../../data/wangSkills';
import type { SkillId } from '../../data';
import { heroSpell, spellVisualId } from '../../data/heroSkills';
import type { HeroId } from '../../data/heroes';
import { ensureHeroSpell } from '../art/runtimeAssets';
import { performanceStore } from '../../store/performanceStore';
import { spellFrame, spellTexture } from '../../data/heroSpellArt';
import { effectVisible, SPELL_VISUAL_LIMIT } from '../systems/visualBudget';

const ICE = [0xbfefff, 0x8fe3ff, 0xffffff];

export class SkillVfx {
  private activeSpells: { sprite: Phaser.GameObjects.Image; protectUntil:number; tween?: Phaser.Tweens.Tween }[] = [];
  constructor(private scene: Phaser.Scene) {
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.activeSpells = []; });
  }
  private visible(from: Vec2, range: number) {
    return effectVisible(this.scene.cameras.main.worldView, iso(from.x,from.y), range * 3);
  }
  private track(sprite: Phaser.GameObjects.Image, protectMs: number) {
    const limit = SPELL_VISUAL_LIMIT[performanceStore.getState().tier];
    while (this.activeSpells.length >= limit) {
      // Keep windup/impact and persistent damage zones readable. Only trim safe
      // cosmetic tails; simultaneous new attacks may temporarily exceed the limit.
      const index = this.activeSpells.findIndex(entry => entry.protectUntil <= this.scene.time.now);
      if (index < 0) break;
      const oldest = this.activeSpells.splice(index, 1)[0];
      oldest.tween?.remove();
      oldest.sprite.destroy();
    }
    const entry: { sprite: Phaser.GameObjects.Image; protectUntil:number; tween?: Phaser.Tweens.Tween } = { sprite, protectUntil:this.scene.time.now+protectMs };
    this.activeSpells.push(entry);
    return entry;
  }
  private release(sprite: Phaser.GameObjects.Image) {
    this.activeSpells = this.activeSpells.filter(entry => entry.sprite !== sprite);
    sprite.destroy();
  }
  combatSkill(id:SkillId,from:Vec2,facing:Vec2,range:number,hero:HeroId, bindingTarget?:()=>(Vec2 & {duration?:number})|undefined){
    if(id==='than_phap'){this.teleport(from);return;}
    if(id === 'dinh_than_thuat') {
      this.signature(id, from, facing, range, {castOnly:true,duration:400});
      this.scene.time.delayedCall(400, () => {
        const target = bindingTarget?.();
        this.signature(id, target ?? {x:from.x+facing.x*range,y:from.y+facing.y*range}, facing, range, {duration:target?.duration});
      });
      return;
    }
    if(wangEffect(id)){this.signature(id,from,facing,range,id==='dich_linh_an'?{windupMs:400}:{});return;}
    this.heroSpell(spellVisualId(id,hero),from,facing,range);
  }

  heroSpell(id: SkillId, from: Vec2, facing: Vec2, range: number) {
    const art = heroSpell(id);
    if (!art || !this.visible(from, range)) return;
    if (!this.scene.textures.exists(spellTexture(art.hero))) {
      const requested = performance.now();
      void ensureHeroSpell(this.scene, art.hero).then(ready => {
        if (ready && this.scene.sys.isActive() && performance.now() - requested < 1500) this.heroSpell(id, from, facing, range);
      });
      return;
    }
    const directed = art.shape === 'line' || art.shape === 'cone';
    const center = directed ? {x:from.x+facing.x*range*.5,y:from.y+facing.y*range*.5} : from;
    const spot=iso(center.x,center.y), vector=isoVector(facing.x,facing.y);
    const effect=this.scene.add.image(spot.x,spot.y-20,spellTexture(art.hero),`${id}:0`).setDepth(spot.y+180);
    const entry = this.track(effect, art.windupMs + 120);
    if(directed)effect.setDisplaySize(range*Math.hypot(vector.x,vector.y),art.shape==='line'?95:150).setRotation(Math.atan2(vector.y,vector.x));
    else effect.setDisplaySize(art.shape==='self'?175:range*2.8,art.shape==='self'?190:range*1.8);
    // Authored windup / release / impact / dissolve frames replace the single stretched image.
    // Directional motifs point right in the atlas and rotate with the projected facing vector.
    const sx=effect.scaleX,sy=effect.scaleY;
    entry.tween = this.scene.tweens.addCounter({from:0,to:art.duration,duration:art.duration,
      onUpdate: tween => {
        const age=tween.getValue()??0, progress=age/art.duration;
        effect.setFrame(`${id}:${spellFrame(art.id,age)}`);
        effect.setAlpha(Math.min(1,age/100,(art.duration-age)/180));
        const scale=art.motion==='bloom' ? .75+.25*Math.min(1,age/art.windupMs)
          : art.motion==='ward' ? .92+.08*Math.sin(progress*Math.PI) : 1;
        effect.setScale(sx*scale,sy*scale);
        if(art.motion==='travel') {
          const advance=(Math.min(1,age/art.windupMs)-1)*range*.35;
          effect.setPosition(spot.x+vector.x*advance,spot.y-20+vector.y*advance);
        }
      },onComplete:()=>this.release(effect)});
  }

  signature(id: SkillId, from: Vec2, facing: Vec2, range: number, options: WangVisualOptions = {}) {
    const art = wangEffect(id);
    if (!art || !this.visible(from, range) || !this.scene.textures.exists(art.texture)) return;
    if (art.grid) {
      const duration = options.duration ?? art.duration, projected = isoVector(facing.x, facing.y);
      const directed = art.motion === 'beam' || art.motion === 'crescent' || art.motion === 'finger';
      const sprite = this.scene.add.sprite(0, 0, art.texture, 0).setOrigin(.5, directed ? .5 : .83).setAlpha(0);
      const entry = this.track(sprite, duration > 1500 || art.motion === 'bind' ? duration : (options.windupMs ?? 400) + 120);
      const update = (age: number) => {
        const visual = wangVisual(art, age, range, options), advance = visual.advance * range;
        const spot = iso(from.x + facing.x * advance, from.y + facing.y * advance);
        sprite.setPosition(spot.x, spot.y - (directed ? 26 : options.castOnly ? 12 : 0)).setDepth(spot.y + (art.motion === 'vortex' || art.motion === 'gate' ? -.3 : 180));
        sprite.setFrame(visual.frame).setDisplaySize(visual.width, visual.height).setAlpha(visual.alpha);
        if (directed) sprite.setRotation(Math.atan2(projected.y, projected.x));
      };
      update(0);
      entry.tween = this.scene.tweens.addCounter({from:0,to:duration,duration,onUpdate:tween=>update(tween.getValue()??0),onComplete:()=>this.release(sprite)});
      return;
    }
    const circle = id === 'dao_hoa_hoang_tuyen';
    const palm = id === 'dich_linh_an';
    const bind = id === 'dinh_than_thuat';
    const center = circle || bind ? from : {
      x: from.x + facing.x * range * (palm ? .65 : .5),
      y: from.y + facing.y * range * (palm ? .65 : .5),
    };
    const spot = iso(center.x, center.y);
    const vector = isoVector(facing.x, facing.y);
    const sprite = this.scene.add.sprite(spot.x, spot.y - (bind ? 48 : 22), art.texture, 0)
      .setDepth(spot.y + 180).setAlpha(.95);
    if (circle) sprite.setDisplaySize(range * 4, range * 2.6);
    else if (palm || bind) sprite.setDisplaySize(palm ? 220 : 150, palm ? 200 : 180);
    else sprite.setDisplaySize(range * 1.6, id === 'tram_la_quyet' ? 185 : 115)
      .setRotation(Math.atan2(vector.y, vector.x));
    const cycles = circle ? 4 : 1;
    this.scene.tweens.addCounter({ from: 0, to: 5.99, duration: art.duration / cycles,
      repeat: cycles - 1, onUpdate: tween => sprite.setFrame(Math.min(5, Math.floor(tween.getValue() ?? 0))),
      onComplete: () => sprite.destroy(),
    });
  }

  private liMuFxImage(name: string, x: number, y: number, depth: number) {
    if (!this.scene.textures.exists('li_mu_fx') || !this.scene.textures.get('li_mu_fx').has(name)) return null;
    return this.scene.add.image(x, y, 'li_mu_fx', name).setDepth(depth);
  }

  private wangLinFxImage(name: string, x: number, y: number, depth: number) {
    if (!this.scene.textures.exists('wang_lin_fx') || !this.scene.textures.get('wang_lin_fx').has(name)) return null;
    return this.scene.add.image(x, y, 'wang_lin_fx', name).setDepth(depth);
  }

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
    em.explode(Math.max(2, Math.ceil(count * [1, 0.55, 0.25][performanceStore.getState().tier])));
    this.scene.time.delayedCall(900, () => em.destroy());
  }

  /** Short arc trail in front of the player for basic attacks. */
  swing(origin: Vec2, facing: number, combo: number, wangLinStyle = false) {
    const base = iso(origin.x, origin.y);
    const dir = isoVector(Math.cos(facing), Math.sin(facing));
    const ang = Math.atan2(dir.y, dir.x);
    if (wangLinStyle) {
      const slash = this.wangLinFxImage('fx_01', base.x + dir.x * 26, base.y - 24 + dir.y * 26, base.y + 30);
      if (slash) {
        slash
          .setOrigin(0.5, 0.82)
          .setRotation(ang + (combo === 1 ? 0.3 : combo === 2 ? -0.3 : 0))
          .setScale(combo === 3 ? 0.55 : 0.45)
          .setFlipY(combo === 2)
          .setAlpha(0.9);
        this.scene.tweens.add({
          targets: slash,
          alpha: 0,
          scale: slash.scale * 1.25,
          duration: 220,
          onComplete: () => slash.destroy(),
        });
        return;
      }
    }
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
  crescent(origin: Vec2, facing: number, range: number, liMuStyle = false, wangLinStyle = false) {
    const base = iso(origin.x, origin.y);
    const dir = isoVector(Math.cos(facing), Math.sin(facing));
    const ang = Math.atan2(dir.y, dir.x);
    const wave =
      (liMuStyle ? this.liMuFxImage('fx_03', base.x, base.y - 26, 99400) : null) ??
      (wangLinStyle ? this.wangLinFxImage('fx_01', base.x, base.y - 26, 99400) : null) ??
      this.iceSprite('wave', base.x, base.y - 26, 99400);
    if (wave) {
      wave
        .setOrigin(0.5, 0.82)
        .setRotation(ang)
        .setScale(wave.texture.key === 'li_mu_fx' || wave.texture.key === 'wang_lin_fx' ? 0.55 : 1.2)
        .setAlpha(0.95);
      this.scene.tweens.add({
        targets: wave,
        x: base.x + dir.x * range,
        y: base.y - 26 + dir.y * range,
        scale: wave.texture.key === 'li_mu_fx' || wave.texture.key === 'wang_lin_fx' ? 0.78 : 1.65,
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
    const em = this.scene.add.particles(base.x, base.y - 26, liMuStyle ? 'fx_petal' : 'fx_shard', {
      speed: { min: 200, max: 420 },
      angle: { min: Phaser.Math.RadToDeg(ang) - 35, max: Phaser.Math.RadToDeg(ang) + 35 },
      rotate: { min: 0, max: 360 },
      scale: { start: 0.8, end: 0.1 },
      alpha: { start: 1, end: 0 },
      lifespan: 450,
      tint: wangLinStyle ? [0xff455b, 0xd20c2c, 0xffffff] : undefined,
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
    em.setDepth(99450);
    em.explode(18);
    this.scene.time.delayedCall(700, () => em.destroy());
    this.scene.cameras.main.shake(90, 0.003);
  }

  /** Expanding frost ring around the caster (Hàn Băng Trận). */
  frostNova(origin: Vec2, radius: number, liMuStyle = false, wangLinStyle = false) {
    const base = iso(origin.x, origin.y);
    const burst =
      (liMuStyle ? this.liMuFxImage('fx_15', base.x, base.y - 8, 99400) : null) ??
      (wangLinStyle ? this.wangLinFxImage('fx_04', base.x, base.y - 8, 99400) : null) ??
      this.iceSprite('explosion', base.x, base.y - 8, 99400);
    if (burst) {
      const size = burst.texture.key === 'li_mu_fx' ? 256 : burst.texture.key === 'wang_lin_fx' ? 192 : 72;
      burst.setOrigin(0.5, 0.82).setScale((radius * 2) / size, radius / size).setAlpha(0.9);
      if (burst.texture.key === 'li_mu_fx' || burst.texture.key === 'wang_lin_fx') {
        this.scene.tweens.add({
          targets: burst,
          alpha: 0,
          delay: 350,
          duration: 400,
          onComplete: () => burst.destroy(),
        });
      }
    }
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const x = base.x + Math.cos(angle) * radius * 0.55;
      const y = base.y + Math.sin(angle) * radius * 0.28;
      const depth = base.y + Math.sin(angle) * radius * 0.28;
      const pillar =
        (liMuStyle ? this.liMuFxImage('hoa_vu', x, y, depth) : null) ??
        (wangLinStyle ? this.wangLinFxImage('fx_04', x, y, depth) : null) ??
        this.iceSprite('pillar', x, y, depth);
      pillar?.setOrigin(0.5, 0.88).setScale(pillar.texture.key === 'li_mu_fx' ? 0.16 : pillar.texture.key === 'wang_lin_fx' ? 0.3 : 0.85);
      if (pillar?.texture.key === 'li_mu_fx' || pillar?.texture.key === 'wang_lin_fx') {
        this.scene.tweens.add({
          targets: pillar,
          alpha: 0,
          delay: 100,
          duration: 450,
          onComplete: () => pillar.destroy(),
        });
      }
    }
    const circle =
      (liMuStyle ? this.liMuFxImage('fx_14', base.x, base.y, base.y - 5) : null) ??
      (wangLinStyle ? this.wangLinFxImage('fx_06', base.x, base.y, base.y - 5) : null) ??
      this.scene.add
        .image(base.x, base.y, 'circle')
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(base.y - 5);
    circle.setScale(0.1).setAlpha(0.9);
    this.scene.tweens.add({
      targets: circle,
      scaleX: (radius * 2) / 320,
      scaleY: radius / 320,
      angle: 120,
      duration: 380,
      ease: 'Cubic.Out',
    });
    this.scene.tweens.add({ targets: circle, alpha: 0, delay: 500, duration: 400, onComplete: () => circle.destroy() });
    const ring =
      (liMuStyle ? this.liMuFxImage('magic_ring', base.x, base.y, 99300) : null) ??
      (wangLinStyle ? this.wangLinFxImage('fx_06', base.x, base.y, 99300) : null) ??
      this.scene.add
        .image(base.x, base.y, 'fx_ring')
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(99300);
    ring.setScale(0.2, 0.12);
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
        .image(base.x + Math.cos(a) * r, base.y + Math.sin(a) * r * 0.5, liMuStyle ? 'fx_petal' : 'fx_shard')
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
    this.burstParticles(
      base.x,
      base.y - 10,
      30,
      260,
      liMuStyle ? [0xffb6e6, 0x8fcfff, 0xffffff] : wangLinStyle ? [0xff455b, 0xd20c2c, 0xffffff] : ICE,
    );
    this.scene.cameras.main.shake(140, 0.005);
  }

  /** Flying sword projectile; resolves when it reaches the end. */
  flyingSword(from: Vec2, to: Vec2, onArrive: () => void, liMuStyle = false, wangLinStyle = false) {
    const a = iso(from.x, from.y);
    const b = iso(to.x, to.y);
    const ang = Phaser.Math.Angle.Between(a.x, a.y, b.x, b.y);
    const s =
      (liMuStyle ? this.liMuFxImage('fx_09', a.x, a.y - 30, 99600) : null) ??
      (wangLinStyle ? this.wangLinFxImage('fx_01', a.x, a.y - 30, 99600) : null) ??
      this.iceSprite('combo', a.x, a.y - 30, 99600) ??
      this.scene.add.image(a.x, a.y - 30, 'fx_flysword');
    s.setRotation(ang).setBlendMode(Phaser.BlendModes.ADD).setDepth(99600);
    if (s.texture.key === 'li_mu_fx') s.setScale(0.42);
    else if (s.texture.key === 'wang_lin_fx') s.setScale(0.5);
    else if (s instanceof Phaser.GameObjects.Sprite && s.texture.key === 'skill_ice') s.setScale(0.9);
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
        if (liMuStyle) {
          const bloom = this.liMuFxImage('fx_15', s.x, s.y, 99610);
          bloom?.setScale(0.22).setAlpha(0.95);
          if (bloom) {
            this.scene.tweens.add({
              targets: bloom,
              scale: 0.55,
              alpha: 0,
              duration: 320,
              onComplete: () => bloom.destroy(),
            });
          }
        }
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

}
