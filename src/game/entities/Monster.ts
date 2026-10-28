import Phaser from 'phaser';
import { MONSTERS, type MonsterDef } from '../../data';
import { iso, isoVector } from '../art/iso';
import { speciesForArt } from '../../data/bestiary';
import { AnimationController } from '../anim/AnimationController';
import { flash, impact, knockback } from '../fx/HitEffect';
import { createBrain, isHostile, provoke, stepMonsterAI, type AIParams, type MonsterBrain } from '../systems/monsterAI';
import type { Vec2 } from '../types';
import type { WorldScene } from '../scenes/WorldScene';
import { GridNavigator, gridLineClear } from '../systems/gridNavigation';
import { TILE } from '../art/tiles';
import type { WorldMonsterState } from '../../net/worldProtocol';
import { RealmNameplate } from './RealmNameplate';

export class Monster extends Phaser.Physics.Arcade.Sprite {
  netId='';
  generation=0;
  respawnAt=0;
  lastAttacker='';
  targetKey='';
  attackTargetKey='';
  readonly def: MonsterDef;
  readonly brain: MonsterBrain;
  readonly ctrl: AnimationController;
  /** Drawn body; the physics sprite itself stays hidden in map space. */
  readonly art: Phaser.GameObjects.Sprite;
  readonly arena: boolean;
  hp: number;
  alive = true;
  playerContribution = false;
  readonly hideStrength: boolean;
  slowTimer = 0;
  rootTimer = 0;
  weakenTimer = 0;
  private navigator = new GridNavigator();

  private ai: AIParams;
  private slamTimer = 0;
  private summoned = false;
  private shadow: Phaser.GameObjects.Image;
  private label: Phaser.GameObjects.Text;
  private realmPlate?: RealmNameplate;
  private bar: Phaser.GameObjects.Graphics;
  private attacking = false;
  private hurtTimer = 0;
  private wasSlowed = false;
  private barDirty = true;
  private lastBarPos = { x: 0, y: 0 };
  private labelZoom = 0;
  private compactLabel = false;

  constructor(
    private world: WorldScene,
    readonly type: string,
    x: number,
    y: number,
    /** Dungeon monsters hunt the player across the whole arena and never respawn. */
    opts: { arena?: boolean; definition?:MonsterDef; hideStrength?:boolean } = {},
  ) {
    const def = opts.definition ?? MONSTERS[type];
    const art = world.textures.exists(def.art) ? def.art : def.boss ? 'beast_frost_king' : 'beast_snow';
    super(world, x, y, art);
    this.def = def;
    this.hideStrength = !!opts.hideStrength;
    this.hp = def.hp;
    this.arena = !!opts.arena;
    this.ai = this.arena ? { ...def, aggroRadius: 1400, leashRadius: 99999 } : def;
    this.slamTimer = (def.boss?.slamInterval ?? 0) * 0.6;
    world.add.existing(this);
    world.physics.add.existing(this);
    this.setVisible(false);
    const spot = iso(x, y);
    this.art = world.add.sprite(spot.x, spot.y, art).setOrigin(0.5, 1);
    this.ctrl = new AnimationController(this.art, art);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(34, 16);
    body.setOffset(this.width*this.originX-17,this.height*this.originY-8);
    this.brain = createBrain({ x, y });
    const scale = def.scale ?? (type === 'hoa_ho' ? 1.15 : 1);
    this.setScale(scale);
    this.art.setScale(scale);

    this.shadow = world.add.image(spot.x, spot.y, 'shadow').setScale(1.2 * scale, scale).setDepth(-100);
    this.label = world.add
      .text(spot.x, spot.y, def.boss ? `【${def.name}】 Lv.${def.level}` : def.name, {
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: def.boss ? '15px' : '12px',
        fontStyle: 'bold',
        color: def.boss ? '#ffd34d' : type === 'hoa_ho' ? '#ffb27a' : '#ffd6d6',
        stroke: '#2a0a0a',
        strokeThickness: 3,
        resolution: 2,
        align:'center',
      })
      .setOrigin(0.5, 1)
      .setDepth(89000);
    if(this.hideStrength){this.realmPlate=new RealmNameplate(world,{level:def.level},def.name,'#ffd6d6',89000);this.label.setVisible(false);}
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
    if(this.world.shared&&!this.world.shared.authority){(this.body as Phaser.Physics.Arcade.Body).setVelocity(0,0);if(this.alive)this.syncDecor();return;}
    if(this.world.shared&&this.alive)(this.body as Phaser.Physics.Arcade.Body).enable=true;
    if(!this.alive&&this.world.shared?.authority&&this.respawnAt>0&&Date.now()>=this.respawnAt)this.respawn();
    if (!this.alive) return;
    this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    this.slowTimer = Math.max(0, this.slowTimer - dt);
    this.rootTimer = Math.max(0, this.rootTimer - dt);
    this.weakenTimer = Math.max(0, this.weakenTimer - dt);
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.rootTimer > 0) { body.setVelocity(0, 0); this.syncDecor(); return; }
    const out = stepMonsterAI(this.brain, this.ai, {
      pos: { x: this.x, y: this.y },
      player,
      dt,
      lineClear: !player || gridLineClear(this.world.map.blocked, TILE, this, player, 0, 0),
    });

    if (this.brain.state === 'return' && this.hp < this.def.hp) {
      this.hp = Math.min(this.def.hp, this.hp + this.def.hp * 0.002 * dt);
      this.barDirty = true;
    }

    const boss = this.def.boss;
    if (boss && player && isHostile(this.brain) && !this.attacking) {
      this.slamTimer -= dt;
      if (this.slamTimer <= 0) {
        this.slamTimer = boss.slamInterval*(this.hp<this.def.hp*.5?.65:1);
        this.startSlam();
      }
    }
    if (out.attack && player && !this.attacking) this.startAttack(player);

    if (this.attacking || this.hurtTimer > 0) {
      if (this.hurtTimer <= 0) body.setVelocity(0, 0);
    } else {
      const slow = this.slowTimer > 0 ? 0.45 : 1;
      const goal = this.brain.state === 'return' ? this.brain.home :
        this.brain.state === 'wander' ? this.brain.wanderTarget : player;
      const velocity = goal && Math.hypot(out.velocity.x, out.velocity.y) > 0 ?
        this.navigator.steer(this.world.map.blocked, TILE, this, goal, Math.hypot(out.velocity.x,out.velocity.y), dt) : out.velocity;
      body.setVelocity(velocity.x * slow, velocity.y * slow);
      const moving = Math.hypot(velocity.x, velocity.y) > 5;
      const screenMove = isoVector(velocity.x, velocity.y);
      if (Math.abs(screenMove.x) > 3) this.setFlipX(screenMove.x < 0);
      else if (player && isHostile(this.brain)) this.setFlipX(isoVector(player.x - this.x, player.y - this.y).x < 0);
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
    const spot = iso(this.x, this.y);
    this.art.setPosition(spot.x, spot.y).setDepth(spot.y);
    this.syncLook();
    this.shadow.setPosition(spot.x, spot.y - 2);
    const visualHeight = speciesForArt(this.art.texture.key)?.height;
    const top = spot.y - (visualHeight ? visualHeight + 10 : this.hideStrength||this.def.art.startsWith('dungeon_boss_')?116:66) * this.scaleY;
    const density = this.world.registry.get('render-density') as number || 1;
    const zoom = this.world.cameras.main.zoom / density;
    const compact = !!this.world.registry.get('phone-layout');
    if (zoom !== this.labelZoom || compact !== this.compactLabel) {
      this.labelZoom = zoom;
      this.compactLabel = compact;
      this.label.setFontSize(compact ? (this.def.boss ? 10 : 8) : (this.def.boss ? 12 : 10));
      this.label.setStroke('#2a0a0a', 2).setScale(1 / zoom);
      this.barDirty = true;
    }
    this.label.setPosition(spot.x, top - 6);
    this.realmPlate?.place(spot.x,top-6);
    const heroName = this.world.player?.nameplateBounds;
    const overlapsHero = !!heroName && Phaser.Geom.Intersects.RectangleToRectangle(this.realmPlate?.getBounds()??this.label.getBounds(), heroName);
    this.label.setVisible(!overlapsHero&&!this.hideStrength);
    this.realmPlate?.setVisible(!overlapsHero);
    this.bar.setVisible(!overlapsHero && !this.hideStrength);
    if (this.barDirty || this.lastBarPos.x !== this.x || this.lastBarPos.y !== this.y) {
      this.barDirty = false;
      this.lastBarPos = { x: this.x, y: this.y };
      const w = (compact ? (this.def.boss ? 46 : 28) : (this.def.boss ? 64 : 36)) / zoom;
      const h = (compact ? 2 : 3) / zoom;
      this.bar.clear();
      this.bar.fillStyle(0x140a0a, 0.8).fillRoundedRect(spot.x - w / 2 - 1, top - 3, w + 2, h + 2, 1);
      this.bar.fillStyle(0xe8443a, 1).fillRoundedRect(spot.x - w / 2, top - 2, Math.max(0, (w * this.hp) / this.def.hp), h, 1);
    }
  }

  /** The drawn body mirrors the hidden sprite's tint, alpha and squash. */
  private syncLook() {
    this.art.setAlpha(this.alpha).setScale(this.scaleX, this.scaleY);
    if (this.tintFill) this.art.setTintFill(this.tintTopLeft);
    else if (this.isTinted) this.art.setTint(this.tintTopLeft);
    else this.art.clearTint();
  }

  private startAttack(player: Vec2) {
    this.attackTargetKey=this.targetKey;
    this.world.shared?.monsterAttack(this);
    this.attacking = true;
    this.setFlipX(isoVector(player.x - this.x, player.y - this.y).x < 0);
    let animationDone = false, impactDone = false;
    const finish = () => { if (animationDone && impactDone) this.attacking = false; };
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.ctrl.play('attack', this.flipX ? 'left' : 'right', {
      lock: true,
      force: true,
      onComplete: () => {
        animationDone = true;
        finish();
      },
    });
    // telegraph: brief red glow during wind-up, then resolve the bite
    this.setTintFill(0xff9a7a);
    this.world.time.delayedCall(70, () => this.alive && this.clearTint());
    this.world.time.delayedCall(this.def.attackWindup, () => {
      if (this.alive && this.rootTimer <= 0) this.world.monsterHitPlayer(this);
      impactDone = true;
      finish();
    });
  }

  /** Boss ground slam: the world draws the warning circle and resolves the hit after the wind-up. */
  private startSlam() {
    const boss = this.def.boss!;
    this.attacking = true;
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.world.bossSlam(this, boss.slamRadius, boss.slamWindup, boss.slamMul);
    this.world.tweens.add({ targets: this, scaleY: this.scaleY * 1.12, yoyo: true, duration: boss.slamWindup / 2 });
    this.world.time.delayedCall(boss.slamWindup + 150, () => {
      this.attacking = false;
    });
  }

  hit(amount: number, crit: boolean, from: Vec2, source: 'player'|'wanderer' = 'player') {
    if (!this.alive) return;
    if(this.world.shared&&!this.world.shared.authority){if(source==='player')this.world.shared.auxiliary(this,amount);return;}
    if(source==='player'&&this.world.shared&&!this.lastAttacker)this.lastAttacker=this.world.shared.channel.selfKey;
    if(source==='player')this.playerContribution=true;
    this.hp = Math.max(0, this.hp - amount);
    this.barDirty = true;
    if(source==='player')provoke(this.brain);
    flash(this.world, this);
    impact(this.world, this.x, this.y - 28 * this.scaleY, crit ? 0xffe28a : 0xbfefff, crit);
    this.world.damageText.show(this.x, this.y - 60 * this.scaleY, `-${amount}`, crit ? 'crit' : 'enemy');
    if (this.hp <= 0) {
      this.die();
      return;
    }
    const summon = this.def.boss?.summon;
    if (summon && !this.summoned && this.hp <= this.def.hp * summon.atHpPct) {
      this.summoned = true;
      this.world.summonAdds(this, summon.type, summon.count);
    }
    if (this.def.boss) return;
    if (!this.attacking) {
      this.hurtTimer = 140;
      knockback(this.world, this, from.x, from.y, crit ? 220 : 140);
      this.ctrl.play('hurt', this.flipX ? 'left' : 'right', { force: true });
    }
  }

  private die() {
    this.respawnAt=!this.arena&&this.def.respawnMs>0?Date.now()+this.def.respawnMs:0;
    this.alive = false;
    this.attacking = false;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.enable = false;
    this.ctrl.play('die', this.flipX ? 'left' : 'right', { force: true, lock: true });
    this.label.setVisible(false);
    this.realmPlate?.setVisible(false);
    this.bar.clear();
    this.world.onMonsterKilled(this);
    this.world.tweens.add({
      targets: [this, this.art, this.shadow],
      alpha: 0,
      delay: 450,
      duration: 500,
      onComplete: () => this.setVisible(false),
    });
    if (!this.world.shared && !this.arena && this.def.respawnMs > 0) this.world.time.delayedCall(this.def.respawnMs, () => this.respawn());
  }

  /** Removes the monster without rewards (dungeon failed / left). */
  vanish() {
    if (!this.alive) return;
    this.alive = false;
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
    this.label.setVisible(false);
    this.realmPlate?.setVisible(false);
    this.bar.clear();
    this.world.tweens.add({ targets: [this, this.art, this.shadow], alpha: 0, duration: 500, onComplete: () => this.setVisible(false) });
  }

  private respawn() {
    if (!this.scene) return;
    const { home } = this.brain;
    this.setPosition(home.x, home.y);
    Object.assign(this.brain, createBrain(home));
    this.hp = this.def.hp;
    this.generation++;this.respawnAt=0;this.lastAttacker='';
    this.rootTimer = this.weakenTimer = this.slowTimer = 0;
    this.alive = true;
    this.attacking = false;
    this.hurtTimer = 0;
    this.playerContribution=false;
    this.barDirty = true;
    this.ctrl.unlock();
    this.ctrl.play('idle', 'right', { force: true });
    (this.body as Phaser.Physics.Arcade.Body).enable = true;
    (this.body as Phaser.Physics.Arcade.Body).reset(home.x, home.y);
    this.setVisible(false).setAlpha(0);
    this.art.setVisible(true);
    this.label.setVisible(!this.hideStrength);
    this.world.tweens.add({ targets: [this, this.shadow], alpha: 1, duration: 600 });
  }

  destroy(fromScene?: boolean) {
    this.art?.destroy();
    this.shadow?.destroy();
    this.label?.destroy();
    this.realmPlate?.destroy();
    this.bar?.destroy();
    super.destroy(fromScene);
  }

  networkState():WorldMonsterState {
    return {id:this.netId,type:this.type,x:this.x,y:this.y,homeX:this.brain.home.x,homeY:this.brain.home.y,hp:this.hp,alive:this.alive,flip:this.flipX,anim:!this.alive?'die':this.attacking?'attack':this.hurtTimer>0?'hurt':(this.body as Phaser.Physics.Arcade.Body).speed>5?'run':'idle',root:this.rootTimer,slow:this.slowTimer,generation:this.generation,respawnAt:this.respawnAt};
  }
  applyNetwork(state:WorldMonsterState){
    const revived=!this.alive&&state.alive,killed=this.alive&&!state.alive;
    this.setPosition(state.x,state.y);(this.body as Phaser.Physics.Arcade.Body).enable=false;
    this.hp=Math.min(this.def.hp,state.hp);this.alive=state.alive;this.generation=state.generation;this.respawnAt=state.respawnAt;this.rootTimer=state.root;this.slowTimer=state.slow;
    this.brain.home={x:state.homeX,y:state.homeY};this.setFlipX(state.flip);this.barDirty=true;
    if(revived){this.world.tweens.killTweensOf([this,this.art,this.shadow]);this.setAlpha(1);this.art.setVisible(true);this.shadow.setAlpha(1);this.ctrl.unlock();}
    if(killed){this.ctrl.unlock();this.ctrl.play('die',state.flip?'left':'right',{force:true});this.label.setVisible(false);this.realmPlate?.setVisible(false);this.bar.clear();this.world.tweens.add({targets:[this,this.art,this.shadow],alpha:0,delay:450,duration:450});}
    if(this.alive){this.ctrl.play(state.anim==='die'?'idle':state.anim,state.flip?'left':'right');this.syncDecor();}
  }
  showNetworkAttack(){if(this.world.shared?.authority)return;this.ctrl.play('attack',this.flipX?'left':'right',{lock:true,force:true});}
}
