import Phaser from 'phaser';
import { rosterArt } from '../art/heroRoster';
import { usesChildSprite } from '../systems/origin';
import type { SkillId } from '../../data';
import { gameStore, playerSkill } from '../../store/gameStore';
import { playerArt } from '../systems/character';
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
  type LifeState,
} from '../systems/respawn';
import { inputToMap, iso, isoVector } from '../art/iso';
import { TILE } from '../art/tiles';
import { dirFromVector, dirVector, type Dir, type Vec2 } from '../types';
import { findPath } from '../systems/path';
import type { WorldScene } from '../scenes/WorldScene';
import type { Monster } from './Monster';
import { heroName, isChildhood } from '../systems/origin';
import { immortalProgress, MOUNTS, mountUnlocked, flightProfile } from '../systems/immortal';
import { lifeProgress } from '../systems/life';
import { skillLoadout, skillUnlocked } from '../systems/skills';
import { heroDirection, type HeroDirection } from '../art/heroDirections';
import { realmNameAtLevel } from '../systems/progression';
import { flightRotation } from '../systems/flightVisual';
import { adventure } from '../systems/adventure';
import type { Pose } from '../../net/presence';
import { heroFor } from '../../data/heroes';
import { directionalArt } from '../art/directionalHeroes';
import { RealmNameplate } from './RealmNameplate';
import { worldInputBlocked } from '../systems/inputFocus';

type Keys = Record<'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd', Phaser.Input.Keyboard.Key>;

const SKILL_ANIM: Partial<Record<SkillId, string>> = {
  bang_tam_tram: 'attack_2',
  phi_kiem: 'cast',
  han_bang_tran: 'cast',
};

const LI_MU_SKILL_ANIM: Partial<Record<SkillId, string>> = {
  bang_tam_tram: 'skill_nguyet_anh',
  phi_kiem: 'skill_hoa_vu',
  han_bang_tran: 'skill_thien_hoa',
};
const WANG_LIN_SKILL_ANIM: Partial<Record<SkillId, string>> = {
  bang_tam_tram: 'skill_ta_kiem',
  phi_kiem: 'skill_hu_khong',
  han_bang_tran: 'skill_thon_thien',
};
const LI_MU_ART_FOOT_OFFSET_X = 24;
const AUTO_TARGET_RANGE = 420;
const AUTO_LOOT_RANGE = 180;

export class Player extends Phaser.Physics.Arcade.Sprite {
  readonly ctrl: AnimationController;
  /** The drawn body. The physics sprite underneath is invisible: it lives in map
   *  space, while everything visible is placed through the isometric projection. */
  readonly art: Phaser.GameObjects.Sprite;
  readonly life: LifeState = createLife();
  dir: Dir = 'down';
  private visualDir: HeroDirection = 'down';
  private mapFacing:Vec2=inputToMap(0,1);
  rootMs=0;
  cooldowns: Partial<Record<SkillId, number>> = {};
  meditating = false;
  lastDamageAt = -99999;

  private keys: Keys;
  private combo = 0;
  private comboTimer = 0;
  private queuedAttack = false;
  private dashTime = 0;
  private dashVec: Vec2 = { x: 0, y: 0 };
  private shadow: Phaser.GameObjects.Image;
  private mountArt: Phaser.GameObjects.Image;
  private realmAura: Phaser.GameObjects.Image;
  private nameplate: RealmNameplate;
  private bar: Phaser.GameObjects.Graphics;
  private route: Vec2[] = [];
  private autoRoute: Vec2[] = [];
  private autoPathBlocked: boolean[][] | null = null;
  private autoRouteTarget: Monster | null = null;
  private autoRouteTargetTile = '';
  private autoRouteStartTile = '';
  private autoRouteReady = false;
  private stuckMs = 0;
  private anchorX = 0;
  private anchorY = 0;
  private shield = 0;
  private shieldMs = 0;

  constructor(
    private world: WorldScene,
    x: number,
    y: number,
  ) {
    const p = gameStore.getState().player;
    const childArt=world.textures.exists(directionalArt(heroFor(p).id,true))?directionalArt(heroFor(p).id,true):p.sex==='female'?'mu_uyen_child':'thiet_tru';
    const adultArt=world.textures.exists(directionalArt(heroFor(p).id))?directionalArt(heroFor(p).id):p.heroId ? rosterArt(p.heroId) : p.sex==='male'?'hero-wang-v5':'hero-li-v5';
    const art = usesChildSprite(p) && world.textures.exists(childArt) ? childArt : world.textures.exists(adultArt)?adultArt:playerArt(p.sex);
    super(world, x, y, art);
    world.add.existing(this);
    world.physics.add.existing(this);
    this.setVisible(false);
    const spot = iso(x, y);
    this.art = world.add.sprite(spot.x, spot.y, art).setOrigin(0.5, 1);
    this.ctrl = new AnimationController(this.art, art);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(22, 14);
    // This invisible sprite holds the whole atlas, not an animated rig frame.
    // Keep its physics centre at (x, y), independently of atlas dimensions.
    body.setOffset(this.width * this.originX - 11, this.height * this.originY - 7);
    body.setCollideWorldBounds(true);

    this.shadow = world.add.image(spot.x, spot.y, 'shadow').setDepth(-100);
    this.mountArt = world.add.image(spot.x, spot.y, 'immortal-sword').setVisible(false);
    this.realmAura=world.add.image(spot.x,spot.y,'circle_gold').setVisible(false).setAlpha(.35).setBlendMode(Phaser.BlendModes.ADD);
    this.nameplate = new RealmNameplate(world,{level:p.level,child:isChildhood(p)},heroName(p));
    this.bar = world.add.graphics().setDepth(90000);

    const kb = world.input.keyboard!;
    // No capture: a captured key is preventDefault'ed page-wide, which would stop
    // the player from typing w/a/s/d/arrows into HUD and menu inputs.
    this.keys = kb.addKeys(
      {
        up: 'UP',
        down: 'DOWN',
        left: 'LEFT',
        right: 'RIGHT',
        w: 'W',
        a: 'A',
        s: 'S',
        d: 'D',
      },
      false,
    ) as Keys;

    this.ctrl.play('idle', this.dir);
  }

  get facing(): Vec2 {
    return this.mapFacing??dirVector(this.dir);
  }

  get feet(): Vec2 {
    return { x: this.x, y: this.y };
  }

  get nameplateBounds() { return this.nameplate.getBounds(); }

  private get activeMount() {
    const s = gameStore.getState();
    const id = immortalProgress(s.player).mount;
    if (!id || !mountUnlocked(id, s.quests,s.player) || this.world.map.arena || this.meditating || lifeProgress(s.player).retreat || !canAct(this.life)) return null;
    const mount=MOUNTS.find((m)=>m.id===id);
    return mount?{...mount,...flightProfile(s.player,id)}:null;
  }

  private dismount() {
    if (immortalProgress(gameStore.getState().player).mount) gameStore.getState().selectMount(null);
  }

  private manualInput(): Vec2 {
    if (worldInputBlocked()) return { x: 0, y: 0 };
    const k = this.keys;
    let x = (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0);
    let y = (k.down.isDown || k.s.isDown ? 1 : 0) - (k.up.isDown || k.w.isDown ? 1 : 0);
    if (x === 0 && y === 0) {
      x = virtualInput.x;
      y = virtualInput.y;
    }
    const l = Math.hypot(x, y);
    if (l < 0.01) return { x: 0, y: 0 };
    // Keys and joystick point at the screen; the body moves along the map's
    // diagonal axes, so the input is rotated into map space here.
    return inputToMap(x / l, y / l);
  }

  faceToward(p: Vec2) {
    const length=Math.hypot(p.x-this.x,p.y-this.y)||1;this.mapFacing={x:(p.x-this.x)/length,y:(p.y-this.y)/length};
    this.dir = dirFromVector(p.x - this.x, p.y - this.y, this.dir);
    const screen = isoVector(p.x - this.x, p.y - this.y);
    this.visualDir = heroDirection(screen.x, screen.y, this.visualDir);
  }

  update(dt: number) {
    this.rootMs=Math.max(0,this.rootMs-dt);
    this.shieldMs=Math.max(0,this.shieldMs-dt);if(!this.shieldMs)this.shield=0;
    tickLife(this.life, dt);
    for (const id of Object.keys(this.cooldowns) as SkillId[]) {
      this.cooldowns[id] = Math.max(0, (this.cooldowns[id] ?? 0) - dt);
    }
    this.comboTimer = Math.max(0, this.comboTimer - dt);
    const body = this.body as Phaser.Physics.Arcade.Body;

    if (!canAct(this.life) || lifeProgress(gameStore.getState().player).retreat || this.rootMs>0) {
      body.setVelocity(0, 0);
      if (canAct(this.life) && this.rootMs<=0 && this.ctrl.currentAnim !== 'meditate') this.ctrl.play('meditate', 'down', {force:true});
    } else if (this.dashTime > 0) {
      this.dashTime -= dt;
      body.setVelocity(this.dashVec.x, this.dashVec.y);
      if (this.dashTime <= 0) this.world.vfx.teleport(this.feet);
    } else {
      let move = this.manualInput();
      const manual = Math.hypot(move.x, move.y) > 0.1;
      if (manual) {
        this.clearAutoRoute();
        if (this.route.length) this.world.cancelQuestNav();
        if (this.meditating) this.stopMeditate();
      } else if (gameStore.getState().auto && !this.meditating) {
        if (this.route.length) this.world.cancelQuestNav();
        move = this.autoControl();
      } else {
        this.clearAutoRoute();
        if (this.route.length && !this.meditating) {
          move = this.followRoute();
          if (this.route.length) this.watchStuck(dt);
        }
      }

      if (this.ctrl.locked || this.meditating) {
        body.setVelocity(0, 0);
      } else {
        const speed = gameStore.getState().stats.speed * (this.activeMount?.speed ?? 1);
        const mag = Math.hypot(move.x, move.y);
        body.setVelocity(move.x * speed, move.y * speed);
        if (mag > 0.1) {
          const onScreen = isoVector(move.x, move.y);
          this.mapFacing={x:move.x/mag,y:move.y/mag};
          this.dir = dirFromVector(move.x, move.y, this.dir);
          this.visualDir = heroDirection(onScreen.x, onScreen.y, this.visualDir);
          this.ctrl.play(this.activeMount ? 'idle' : 'run', this.visualDir);
        } else {
          this.ctrl.play('idle', this.visualDir);
        }
      }
    }

    const spot = iso(this.x, this.y);
    const centerOffset =
      this.art.texture.key === 'player' ? (this.art.flipX ? LI_MU_ART_FOOT_OFFSET_X : -LI_MU_ART_FOOT_OFFSET_X) : 0;
    const mount = this.activeMount;
    const lift = mount ? 44 + Math.sin(this.world.time.now / 500) * 2 : 0;
    this.mountArt.setVisible(!!mount?.showMount);
    if (mount) this.mountArt.setTexture(`immortal-${mount.id}`).setDisplaySize(160, 100).setFlipX(mount.id==='crane'&&isoVector(this.facing.x,this.facing.y).x<0).setRotation(mount.id==='sword'?flightRotation(this.facing):0).setPosition(spot.x, spot.y - lift + (mount.id==='sword'?-1:20)).setDepth(spot.y - 0.1);
    this.art.setPosition(spot.x + centerOffset, spot.y - lift).setDepth(spot.y);
    const p=gameStore.getState().player;
    this.nameplate.sync({level:p.level,child:isChildhood(p)},heroName(p));
    this.syncLook();
    this.realmAura.setVisible(p.realmIndex>0&&!isChildhood(p)&&canAct(this.life)).setPosition(spot.x,spot.y-lift+3).setScale(.21+p.realmIndex*.018,.1+p.realmIndex*.009).setTint([0xd7f3ff,0x90dcff,0xffdf9d,0xd7b6ff][p.realmIndex%4]).setDepth(spot.y-.2);
    if(p.realmIndex>0&&!this.isTinted&&!this.tintFill)this.art.setTint([0xffffff,0xe1f4ff,0xffefd6,0xf0e3ff][p.realmIndex%4]);
    this.shadow.setPosition(spot.x, spot.y - 2);
    this.nameplate.place(spot.x, spot.y - (this.ctrl.rig.frameHeight === 160 ? 119 : 92) - lift);
    this.drawBar({x:spot.x,y:spot.y-lift});
  }

  /** Copies flashing/alpha from the hidden physics sprite onto the drawn body. */
  private syncLook() {
    this.art.setAlpha(this.alpha).setScale(this.scaleX, this.scaleY);
    if (this.tintFill) this.art.setTintFill(this.tintTopLeft);
    else if (this.isTinted) this.art.setTint(this.tintTopLeft);
    else this.art.clearTint();
  }

  private drawBar(spot: Vec2) {
    const { player, stats } = gameStore.getState();
    const w = 46;
    this.bar.clear();
    const above = this.ctrl.rig.frameHeight === 160 ? 117 : 90;
    this.bar.fillStyle(0x10131f, 0.75).fillRoundedRect(spot.x - w / 2 - 1, spot.y - above, w + 2, 6, 2);
    this.bar.fillStyle(0x4cd96b, 1).fillRoundedRect(spot.x - w / 2, spot.y - above + 1, (w * player.hp) / stats.maxHp, 4, 2);
  }

  // ---- auto combat -------------------------------------------------------

  private autoControl(): Vec2 {
    const w = this.world;
    const range = playerSkill('basic').range;
    const target = w.nearestMonster(this, AUTO_TARGET_RANGE);
    if (w.target !== target) w.setTarget(target);
    const nearbyLoot = target ? null : w.nearestLoot(this, AUTO_LOOT_RANGE);
    const engaged = target && target.distanceTo(this) < range + 40;

    if (!engaged && nearbyLoot) {
      this.clearAutoRoute();
      return this.toward(nearbyLoot);
    }
    if (!target) {
      this.clearAutoRoute();
      return { x: 0, y: 0 };
    }
    w.setTarget(target);
    const d = target.distanceTo(this);
    // use skills first, then basic attacks
    for (const id of skillLoadout(gameStore.getState().player).filter(id => id !== 'basic' && id !== 'than_phap')) {
      const sk = playerSkill(id);
      const s = gameStore.getState();
      if (sk.kind === 'heal' && s.player.hp > s.stats.maxHp * .65) continue;
      if (sk.kind === 'shield' && (this.shield > 0 || d > 180)) continue;
      if ((sk.kind === 'heal' || sk.kind === 'shield' || d <= sk.range * 0.8) && this.skillReady(id)) {
        this.faceToward(target);
        this.castSkill(id);
        return { x: 0, y: 0 };
      }
    }
    if (d <= range - 8) {
      this.clearAutoRoute();
      this.faceToward(target);
      this.attack();
      return { x: 0, y: 0 };
    }
    return this.followAutoRoute(target);
  }

  private followAutoRoute(target: Monster): Vec2 {
    const targetX = Math.floor(target.x / TILE);
    const targetY = Math.floor(target.y / TILE);
    const targetTile = `${targetX},${targetY}`;
    const startX = Math.floor(this.x / TILE);
    const startY = Math.floor(this.y / TILE);
    const startTile = `${startX},${startY}`;
    if (
      this.autoRouteTarget !== target ||
      this.autoRouteTargetTile !== targetTile ||
      (!this.autoRoute.length && (!this.autoRouteReady || this.autoRouteStartTile !== startTile))
    ) {
      if (!this.autoPathBlocked) {
        this.autoPathBlocked = this.world.map.blocked.map((row) => row.slice());
        for (const npc of this.world.map.npcs) {
          if (this.autoPathBlocked[npc.y]) this.autoPathBlocked[npc.y][npc.x] = true;
        }
      }
      const path = findPath(this.autoPathBlocked, startX, startY, targetX, targetY);
      this.autoRouteTarget = target;
      this.autoRouteTargetTile = targetTile;
      this.autoRouteStartTile = startTile;
      this.autoRouteReady = true;
      this.autoRoute = path.reached
        ? path.tiles.map((tile) => ({ x: tile.x * TILE + TILE / 2, y: tile.y * TILE + TILE / 2 }))
        : [];
      if (!path.reached) return { x: 0, y: 0 };
    }

    while (this.autoRoute.length) {
      const waypoint = this.autoRoute[0];
      const dx = waypoint.x - this.x;
      const dy = waypoint.y - this.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 22) return { x: dx / distance, y: dy / distance };
      this.autoRoute.shift();
    }
    return this.toward(target);
  }

  private clearAutoRoute() {
    this.autoRoute = [];
    this.autoRouteTarget = null;
    this.autoRouteTargetTile = '';
    this.autoRouteStartTile = '';
    this.autoRouteReady = false;
  }

  setRoute(points: Vec2[]) {
    const tileX = Math.floor(this.x / TILE), tileY = Math.floor(this.y / TILE);
    // A* starts at a tile centre. Align first when a player stops near its edge.
    const centre = { x: (tileX + .5) * TILE, y: (tileY + .5) * TILE };
    this.route = points.length && !this.world.map.blocked[tileY]?.[tileX]
      ? [centre, ...points] : points;
    this.stuckMs = 0;
    this.anchorX = this.x;
    this.anchorY = this.y;
    if (this.meditating) this.stopMeditate();
  }

  clearRoute() {
    this.route = [];
    this.stuckMs = 0;
  }

  private followRoute(): Vec2 {
    for (let i = 0; i < 4; i++) {
      const step = this.stepRoute();
      if (step) return step;
      this.world.onQuestRouteDone();
      if (this.route.length === 0) return { x: 0, y: 0 };
    }
    return { x: 0, y: 0 };
  }

  private stepRoute(): Vec2 | null {
    while (this.route.length) {
      const goal = this.route[0];
      const dx = goal.x - this.x;
      const dy = goal.y - this.y;
      const dist = Math.hypot(dx, dy);
      // Reach the corner before turning; a large tolerance cuts through walls.
      if (dist > 4) {
        const speed = gameStore.getState().stats.speed * (this.activeMount?.speed ?? 1);
        // Slow down for the last step, also on phones with a low frame rate.
        const travel = speed * Math.max(1000 / 60, this.scene.game.loop.delta) / 1000;
        const divisor = Math.max(dist, travel);
        return { x: dx / divisor, y: dy / divisor };
      }
      this.route.shift();
    }
    return null;
  }

  private watchStuck(dt: number) {
    this.stuckMs += dt;
    if (this.stuckMs < 800) return;
    const moved = Math.hypot(this.x - this.anchorX, this.y - this.anchorY);
    this.stuckMs = 0;
    this.anchorX = this.x;
    this.anchorY = this.y;
    if (moved < .5) this.world.repathQuest();
  }

  private toward(p: Vec2): Vec2 {
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const l = Math.hypot(dx, dy) || 1;
    return { x: dx / l, y: dy / l };
  }

  // ---- actions -----------------------------------------------------------

  skillReady(id: SkillId) {
    return (this.cooldowns[id] ?? 0) <= 0 && gameStore.getState().player.mp >= playerSkill(id).mpCost;
  }

  private autoFace(range: number) {
    const opponent=this.world.shared?.opponent(range);if(opponent){this.faceToward(opponent);return null;}
    const t = this.world.target?.alive && this.world.target.distanceTo(this) <= range ? this.world.target : this.world.nearestMonster(this, range);
    if (t) this.faceToward(t);
    return t;
  }

  attack() {
    if(this.rootMs>0)return;
    if(lifeProgress(gameStore.getState().player).retreat)return;
    if (isChildhood(gameStore.getState().player)) return;
    if (!canAct(this.life) || this.dashTime > 0) return;
    if (this.meditating) this.stopMeditate();
    if (this.ctrl.locked) {
      this.queuedAttack = true;
      return;
    }
    if ((this.cooldowns.basic ?? 0) > 0) return;
    this.dismount();
    this.queuedAttack = false;
    this.combo = this.comboTimer > 0 ? (this.combo % 3) + 1 : 1;
    this.comboTimer = 900;
    const basic = playerSkill('basic');
    this.cooldowns.basic = basic.cooldownMs;
    this.autoFace(basic.range + 50);
    const combo = this.combo;
    this.ctrl.play(`attack_${combo}`, this.visualDir, {
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
    if(this.rootMs>0)return;
    if(lifeProgress(gameStore.getState().player).retreat)return;
    if (isChildhood(gameStore.getState().player)) return;
    if((id!=='than_phap'&&!skillLoadout(gameStore.getState().player).includes(id))||!skillUnlocked(gameStore.getState().player,id))return;
    if (id === 'basic') return this.attack();
    if (id === 'than_phap') return this.dash();
    const store = gameStore.getState();
    if (!canAct(this.life) || this.ctrl.locked || this.dashTime > 0) return;
    if ((this.cooldowns[id] ?? 0) > 0) return;
    const sk = playerSkill(id);
    let target: Monster | null = null;
    if (id === 'phi_kiem') {
      target = this.autoFace(sk.range);
      if (!target && !this.world.shared?.opponent(sk.range)) {
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
    this.dismount();
    if (this.meditating) this.stopMeditate();
    this.cooldowns[id] = sk.cooldownMs;
    const animation =
      store.player.sex !== 'male'
        ? LI_MU_SKILL_ANIM[id]
        : store.player.sex === 'male'
          ? WANG_LIN_SKILL_ANIM[id]
          : undefined;
    // Compact character atlases only carry the shared cast/attack poses.
    const pose = animation && this.ctrl.rig.anims[animation] ? animation : SKILL_ANIM[id] ?? 'cast';
    this.ctrl.play(pose, this.visualDir, {
      lock: true,
      force: true,
      onHit: () => this.world.executeSkill(id, target),
    });
  }

  dash() {
    if(this.rootMs>0)return;
    if(lifeProgress(gameStore.getState().player).retreat)return;
    if (isChildhood(gameStore.getState().player)) return;
    if (!canAct(this.life) || this.dashTime > 0) return;
    if ((this.cooldowns.than_phap ?? 0) > 0) return;
    const store = gameStore.getState();
    const sk = playerSkill('than_phap');
    if (!store.spendMp(sk.mpCost)) return;
    if (this.meditating) this.stopMeditate();
    let v = this.manualInput();
    if (Math.hypot(v.x, v.y) < 0.1) v = this.facing;
    const l = Math.hypot(v.x, v.y) || 1;
    const speed = 820;
    this.dashVec = { x: (v.x / l) * speed, y: (v.y / l) * speed };
    this.dir = dirFromVector(v.x, v.y, this.dir);
    this.mapFacing={x:v.x/l,y:v.y/l};
    const screen = isoVector(v.x, v.y);
    this.visualDir = heroDirection(screen.x, screen.y, this.visualDir);
    this.dashTime = 180;
    this.world.vfx.teleport(this.feet);
    this.world.shared?.attack('than_phap');
    this.cooldowns.than_phap = sk.cooldownMs;
    grantInvuln(this.life, sk.active?.invulnMs ?? 320);
    this.ctrl.unlock();
    this.ctrl.play('run', this.visualDir, { force: true });
    store.recordPractice('dash');
  }

  startMeditate() {
    if(lifeProgress(gameStore.getState().player).retreat || gameStore.getState().tribulation)return;
    if (isChildhood(gameStore.getState().player)) {
      gameStore.getState().toast(`${heroName(gameStore.getState().player)} còn là phàm nhân. Hãy theo câu chuyện để nhập môn trước.`, 'info');
      return;
    }
    if (!canAct(this.life) || this.meditating) return;
    if (this.world.time.now - this.lastDamageAt < 3000) {
      gameStore.getState().toast('Đang chiến đấu, không thể tọa thiền', 'warn');
      return;
    }
    this.meditating = true;
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.ctrl.play('meditate', 'down', { force: true });
    gameStore.getState().patch({ meditating: true });
    gameStore.getState().addLog('Bắt đầu tọa thiền, hấp thu linh khí...');
  }

  stopMeditate() {
    if (!this.meditating) return;
    this.meditating = false;
    this.ctrl.play('idle', this.visualDir, { force: true });
    gameStore.getState().patch({ meditating: false });
  }

  /** Returns false if the hit was ignored (invulnerable / downed). */
  takeHit(amount: number, crit: boolean, from: Vec2): boolean {
    if (!canBeHit(this.life)) return false;
    const store = gameStore.getState();
    this.lastDamageAt = this.world.time.now;
    this.dismount();
    if (this.meditating) this.stopMeditate();
    const absorbed=Math.min(this.shield,amount);this.shield-=absorbed;
    const hp = store.damagePlayer(Math.max(0,amount-absorbed));
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
    this.world.cancelQuestNav();
    knockDown(this.life);
    this.queuedAttack = false;
    this.dashTime = 0;
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.ctrl.play('downed', this.dir, { lock: true, force: true });
    this.setTint(0x8890a8);
    const s = gameStore.getState();
    s.patch({ status: 'downed', downedRemaining: 0 });
    s.addLog('Bạn đã bị hạ gục. Đang đưa về tông môn đã ghi danh.');
    this.world.returnToSect();
    this.world.cameras.main.shake(250, 0.01);
    this.world.cameras.main.flash(250, 120, 0, 0);
  }

  grantShield(amount:number,ms:number){this.shield=amount;this.shieldMs=ms;this.world.vfx.ascend(this);}

  networkPose():Pose {
    const s=gameStore.getState(),p=s.player,stats=s.stats,mount=this.activeMount;
    const body=this.body as Phaser.Physics.Arcade.Body;
    return {x:Math.round(this.x),y:Math.round(this.y),dir:this.dir,visualDir:this.visualDir,dx:this.facing.x,dy:this.facing.y,moving:Math.hypot(body.velocity.x,body.velocity.y)>8,mount:mount?.id??null,showMount:mount?.showMount??false,child:isChildhood(p),realm:isChildhood(p)?'Phàm Nhân':realmNameAtLevel(p.level),sect:adventure(p).boundSect,pkMode:p.pkMode??'peace',combat:{atk:stats.atk,def:stats.def,maxHp:stats.maxHp,hp:p.hp,maxMp:stats.maxMp,mp:p.mp,critRate:stats.critRate,critMul:stats.critMul,level:p.level,loadout:skillLoadout(p),skills:p.skills??{}}};
  }

  destroy(fromScene?: boolean) {
    this.realmAura?.destroy();
    this.art?.destroy();
    this.shadow?.destroy();
    this.mountArt?.destroy();
    this.nameplate?.destroy();
    this.bar?.destroy();
    super.destroy(fromScene);
  }
}
