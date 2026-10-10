import Phaser from 'phaser';
import { DUNGEONS, ITEMS, MONSTERS, SKILLS, type SkillId, type WaveSpawn } from '../../data';
import { gameStore, itemName, playerSkill, type DungeonHud, type TargetInfo } from '../../store/gameStore';
import { TERRAIN, TILE } from '../art/tiles';
import { EventBus } from '../EventBus';
import { Player } from '../entities/Player';
import { Monster } from '../entities/Monster';
import { LootDrop } from '../entities/LootDrop';
import { Npc } from '../entities/Npc';
import { DamageText } from '../fx/DamageText';
import { impact } from '../fx/HitEffect';
import { SkillVfx } from '../fx/SkillVfx';
import { getMap } from '../maps';
import type { MapDef, PortalDef } from '../maps/MapBuilder';
import { computeDamage, inAttackArc } from '../systems/combat';
import { meditateGain, zoneAt, type ZoneDef } from '../systems/cultivation';
import { runOver, startRun, tickRun, type DungeonRun, type RunEvent } from '../systems/dungeon';
import { rollLoot } from '../systems/loot';
import { saveGame } from '../systems/save';
import type { Vec2 } from '../types';

interface WorldData {
  mapId?: string;
  spawn?: [number, number];
  pos?: Vec2 | null;
}

const WORLD_CHAT = [
  'Lâm Phong: Có đạo hữu nào lập đội đi Linh Thú Lâm không?',
  'Bạch Vân: Hỏa Hồ rơi Nhẫn Bạc, ai cần không?',
  'Hệ thống Tông Môn: Linh Đài đang có linh khí dồi dào, mau đến tọa thiền!',
  'Tiêu Dao: Vừa đột phá Luyện Khí Trung Kỳ, đa tạ sư huynh chỉ điểm!',
  'Mộ Dung Tuyết: Bán Linh Thạch giá hữu nghị...',
  'Thương Hội: Tiền Đa Bảo có Hồi Xuân Đan, chỉ 2 Linh Thạch một viên.',
  'Hàn Lập: Băng Tuyết Động rơi Kiếm Phổ Tàn Trang, nâng kỹ năng lên cấp 5 mạnh hẳn!',
  'Vương Lâm: Cửu Vĩ Hỏa Hồ ở Hỏa Diễm Cốc dậm đất đau quá, nhớ né vòng đỏ.',
];

const hash = (x: number, y: number) => ((x * 73856093) ^ (y * 19349663)) >>> 0;

export class WorldScene extends Phaser.Scene {
  map!: MapDef;
  player!: Player;
  monsters: Monster[] = [];
  npcs: Npc[] = [];
  loot!: Phaser.Physics.Arcade.Group;
  damageText!: DamageText;
  vfx!: SkillVfx;
  target: Monster | null = null;
  run: DungeonRun | null = null;

  private mapId = 'dai_thua_vien';
  private spawnData: WorldData = {};
  private collision!: Phaser.Tilemaps.TilemapLayer;
  private targetRing!: Phaser.GameObjects.Image;
  private currentZone: ZoneDef | null = null;
  private transitioning = false;
  private cleanups: (() => void)[] = [];
  private syncTimer = 0;
  private secondTimer = 0;
  private saveTimer = 0;
  private chatTimer = 15000;

  constructor() {
    super('World');
  }

  init(data: WorldData) {
    this.mapId = data.mapId ?? 'dai_thua_vien';
    this.spawnData = data;
    this.monsters = [];
    this.npcs = [];
    this.target = null;
    this.run = null;
    this.currentZone = null;
    this.transitioning = false;
    this.cleanups = [];
  }

  create() {
    const map = (this.map = getMap(this.mapId));
    this.damageText = new DamageText(this);
    this.vfx = new SkillVfx(this);
    const W = map.width * TILE;
    const H = map.height * TILE;
    this.physics.world.setBounds(0, 0, W, H);

    this.buildTerrain(map);
    this.buildDecor(map);

    for (const n of map.npcs) {
      this.npcs.push(new Npc(this, n.id, n.x * TILE + TILE / 2, n.y * TILE + TILE - 6));
      this.collision.putTileAt(0, n.x, n.y);
    }
    for (const m of map.monsters) {
      this.monsters.push(new Monster(this, m.type, m.x * TILE + TILE / 2, m.y * TILE + TILE / 2));
    }

    const start = this.resolveSpawn(map);
    this.player = new Player(this, start.x, start.y);
    this.targetRing = this.add
      .image(0, 0, 'circle_gold')
      .setScale(0.28, 0.16)
      .setAlpha(0.9)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setVisible(false)
      .setDepth(-50);
    this.tweens.add({ targets: this.targetRing, angle: 360, duration: 4000, repeat: -1 });

    this.physics.add.collider(this.player, this.collision);
    this.physics.add.collider(this.monsters, this.collision);
    this.physics.add.collider(this.monsters, this.monsters);
    this.loot = this.physics.add.group();
    this.physics.add.overlap(this.player, this.loot, (_p, l) => this.collectLoot(l as LootDrop));
    this.buildPortals(map);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, W, H);
    cam.startFollow(this.player, true, 0.12, 0.12);
    cam.setRoundPixels(true);
    this.fitZoom();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.fitZoom, this);
    this.cleanups.push(() => this.scale.off(Phaser.Scale.Events.RESIZE, this.fitZoom, this));
    cam.fadeIn(400);
    if (this.game.renderer.type === Phaser.WEBGL) {
      cam.postFX.addVignette(0.5, 0.5, 0.92, map.ambient === 'fireflies' ? 0.42 : 0.28);
    }
    this.buildAmbient(map);

    this.bindInput();
    this.bindStore();

    const s = gameStore.getState();
    s.patch({ mapId: map.id, zone: null, target: null, nearbyNpc: null, spawnPos: null, dungeon: null, dungeonResult: null });
    s.addLog(`Tiến vào ${map.name}`);
    s.toast(map.name, 'info');
    s.questEvent({ type: 'enterZone', zone: map.id });
    if (map.arena) {
      this.run = startRun(map.arena.dungeon, DUNGEONS[map.arena.dungeon]);
      s.addLog(`Tiêu diệt ${DUNGEONS[map.arena.dungeon].waves.length} đợt quái và thủ lĩnh trước khi hết giờ!`);
    } else {
      if (s.dungeonReturn) s.patch({ dungeonReturn: null });
      if (!s.quests.main_0 || s.quests.main_0.status === 'active') {
        s.addLog('Hãy đến gặp Vân Hạc Trưởng Lão ở phía bắc (phím E để trò chuyện).');
      }
    }
    this.save();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.cleanups.forEach((fn) => fn());
      this.cleanups = [];
    });
  }

  // ---- construction ------------------------------------------------------

  private buildTerrain(map: MapDef) {
    const data = map.terrain.map((row, y) =>
      row.map((t, x) => TERRAIN[t].base + (hash(x, y) % TERRAIN[t].variants)),
    );
    const tm = this.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });
    const tileset = tm.addTilesetImage('tiles', 'tiles', TILE, TILE, 0, 0)!;
    tm.createLayer(0, tileset, 0, 0)!.setDepth(-10000);
    this.collision = tm.createBlankLayer('collision', tileset)!;
    map.blocked.forEach((row, y) =>
      row.forEach((b, x) => {
        if (b) this.collision.putTileAt(0, x, y);
      }),
    );
    this.collision.setCollision(0).setVisible(false);
  }

  private buildDecor(map: MapDef) {
    for (const d of map.decor) {
      const px = d.x * TILE + TILE / 2;
      if (d.key === 'circle') {
        const zone = map.zones[0];
        const w = zone ? zone.rect[2] * TILE : 320;
        const h = zone ? zone.rect[3] * TILE : 200;
        const cy = d.y * TILE + TILE / 2;
        const outer = this.add
          .image(px, cy, 'circle')
          .setScale((w * 0.8) / 320, (h * 0.9) / 320)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(0.55)
          .setDepth(-9000);
        this.tweens.add({ targets: outer, alpha: 0.25, yoyo: true, repeat: -1, duration: 1800, ease: 'Sine.InOut' });
        const inner = this.add
          .image(px, cy, 'circle_gold')
          .setScale(0.55)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(0.45)
          .setDepth(-8999);
        this.tweens.add({ targets: inner, angle: 360, duration: 24000, repeat: -1 });
        const motes = this.add.particles(px, cy, 'fx_dot', {
          x: { min: -w * 0.35, max: w * 0.35 },
          y: { min: -h * 0.3, max: h * 0.3 },
          speedY: { min: -40, max: -15 },
          scale: { start: 0.6, end: 0 },
          alpha: { start: 0.9, end: 0 },
          lifespan: 2200,
          frequency: 90,
          tint: [0x9fe3ff, 0xffffff, 0xffe39a],
          blendMode: Phaser.BlendModes.ADD,
        });
        motes.setDepth(cy + 200);
        continue;
      }
      const py = d.y * TILE + TILE - 2;
      const img = this.add.image(px, py, d.key).setOrigin(0.5, 1).setDepth(py);
      if (d.key.startsWith('tree')) {
        this.tweens.add({
          targets: img,
          scaleX: 1.025,
          yoyo: true,
          repeat: -1,
          duration: 1800 + (hash(d.x, d.y) % 1200),
          ease: 'Sine.InOut',
        });
      }
      if (d.glow) {
        const g = this.add
          .image(px, py - 58, d.glow === 'warm' ? 'glow_warm' : 'glow_cold')
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(0.65)
          .setScale(0.7)
          .setDepth(py + 1);
        this.tweens.add({
          targets: g,
          alpha: 0.4,
          scale: 0.62,
          yoyo: true,
          repeat: -1,
          duration: 900 + (hash(d.x, d.y) % 500),
          ease: 'Sine.InOut',
        });
      }
      if (d.key === 'burner') {
        const smoke = this.add.particles(px, py - 52, 'fx_dot', {
          speedY: { min: -30, max: -14 },
          speedX: { min: -6, max: 6 },
          scale: { start: 0.6, end: 2.2 },
          alpha: { start: 0.35, end: 0 },
          tint: 0xe8e8f0,
          lifespan: 2600,
          frequency: 260,
        });
        smoke.setDepth(py + 2);
      }
    }
  }

  private buildPortals(map: MapDef) {
    for (const p of map.portals) this.addPortal(p);
  }

  private addPortal(p: PortalDef) {
    const [x, y, w, h] = p.rect;
    const cx = (x + w / 2) * TILE;
    const cy = (y + h / 2) * TILE;
    const side = x === 0 ? -1 : x + w >= this.map.width ? 1 : 0;
    const img = this.add.image(cx, cy, 'portal').setBlendMode(Phaser.BlendModes.ADD).setScale(1.1).setDepth(cy);
    this.tweens.add({ targets: img, angle: 360, duration: 3000, repeat: -1 });
    this.add
      .text(cx - side * 40, cy - 70, `${side < 0 ? '◀ ' : side > 0 ? '▶ ' : ''}${p.label}`, {
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#bfefff',
        stroke: '#06223a',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(90000);
    const zone = this.add.zone(cx, cy, w * TILE, h * TILE);
    this.physics.add.existing(zone, true);
    this.physics.add.overlap(this.player, zone, () => this.transition(p));
    return img;
  }

  private buildAmbient(map: MapDef) {
    if (map.ambient === 'petals') {
      const em = this.add.particles(0, 0, 'fx_petal', {
        x: { min: -100, max: 2400 },
        y: -20,
        speedY: { min: 25, max: 60 },
        speedX: { min: -50, max: -5 },
        rotate: { start: 0, end: 360 },
        scale: { min: 0.7, max: 1.4 },
        alpha: 0.9,
        lifespan: 16000,
        frequency: 260,
      });
      em.setScrollFactor(0).setDepth(95000);
      em.fastForward(8000);
    } else if (map.ambient === 'snow' || map.ambient === 'embers') {
      const snow = map.ambient === 'snow';
      const em = this.add.particles(0, 0, 'fx_dot', {
        x: { min: -100, max: 2400 },
        y: snow ? -20 : { min: 0, max: 1400 },
        speedY: snow ? { min: 30, max: 70 } : { min: -60, max: -20 },
        speedX: { min: -25, max: 25 },
        scale: snow ? { min: 0.4, max: 0.9 } : { start: 0.7, end: 0 },
        alpha: snow ? 0.85 : { start: 0.9, end: 0 },
        tint: snow ? 0xffffff : [0xff8a3a, 0xffd36e, 0xff4a12],
        lifespan: snow ? 14000 : 3500,
        frequency: snow ? 90 : 60,
        blendMode: snow ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD,
      });
      em.setScrollFactor(0).setDepth(95000);
      em.fastForward(6000);
    } else {
      const em = this.add.particles(0, 0, 'fx_dot', {
        x: { min: 0, max: map.width * TILE },
        y: { min: 0, max: map.height * TILE },
        speed: { min: 5, max: 22 },
        scale: { min: 0.3, max: 0.7 },
        alpha: { start: 0, end: 0, onUpdate: (_p: unknown, _k: string, t: number) => Math.sin(t * Math.PI) },
        tint: [0xe6ff8a, 0xbfffd0],
        lifespan: 4200,
        frequency: 50,
        blendMode: Phaser.BlendModes.ADD,
      });
      em.setDepth(95000);
      em.fastForward(4000);
    }
  }

  private resolveSpawn(map: MapDef): Vec2 {
    const pos = this.spawnData.pos;
    if (pos) {
      const tx = Math.floor(pos.x / TILE);
      const ty = Math.floor(pos.y / TILE);
      if (map.blocked[ty]?.[tx] === false) return pos;
    }
    const [sx, sy] = this.spawnData.spawn ?? map.playerSpawn;
    return { x: sx * TILE + TILE / 2, y: sy * TILE + TILE / 2 };
  }

  private fitZoom() {
    const h = this.scale.height;
    const w = this.scale.width;
    const zoom = Phaser.Math.Clamp(Math.min(h / 760, w / 1100), 0.7, 1.35);
    this.cameras.main.setZoom(zoom);
  }

  // ---- input & store wiring ---------------------------------------------

  private bindInput() {
    const kb = this.input.keyboard!;
    kb.addCapture('SPACE,TAB');
    const on = (key: string, fn: () => void) => {
      kb.on(`keydown-${key}`, fn);
      this.cleanups.push(() => kb.off(`keydown-${key}`, fn));
    };
    on('J', () => this.player.attack());
    on('SPACE', () => this.player.attack());
    on('ONE', () => this.player.castSkill('bang_tam_tram'));
    on('TWO', () => this.player.castSkill('phi_kiem'));
    on('THREE', () => this.player.castSkill('han_bang_tran'));
    on('SHIFT', () => this.player.dash());
    on('E', () => this.interact());
    on('F', () => this.toggleMeditate());
    on('TAB', () => this.cycleTarget());
    on('Q', () => gameStore.getState().consumeItem('hoi_xuan_dan'));
    on('T', () => gameStore.getState().setAuto(!gameStore.getState().auto));
    on('ESC', () => gameStore.getState().patch({ menu: null, dialogNpc: null }));

    this.cleanups.push(
      EventBus.on('cmd:attack', () => this.player.attack()),
      EventBus.on('cmd:skill', (id: SkillId) => this.player.castSkill(id)),
      EventBus.on('cmd:interact', () => this.interact()),
      EventBus.on('cmd:meditate', () => this.toggleMeditate()),
      EventBus.on('cmd:target', () => this.cycleTarget()),
      EventBus.on('cmd:enterDungeon', (id: string) => this.enterDungeon(id)),
      EventBus.on('cmd:leaveDungeon', () => this.leaveDungeon()),
    );
  }

  private bindStore() {
    const unsub = gameStore.subscribe((s, prev) => {
      if (s.player.level > prev.player.level) {
        this.vfx.ascend(this.player, s.player.realmIndex > prev.player.realmIndex);
      }
    });
    this.cleanups.push(unsub);
  }

  // ---- main loop ---------------------------------------------------------

  update(_time: number, delta: number) {
    const dt = Math.min(delta, 50);
    this.player.update(dt);
    const targetable = this.player.life.status === 'alive' ? this.player.feet : null;
    for (const m of this.monsters) m.update(dt, targetable);
    for (const l of this.loot.getChildren() as LootDrop[]) l.tick(dt, this.player.feet);
    if (this.run && this.map.arena) {
      const alive = this.monsters.reduce((n, m) => n + (m.alive ? 1 : 0), 0);
      for (const ev of tickRun(this.run, DUNGEONS[this.run.id], dt, alive)) this.onRunEvent(ev);
    }

    if (this.target?.alive) {
      this.targetRing.setVisible(true).setPosition(this.target.x, this.target.y - 2);
    } else {
      if (this.target) this.setTarget(null);
      this.targetRing.setVisible(false);
    }

    this.syncTimer += dt;
    if (this.syncTimer >= 100) {
      this.syncTimer = 0;
      this.syncUi();
    }
    this.secondTimer += dt;
    if (this.secondTimer >= 1000) {
      this.secondTimer -= 1000;
      this.perSecond();
    }
    this.saveTimer += dt;
    if (this.saveTimer >= 5000) {
      this.saveTimer = 0;
      this.save();
    }
    this.chatTimer -= dt;
    if (this.chatTimer <= 0) {
      this.chatTimer = 20000 + Math.random() * 25000;
      gameStore.getState().addLog(Phaser.Utils.Array.GetRandom(WORLD_CHAT), 'world');
    }
  }

  private syncUi() {
    const s = gameStore.getState();
    const p = this.player;
    const patch: Partial<typeof s> = {};

    const cds: Partial<Record<SkillId, number>> = {};
    let cdChanged = false;
    for (const id of Object.keys(SKILLS) as SkillId[]) {
      const v = Math.ceil((p.cooldowns[id] ?? 0) / 100) * 100;
      if (v > 0) cds[id] = v;
      if ((s.cooldowns[id] ?? 0) !== (cds[id] ?? 0)) cdChanged = true;
    }
    if (cdChanged) patch.cooldowns = cds;

    if (p.life.status === 'downed') {
      const rem = Math.max(0, Math.ceil(p.life.downedTimer / 100) * 100);
      if (rem !== s.downedRemaining) patch.downedRemaining = rem;
    }

    const t = this.target;
    const info: TargetInfo | null = t?.alive
      ? { name: t.def.name, level: t.def.level, hp: Math.ceil(t.hp), maxHp: t.def.hp }
      : null;
    if (JSON.stringify(info) !== JSON.stringify(s.target)) patch.target = info;

    const tx = Math.floor(p.x / TILE);
    const ty = Math.floor(p.y / TILE);
    if (tx !== s.playerTile.x || ty !== s.playerTile.y) patch.playerTile = { x: tx, y: ty };

    const zone = zoneAt(this.map.zones, tx, ty);
    if (zone?.id !== this.currentZone?.id) {
      this.currentZone = zone;
      patch.zone = zone ? { id: zone.id, name: zone.name, rate: zone.rate } : null;
      if (zone) {
        s.toast(`${zone.name}: linh khí x${zone.rate} khi tọa thiền (F)`, 'info');
        s.questEvent({ type: 'enterZone', zone: zone.id });
      }
    }

    let nearby: string | null = null;
    let best = 95;
    for (const n of this.npcs) {
      const d = Phaser.Math.Distance.Between(n.x, n.y, p.x, p.y);
      if (d < best) {
        best = d;
        nearby = n.npcId;
      }
      n.refreshMarker(s.quests);
    }
    if (nearby !== s.nearbyNpc) patch.nearbyNpc = nearby;
    if (!nearby && s.dialogNpc) patch.dialogNpc = null;

    if (this.run) {
      const def = DUNGEONS[this.run.id];
      const boss = this.monsters.find((m) => m.def.boss && m.alive);
      const hud: DungeonHud = {
        id: this.run.id,
        name: def.name,
        phase: this.run.phase,
        wave: Math.max(0, this.run.wave + 1),
        waves: def.waves.length,
        timeLeft: Math.ceil(this.run.timeLeft / 1000),
        remaining: this.monsters.filter((m) => m.alive).length,
        boss: boss ? { name: boss.def.name, hp: Math.ceil(boss.hp), maxHp: boss.def.hp } : null,
      };
      if (JSON.stringify(hud) !== JSON.stringify(s.dungeon)) patch.dungeon = hud;
    }

    patch.minimap = {
      player: { x: p.x, y: p.y },
      monsters: this.monsters.filter((m) => m.alive).map((m) => ({ x: m.x, y: m.y })),
      npcs: this.npcs.map((n) => ({ x: n.x, y: n.y })),
      loot: (this.loot.getChildren() as LootDrop[]).map((l) => ({ x: l.x, y: l.y })),
    };
    s.patch(patch);
  }

  private perSecond() {
    const s = gameStore.getState();
    const p = this.player;
    if (p.life.status !== 'alive') return;
    const outOfCombat = this.time.now - p.lastDamageAt > 5000;
    s.restore(outOfCombat ? Math.round(s.stats.maxHp * 0.02) : 0, Math.round(s.stats.maxMp * 0.015));
    if (p.meditating) {
      const zone = this.currentZone;
      const gain = meditateGain(s.player.level, zone?.rate ?? null);
      s.addItem('linh_khi', gain.linhKhi, { silent: true });
      s.gainExp(gain.exp, { silent: true });
      s.restore(Math.round(s.stats.maxHp * gain.hpPct), Math.round(s.stats.maxMp * gain.mpPct));
      this.damageText.show(p.x, p.y - 96, `+${gain.linhKhi} Linh Khí  +${gain.exp} EXP`, 'info');
      s.questEvent({ type: 'meditate', zone: zone?.id ?? null, seconds: 1 });
    }
  }

  save() {
    const s = gameStore.getState();
    // a reload never resumes inside a dungeon: progress is kept, the player wakes up where they entered
    const where = this.map.arena
      ? (s.dungeonReturn ?? { mapId: 'dai_thua_vien', pos: null })
      : { mapId: this.map.id, pos: { x: this.player.x, y: this.player.y } };
    saveGame({ player: s.player, quests: s.quests, mapId: where.mapId, pos: where.pos });
  }

  // ---- interactions ------------------------------------------------------

  private interact() {
    const s = gameStore.getState();
    if (s.dialogNpc) {
      s.setDialog(null);
      return;
    }
    const id = s.nearbyNpc;
    if (!id || this.player.life.status !== 'alive') return;
    const npc = this.npcs.find((n) => n.npcId === id);
    if (npc) this.player.faceToward(npc);
    this.player.stopMeditate();
    s.questEvent({ type: 'talk', npc: id });
    s.setDialog(id);
  }

  private toggleMeditate() {
    if (this.player.meditating) this.player.stopMeditate();
    else this.player.startMeditate();
  }

  private transition(p: PortalDef) {
    if (this.player.life.status !== 'alive') return;
    if (this.map.arena) return this.leaveDungeon();
    this.goTo({ mapId: p.to, spawn: p.spawn });
  }

  private goTo(data: WorldData) {
    if (this.transitioning) return;
    this.transitioning = true;
    if (!this.map.arena) this.save();
    gameStore.getState().patch({ dialogNpc: null, menu: null });
    this.cameras.main.fadeOut(350, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.restart(data));
  }

  private enterDungeon(id: string) {
    const def = DUNGEONS[id];
    if (!def || this.transitioning || this.map.arena) return;
    if (this.player.life.status !== 'alive') return;
    const s = gameStore.getState();
    if (!s.beginDungeon(id)) return;
    this.player.stopMeditate();
    s.patch({ dungeonReturn: { mapId: this.map.id, pos: { x: this.player.x, y: this.player.y } } });
    this.goTo({ mapId: def.map });
  }

  private leaveDungeon() {
    if (!this.map.arena || this.transitioning) return;
    const s = gameStore.getState();
    if (this.run && !runOver(this.run)) s.addLog(`Rời khỏi ${DUNGEONS[this.run.id].name} giữa chừng.`);
    const back = s.dungeonReturn ?? { mapId: 'dai_thua_vien', pos: null };
    this.goTo({ mapId: back.mapId, pos: back.pos });
  }

  // ---- dungeon -------------------------------------------------------------

  private onRunEvent(ev: RunEvent) {
    const s = gameStore.getState();
    const arena = this.map.arena!;
    const run = this.run!;
    const def = DUNGEONS[run.id];
    switch (ev.type) {
      case 'spawnWave': {
        s.toast(`Đợt ${ev.wave + 1}/${def.waves.length}`, 'info');
        this.spawnWave(ev.spawns, arena.spawns);
        break;
      }
      case 'spawnBoss': {
        const name = MONSTERS[ev.boss].name;
        s.toast(`Thủ lĩnh ${name} xuất hiện!`, 'warn');
        s.addLog(`Thủ lĩnh ${name} xuất hiện! Né vòng đỏ dưới đất.`, 'combat');
        this.cameras.main.shake(400, 0.008);
        const [bx, by] = arena.boss;
        const boss = this.spawnMonster(ev.boss, bx * TILE + TILE / 2, by * TILE + TILE / 2);
        this.setTarget(boss);
        break;
      }
      case 'cleared': {
        s.finishDungeon(run.id, true, run.elapsed);
        this.vfx.ascend(this.player, true);
        this.cameras.main.flash(400, 255, 230, 160);
        this.openExit();
        break;
      }
      case 'failed': {
        for (const m of this.monsters) m.vanish();
        s.finishDungeon(run.id, false, run.elapsed);
        this.openExit();
        break;
      }
    }
  }

  private spawnWave(spawns: WaveSpawn[], points: [number, number][]) {
    let i = Math.floor(Math.random() * points.length);
    for (const { type, count } of spawns) {
      for (let k = 0; k < count; k++) {
        const [tx, ty] = points[i++ % points.length];
        const jitter = () => (Math.random() - 0.5) * TILE;
        this.spawnMonster(type, tx * TILE + TILE / 2 + jitter(), ty * TILE + TILE / 2 + jitter());
      }
    }
  }

  private spawnMonster(type: string, x: number, y: number) {
    const m = new Monster(this, type, x, y, { arena: true });
    this.monsters.push(m);
    const ring = this.add.image(x, y, 'portal').setBlendMode(Phaser.BlendModes.ADD).setScale(0.2).setDepth(y - 1);
    this.tweens.add({ targets: ring, scale: m.def.boss ? 2.2 : 1, alpha: 0, angle: 180, duration: 700, onComplete: () => ring.destroy() });
    m.setAlpha(0);
    this.tweens.add({ targets: m, alpha: 1, duration: 450 });
    return m;
  }

  private openExit() {
    const [x, y, w, h] = this.map.arena!.exit;
    const img = this.addPortal({ rect: [x, y, w, h], to: '', spawn: [0, 0], label: 'Rời phó bản' });
    img.setScale(0);
    this.tweens.add({ targets: img, scale: 1.1, duration: 500, ease: 'Back.Out' });
  }

  /** Telegraphed area attack around a boss; damage lands after `windup` ms if the player is still inside. */
  bossSlam(m: Monster, radius: number, windup: number, mul: number) {
    const cx = m.x;
    const cy = m.y;
    const zone = this.add.graphics().setDepth(-60);
    zone.fillStyle(0xff3b2f, 0.16).fillEllipse(cx, cy, radius * 2, radius * 1.3);
    zone.lineStyle(3, 0xff5a3a, 0.9).strokeEllipse(cx, cy, radius * 2, radius * 1.3);
    const fill = this.add.graphics().setDepth(-59).setPosition(cx, cy).setScale(0);
    fill.fillStyle(0xff5a3a, 0.35).fillEllipse(0, 0, radius * 2, radius * 1.3);
    this.tweens.add({ targets: fill, scale: 1, duration: windup, ease: 'Sine.In' });
    this.time.delayedCall(windup, () => {
      zone.destroy();
      fill.destroy();
      if (!m.alive) return;
      this.vfx.frostNova({ x: cx, y: cy }, radius);
      impact(this, cx, cy - 20, 0xffb07a, true);
      this.cameras.main.shake(220, 0.012);
      const p = this.player;
      const dx = p.x - cx;
      const dy = (p.y - cy) / 0.65;
      if (p.life.status !== 'alive' || Math.hypot(dx, dy) > radius + 12) return;
      const { stats } = gameStore.getState();
      const r = computeDamage({ atk: m.def.atk, def: stats.def, multiplier: mul, critRate: 0, critMul: 1 });
      p.takeHit(r.amount, true, { x: cx, y: cy });
    });
  }

  summonAdds(m: Monster, type: string, count: number) {
    gameStore.getState().toast(`${m.def.name} triệu hồi thuộc hạ!`, 'warn');
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.random();
      this.spawnMonster(type, m.x + Math.cos(a) * 110, m.y + Math.sin(a) * 70);
    }
  }

  // ---- targeting ---------------------------------------------------------

  setTarget(m: Monster | null) {
    this.target = m;
  }

  cycleTarget() {
    const list = this.monsters
      .filter((m) => m.alive && m.distanceTo(this.player) < 520)
      .sort((a, b) => a.distanceTo(this.player) - b.distanceTo(this.player));
    if (list.length === 0) return this.setTarget(null);
    const idx = this.target ? list.indexOf(this.target) : -1;
    this.setTarget(list[(idx + 1) % list.length]);
  }

  nearestMonster(p: Vec2, range: number): Monster | null {
    let best: Monster | null = null;
    let bd = range;
    for (const m of this.monsters) {
      if (!m.alive) continue;
      const d = m.distanceTo(p);
      if (d < bd) {
        bd = d;
        best = m;
      }
    }
    return best;
  }

  nearestLoot(p: Vec2, range: number): LootDrop | null {
    let best: LootDrop | null = null;
    let bd = range;
    for (const l of this.loot.getChildren() as LootDrop[]) {
      if (!l.ready || l.collected) continue;
      const d = Math.hypot(l.x - p.x, l.y - p.y);
      if (d < bd) {
        bd = d;
        best = l;
      }
    }
    return best;
  }

  // ---- combat ------------------------------------------------------------

  private damageMonster(m: Monster, multiplier: number, slowMs = 0) {
    const { stats } = gameStore.getState();
    const r = computeDamage({
      atk: stats.atk,
      def: m.def.def,
      multiplier,
      critRate: stats.critRate,
      critMul: stats.critMul,
    });
    m.hit(r.amount, r.crit, this.player.feet);
    if (slowMs && m.alive) m.slowTimer = slowMs;
    this.player.lastDamageAt = this.time.now;
    if (!this.target?.alive) this.setTarget(m.alive ? m : null);
    if (r.crit) this.cameras.main.shake(70, 0.003);
  }

  private monstersInArc(range: number, arc: number, from: Vec2 = { x: this.player.x, y: this.player.y - 10 }) {
    const f = this.player.facing;
    return this.monsters.filter((m) => m.alive && inAttackArc(from, f, { x: m.x, y: m.y - 10 }, range, arc, 18));
  }

  playerMeleeHit(combo: number) {
    const sk = playerSkill('basic');
    const p = this.player;
    const f = p.facing;
    this.vfx.swing(p.feet, Math.atan2(f.y, f.x), combo);
    const finisher = combo === 3;
    const hits = this.monstersInArc(sk.range + (finisher ? 16 : 0), finisher ? 80 : sk.arc);
    const finisherMul = sk.active?.finisherMul ?? 1.5;
    for (const m of hits) this.damageMonster(m, sk.multiplier * (finisher ? finisherMul : 1));
  }

  executeSkill(id: SkillId, target: Monster | null) {
    const sk = playerSkill(id);
    const p = this.player;
    const f = p.facing;
    const ang = Math.atan2(f.y, f.x);
    switch (id) {
      case 'bang_tam_tram': {
        this.vfx.crescent(p.feet, ang, sk.range);
        this.time.delayedCall(90, () => {
          for (const m of this.monstersInArc(sk.range, sk.arc)) this.damageMonster(m, sk.multiplier);
        });
        const echo = sk.active?.echo;
        if (echo) {
          this.time.delayedCall(320, () => {
            if (p.life.status !== 'alive') return;
            this.vfx.crescent(p.feet, ang, sk.range * 1.1);
            this.time.delayedCall(90, () => {
              for (const m of this.monstersInArc(sk.range * 1.1, sk.arc)) this.damageMonster(m, sk.multiplier * echo);
            });
          });
        }
        break;
      }
      case 'phi_kiem': {
        if (!target) return;
        const from = { x: p.x, y: p.y };
        const to = { x: target.x, y: target.y };
        this.vfx.flyingSword(from, to, () => {
          const len = Math.hypot(to.x - from.x, to.y - from.y) || 1;
          for (const m of this.monsters) {
            if (!m.alive) continue;
            // distance from the monster to the flight path
            const t = Phaser.Math.Clamp(((m.x - from.x) * (to.x - from.x) + (m.y - from.y) * (to.y - from.y)) / (len * len), 0, 1);
            const d = Math.hypot(from.x + (to.x - from.x) * t - m.x, from.y + (to.y - from.y) * t - m.y);
            if (d < 34 || m === target) this.damageMonster(m, sk.multiplier);
          }
        });
        const extra = sk.active?.extraSwords ?? 0;
        if (extra > 0) {
          const others = this.monsters
            .filter((m) => m.alive && m !== target && m.distanceTo(p) <= sk.range)
            .sort((a, b) => a.distanceTo(p) - b.distanceTo(p))
            .slice(0, extra);
          others.forEach((m, i) => {
            this.time.delayedCall(80 * (i + 1), () => {
              if (!m.alive) return;
              this.vfx.flyingSword({ x: p.x, y: p.y }, { x: m.x, y: m.y }, () => {
                if (m.alive) this.damageMonster(m, sk.multiplier * 0.7);
              });
            });
          });
        }
        break;
      }
      case 'han_bang_tran': {
        this.vfx.frostNova(p.feet, sk.range);
        const slowMs = sk.active?.slowMs ?? 3000;
        for (const m of this.monsters) {
          if (m.alive && m.distanceTo(p) <= sk.range) this.damageMonster(m, sk.multiplier, slowMs);
        }
        break;
      }
      default:
        break;
    }
  }

  monsterHitPlayer(m: Monster) {
    const p = this.player;
    if (!m.alive || p.life.status !== 'alive') return;
    if (m.distanceTo(p) > m.def.attackRange * 1.35) {
      this.damageText.show(p.x, p.y - 70, 'Né tránh', 'info');
      return;
    }
    const { stats } = gameStore.getState();
    const r = computeDamage({ atk: m.def.atk, def: stats.def, multiplier: 1, critRate: 0.08, critMul: 1.6 });
    if (p.takeHit(r.amount, r.crit, { x: m.x, y: m.y })) impact(this, p.x, p.y - 34, 0xff8a7a, r.crit);
  }

  onMonsterKilled(m: Monster) {
    const s = gameStore.getState();
    s.addLog(`Đánh bại ${m.def.name}`, 'combat');
    if (m.def.boss) this.cameras.main.shake(500, 0.012);
    this.damageText.show(m.x, m.y - 86, `+${m.def.exp} EXP`, 'info');
    s.gainExp(m.def.exp);
    s.questEvent({ type: 'kill', target: m.type });
    const drops = rollLoot(m.def.loot);
    drops.forEach((d, i) => {
      const a = (i / Math.max(1, drops.length)) * Math.PI * 2 + Math.random();
      const r = 26 + Math.random() * 22;
      const to = { x: m.x + Math.cos(a) * r, y: m.y + Math.sin(a) * r * 0.6 };
      const drop = new LootDrop(this, d.item, d.qty, { x: m.x, y: m.y - 20 }, to);
      this.loot.add(drop);
    });
    if (this.target === m) this.setTarget(null);
  }

  private collectLoot(drop: LootDrop) {
    if (!drop.ready || drop.collected || this.player.life.status !== 'alive') return;
    drop.collected = true;
    const s = gameStore.getState();
    s.addItem(drop.item, drop.qty, { fromPickup: true });
    const color = Phaser.Display.Color.HexStringToColor(ITEMS[drop.item]?.color ?? '#ffffff').color;
    this.vfx.pickup(drop.x, drop.y, color);
    this.damageText.show(this.player.x, this.player.y - 100, `+${drop.qty} ${itemName(drop.item)}`, 'heal');
    drop.destroy();
  }
}
