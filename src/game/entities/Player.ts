import Phaser from 'phaser';
import { ITEMS, RARITIES, type SkillId } from '../../data';
import { gameStore, playerSkill } from '../../store/gameStore';
import { playerArt } from '../systems/character';
import { itemSpriteTextureKey } from '../art/icons';
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
import { inputToMap, iso, isoVector } from '../art/iso';
import { TILE } from '../art/tiles';
import { dirFromVector, dirVector, type Dir, type Vec2 } from '../types';
import { findPath } from '../systems/path';
import type { WorldScene } from '../scenes/WorldScene';
import type { Monster } from './Monster';
import { heroName, isChildhood } from '../systems/origin';
import { immortalProgress, MOUNTS, mountUnlocked } from '../systems/immortal';

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
  private weaponArt: Phaser.GameObjects.Image;
  private weaponAura: Phaser.GameObjects.Image;
  private weaponPulse: Phaser.Tweens.Tween | null = null;
  private equippedWeaponId: string | null = null;
  private label: Phaser.GameObjects.Text;
  private bar: Phaser.GameObjects.Graphics;
  private aura: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private blink: Phaser.Tweens.Tween | null = null;
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

  constructor(
    private world: WorldScene,
    x: number,
    y: number,
  ) {
    const p = gameStore.getState().player;
    const art = isChildhood(p) && world.textures.exists('thiet_tru') ? 'thiet_tru' : playerArt(p.sex);
    super(world, x, y, art);
    world.add.existing(this);
    world.physics.add.existing(this);
    this.setVisible(false);
    const spot = iso(x, y);
    this.art = world.add.sprite(spot.x, spot.y, art).setOrigin(0.5, 1);
    this.ctrl = new AnimationController(this.art, art);
    this.weaponAura = world.add
      .image(spot.x, spot.y, 'fx_dot')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDisplaySize(64, 34)
      .setVisible(false);
    this.weaponArt = world.add.image(spot.x, spot.y, 'item-sprite-weapon-white').setScale(0.32).setVisible(false);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(22, 14);
    // This invisible sprite holds the whole atlas, not an animated rig frame.
    // Keep its physics centre at (x, y), independently of atlas dimensions.
    body.setOffset(this.width * this.originX - 11, this.height * this.originY - 7);
    body.setCollideWorldBounds(true);

    this.shadow = world.add.image(spot.x, spot.y, 'shadow').setDepth(-100);
    this.mountArt = world.add.image(spot.x, spot.y, 'immortal-sword').setVisible(false);
    this.label = world.add
      .text(spot.x, spot.y, heroName(p), {
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#1a2240',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setResolution(2)
      .setDepth(90000);
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
    return dirVector(this.dir);
  }

  get feet(): Vec2 {
    return { x: this.x, y: this.y };
  }

  private get activeMount() {
    const s = gameStore.getState();
    const id = immortalProgress(s.player).mount;
    if (!id || !mountUnlocked(id, s.quests) || this.world.map.arena || this.meditating || !canAct(this.life)) return null;
    return MOUNTS.find((m) => m.id === id) ?? null;
  }

  private dismount() {
    if (immortalProgress(gameStore.getState().player).mount) gameStore.getState().selectMount(null);
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
    if (l < 0.01) return { x: 0, y: 0 };
    // Keys and joystick point at the screen; the body moves along the map's
    // diagonal axes, so the input is rotated into map space here.
    return inputToMap(x / l, y / l);
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
          this.dir = dirFromVector(onScreen.x, onScreen.y, this.dir);
          this.ctrl.play(this.activeMount ? 'idle' : 'run', this.dir);
        } else {
          this.ctrl.play('idle', this.dir);
        }
      }
    }

    const spot = iso(this.x, this.y);
    const centerOffset =
      this.art.texture.key === 'player' ? (this.art.flipX ? LI_MU_ART_FOOT_OFFSET_X : -LI_MU_ART_FOOT_OFFSET_X) : 0;
    const mount = this.activeMount;
    const lift = mount ? 24 + Math.sin(this.world.time.now / 260) * 3 : 0;
    this.mountArt.setVisible(!!mount);
    if (mount) this.mountArt.setTexture(`immortal-${mount.id}`).setDisplaySize(160, 100).setFlipX(this.dir === 'left').setPosition(spot.x, spot.y - lift - 4).setDepth(spot.y - 0.1);
    this.art.setPosition(spot.x + centerOffset, spot.y - lift).setDepth(spot.y);
    this.syncLook();
    this.syncWeapon(spot);
    this.shadow.setPosition(spot.x, spot.y - 2);
    this.label.setPosition(spot.x, spot.y - 106 - lift);
    this.drawBar(spot);
  }

  /** Copies flashing/alpha from the hidden physics sprite onto the drawn body. */
  private syncLook() {
    this.art.setAlpha(this.alpha).setScale(this.scaleX, this.scaleY);
    if (this.tintFill) this.art.setTintFill(this.tintTopLeft);
    else if (this.isTinted) this.art.setTint(this.tintTopLeft);
    else this.art.clearTint();
  }

  private syncWeapon(spot: Vec2) {
    const weaponId = gameStore.getState().player.equipment.weapon ?? null;
    if (weaponId !== this.equippedWeaponId) {
      this.equippedWeaponId = weaponId;
      const texture = weaponId ? itemSpriteTextureKey(weaponId) : undefined;
      if (!weaponId || !texture || !this.world.textures.exists(texture)) {
        this.weaponArt.setVisible(false);
        this.weaponAura.setVisible(false);
        this.weaponPulse?.stop();
        this.weaponPulse = null;
        return;
      }

      this.weaponArt.setTexture(texture).setVisible(true);
      const rarity = ITEMS[weaponId]?.rarity;
      const rarityIndex = RARITIES.findIndex((entry) => entry.id === rarity);
      const glowStart = RARITIES.findIndex((entry) => entry.id === 'purple');
      const glow = rarityIndex >= glowStart;
      this.weaponPulse?.stop();
      this.weaponPulse = null;
      this.weaponAura.setVisible(glow);
      if (glow) {
        const color = rarity === 'pink' ? '#ff4a4a' : RARITIES[rarityIndex]?.color ?? '#b46cff';
        this.weaponAura.setTint(Phaser.Display.Color.HexStringToColor(color).color);
        this.weaponPulse = this.world.tweens.add({
          targets: this.weaponAura,
          alpha: { from: 0.38, to: 0.82 },
          scaleX: { from: 1.1, to: 1.5 },
          scaleY: { from: 0.9, to: 1.2 },
          duration: 700,
          yoyo: true,
          repeat: -1,
        });
      }
    }

    const left = this.dir === 'left';
    const rotation = this.dir === 'up' ? -Math.PI / 2 : this.dir === 'down' ? Math.PI / 2 : 0;
    const x = spot.x + (left ? -17 : 17);
    const y = spot.y - (this.dir === 'down' ? 40 : 51);
    this.weaponAura.setPosition(x, y).setDepth(spot.y);
    this.weaponArt.setPosition(x, y).setRotation(rotation).setFlipX(left).setDepth(spot.y + 1);
  }

  private drawBar(spot: Vec2) {
    const { player, stats } = gameStore.getState();
    const w = 46;
    this.bar.clear();
    this.bar.fillStyle(0x10131f, 0.75).fillRoundedRect(spot.x - w / 2 - 1, spot.y - 104, w + 2, 6, 2);
    this.bar.fillStyle(0x4cd96b, 1).fillRoundedRect(spot.x - w / 2, spot.y - 103, (w * player.hp) / stats.maxHp, 4, 2);
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
    for (const id of ['han_bang_tran', 'bang_tam_tram', 'phi_kiem'] as SkillId[]) {
      const sk = playerSkill(id);
      if (d <= sk.range * 0.8 && this.skillReady(id)) {
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
    const t = this.world.target?.alive && this.world.target.distanceTo(this) <= range ? this.world.target : this.world.nearestMonster(this, range);
    if (t) this.faceToward(t);
    return t;
  }

  attack() {
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
    if (isChildhood(gameStore.getState().player)) return;
    if (id === 'basic') return this.attack();
    if (id === 'than_phap') return this.dash();
    const store = gameStore.getState();
    if (!canAct(this.life) || this.ctrl.locked || this.dashTime > 0) return;
    if ((this.cooldowns[id] ?? 0) > 0) return;
    const sk = playerSkill(id);
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
    this.dismount();
    if (this.meditating) this.stopMeditate();
    this.cooldowns[id] = sk.cooldownMs;
    const animation =
      this.art.texture.key === 'player'
        ? LI_MU_SKILL_ANIM[id]
        : this.art.texture.key === 'player_male'
          ? WANG_LIN_SKILL_ANIM[id]
          : undefined;
    this.ctrl.play(animation ?? SKILL_ANIM[id] ?? 'cast', this.dir, {
      lock: true,
      force: true,
      onHit: () => this.world.executeSkill(id, target),
    });
  }

  dash() {
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
    this.dashTime = 180;
    this.world.vfx.teleport(this.feet);
    this.cooldowns.than_phap = sk.cooldownMs;
    grantInvuln(this.life, sk.active?.invulnMs ?? 320);
    this.ctrl.unlock();
    this.ctrl.play('run', this.dir, { force: true });
  }

  startMeditate() {
    if (isChildhood(gameStore.getState().player)) {
      gameStore.getState().toast('Thiết Trụ còn là phàm nhân. Hãy theo câu chuyện để nhập môn trước.', 'info');
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
    this.dismount();
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
    this.world.cancelQuestNav();
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
    this.art?.destroy();
    this.weaponArt?.destroy();
    this.weaponAura?.destroy();
    this.weaponPulse?.stop();
    this.shadow?.destroy();
    this.mountArt?.destroy();
    this.label?.destroy();
    this.bar?.destroy();
    this.aura?.destroy();
    super.destroy(fromScene);
  }
}
