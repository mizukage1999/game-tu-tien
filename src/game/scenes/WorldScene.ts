import Phaser from 'phaser';
import { DUNGEONS, ITEMS, MONSTERS, QUESTS, SKILLS, type SkillId, type WaveSpawn } from '../../data';
import { gameStore, itemName, playerSkill, type DungeonHud, type TargetInfo } from '../../store/gameStore';
import { buildIsoGround } from '../art/ground';
import { addGroundTextures, clearGroundTextures, GROUND_PREFIX } from '../art/groundTextures';
import { publishBossSightings } from '../../store/bossHuntStore';
import { buildVillageGround } from '../art/villageGround';
import { VillageAtmosphere } from '../art/VillageAtmosphere';
import { buildWorldGround } from '../art/worldGround';
import { worldTheme } from '../art/worldPalette';
import { publishWorldPreview } from '../art/worldPreview';
import { iso, uniso, isoBounds, isoX, isoY } from '../art/iso';
import { TERRAIN, TILE } from '../art/tiles';
import { EventBus, virtualInput } from '../EventBus';
import { Player } from '../entities/Player';
import { Monster } from '../entities/Monster';
import { Wanderer } from '../entities/Wanderer';
import { Companion } from '../entities/Companion';
import { wandererRoster } from '../systems/wanderers';
import { lifeProgress } from '../systems/life';
import { adventure } from '../systems/adventure';
import { SECT_RETURN_DELAY_MS } from '../systems/respawn';
import { skillLoadout } from '../systems/skills';
import { LootDrop } from '../entities/LootDrop';
import { Npc } from '../entities/Npc';
import { DamageText } from '../fx/DamageText';
import { impact } from '../fx/HitEffect';
import { SkillVfx } from '../fx/SkillVfx';
import { getMap } from '../maps';
import type { MapDef, PortalDef, WorldPoint } from '../maps/MapBuilder';
import { computeDamage, inAttackArc, realmIndexAtLevel } from '../systems/combat';
import { meditateGain, tribulationPlan, zoneAt, type ZoneDef } from '../systems/cultivation';
import { runOver, startRun, tickRun, type DungeonRun, type RunEvent } from '../systems/dungeon';
import { monsterDrops } from '../systems/loot';
import { todayKey } from '../systems/dungeon';
import { resolvePartyRun, type PartyRunTicket } from '../systems/partyDungeon';
import { cancelPartyDungeon, completePartyDungeon, partyDungeonStore } from '../../net/partyDungeon';
import type { SharedAward } from '../systems/contribution';
import { questDestination, routeOnMap, trackedQuest, trackQuest, trackTravel, trackedTravel, type QuestStop } from '../systems/questNav';
import { canEnterField, fieldForLevel, FIELD_BANDS, killExp } from '../systems/scale';
import { realmNameAtLevel } from '../systems/progression';
import { saveGame } from '../systems/save';
import { isTypingTarget } from '../systems/typing';
import { ensureHeroSpell, finishMapAssets, queueMapAssets } from '../art/runtimeAssets';
import { heroFor } from '../../data/heroes';
import { dismissWorldPanel, worldInputBlocked } from '../systems/inputFocus';
import { performanceStore } from '../../store/performanceStore';
import { deferArenaReturn } from '../systems/arenaReturn';
import { RemotePlayer } from '../entities/RemotePlayer';
import { joinWorldChannel, type WorldChannel } from '../../net/worldChannel';
import type { RemotePlayerState } from '../../net/presence';
import { getAccountState } from '../../net/session';
import { socialStore } from '../../store/socialStore';
import type { Vec2 } from '../types';
import { WORLD_PROPS } from '../art/world';
import { sceneryKey } from '../art/cohesion';
import { isChildhood, originText } from '../systems/origin';
import { mapGateReason, portalGateReason } from '../systems/worldAccess';
import { worldZoom } from '../systems/display';
import { routeDots } from '../systems/routeDots';
import { findPath } from '../systems/path';
import { wangEffect } from '../../data/wangSkills';
import { heroSpell, heroSpellHit } from '../../data/heroSkills';
import { SharedWorld } from '../systems/SharedWorld';
import { chatStore } from '../../store/chatStore';
import { signatureHit } from '../systems/skillHit';
import { ritualSkill, ritualControlMs, soulDrain } from '../systems/ritualSkills';
import { gridLineClear } from '../systems/gridNavigation';
import { mouseWalkPath } from '../systems/mouseNavigation';
import { herbNodes, HOME_QUEST, homeMeditateRate, immortalProgress, type HerbNode } from '../systems/immortal';

interface WorldData {
  mapId?: string;
  spawn?: [number, number];
  pos?: Vec2 | null;
  dungeonId?: string;
  partyRun?: PartyRunTicket;
}

const WORLD_CHAT = [
  'Lâm Phong: Có đạo hữu nào lập đội đi Linh Thú Lâm không?',
  'Bạch Vân: Hỏa Hồ có Yêu Đan, đạo hữu nào cùng đi săn?',
  'Hệ thống Tông Môn: Linh Đài đang có linh khí dồi dào, mau đến tọa thiền!',
  'Tiêu Dao: Vừa đột phá Luyện Khí Trung Kỳ, đa tạ sư huynh chỉ điểm!',
  'Mộ Dung Tuyết: Bán Linh Thạch giá hữu nghị...',
  'Thương Hội: Tiền Đa Bảo có Hồi Xuân Đan, chỉ 2 Linh Thạch một viên.',
  'Hàn Lập: Băng Tuyết Động rơi Kiếm Phổ Tàn Trang, nâng kỹ năng lên cấp 5 mạnh hẳn!',
  'Vương Lâm: Cửu Vĩ Hỏa Hồ ở Hỏa Diễm Cốc dậm đất đau quá, nhớ né vòng đỏ.',
];

const hash = (x: number, y: number) => ((x * 73856093) ^ (y * 19349663)) >>> 0;

export class WorldScene extends Phaser.Scene {
  get cooperativeRun() { return this.spawnData.partyRun; }
  partyWaiting = true;
  private partyStarted = false;
  private partyMissingAt = 0;
  private partyEnteredAt = 0;
  shared:SharedWorld|null=null;
  private stopMultiplayer:(()=>void)|null=null;
  map!: MapDef;
  player!: Player;
  monsters: Monster[] = [];
  private wanderers: Wanderer[]=[];
  private companion!: Companion;
  npcs: Npc[] = [];
  loot!: Phaser.Physics.Arcade.Group;
  damageText!: DamageText;
  vfx!: SkillVfx;
  target: Monster | null = null;
  private navRepaths = 0;
  private navLabel = '';
  private routeGuide!: Phaser.GameObjects.Graphics;
  private guideTimer = 0;
  run: DungeonRun | null = null;

  private mapId = 'dai_thua_vien';
  private spawnData: WorldData = {};
  private collision!: Phaser.Tilemaps.TilemapLayer;
  private targetRing!: Phaser.GameObjects.Image;
  private camTarget!: Phaser.GameObjects.Image;
  private currentZone: ZoneDef | null = null;
  private transitioning = false;
  private cleanups: (() => void)[] = [];
  private channel: WorldChannel | null = null;
  remotes = new Map<string, RemotePlayer>();
  private syncTimer = 0;
  private secondTimer = 0;
  private saveTimer = 0;
  private chatTimer = 15000;
  private levelWarned = false;
  private herbs: { node: HerbNode; art: Phaser.GameObjects.Image; label: Phaser.GameObjects.Text }[] = [];
  private foregroundDecor: Phaser.GameObjects.Image[] = [];
  private villageAtmosphere: VillageAtmosphere | null = null;
  private pointLabels: { point: WorldPoint; label: Phaser.GameObjects.Text }[] = [];
  private gardenVisuals: {art:Phaser.GameObjects.Image;label:Phaser.GameObjects.Text}[] = [];
  private pointCooldowns = new Map<string, number>();
  private scenery: { image: Phaser.GameObjects.Image; bounds: Phaser.Geom.Rectangle; tweens: Phaser.Tweens.Tween[] }[] = [];
  private sceneryTimer = 0;
  private cancelArenaReturn: (() => void) | null = null;
  private inArena = false;
  private mouseWalk: { point: Vec2; npc?: Npc } | null = null;
  private worldBuilt = false;
  private mouseMarker: Phaser.GameObjects.Ellipse | null = null;

  constructor() {
    super('World');
  }

  init(data: WorldData) {
    this.partyWaiting = true; this.partyStarted = false; this.partyMissingAt = 0; this.partyEnteredAt = Date.now();
    this.mapId = data.mapId ?? 'dai_thua_vien';
    this.spawnData = data;
    this.monsters = [];
    this.wanderers=[];
    this.npcs = [];
    this.target = null;
    this.run = null;
    this.currentZone = null;
    this.transitioning = false;
    this.cleanups = [];
    this.channel = null;
    this.herbs = [];
    this.foregroundDecor = [];
    this.villageAtmosphere = null;
    this.pointLabels = [];
    this.gardenVisuals = [];
    this.pointCooldowns.clear();
    this.scenery = []; this.sceneryTimer = 0;
    this.syncTimer = this.secondTimer = this.saveTimer = 0;
    this.guideTimer = 0;
    this.levelWarned = false;
    this.remotes.clear();
    this.mouseWalk = null;
    this.worldBuilt = false;
    publishBossSightings({ mapId: '', sightings: [] });
    this.mouseMarker = null;
  }

  preload() {
    const queued = queueMapAssets(this, this.mapId);
    this.game.events.emit('assets-loading', { mapId: this.mapId, mapName: getMap(this.mapId).name });
    if (!queued) return;
    const progress = (value: number) => this.game.events.emit('assets-progress', value * 0.9);
    this.load.on(Phaser.Loader.Events.PROGRESS, progress);
    this.load.once(Phaser.Loader.Events.COMPLETE, () => this.load.off(Phaser.Loader.Events.PROGRESS, progress));
  }

  create() {
    try { this.createWorld(); }
    catch (error) {
      console.error('[game] world creation failed', error);
      this.game.events.emit('assets-error');
    }
  }

  private createWorld() {
    finishMapAssets(this);
    const map = (this.map = getMap(this.mapId));
    const state = gameStore.getState();
    if(state.player.hp<=0||state.status==='downed'){
      const refuge=isChildhood(state.player)?'vuong_gia_thon':adventure(state.player).boundSect;
      state.restore(state.stats.maxHp,state.stats.maxMp);state.patch({status:'alive',downedRemaining:0,tribulation:null});
      if(map.id!==refuge){this.scene.restart({mapId:refuge});return;}
    }
    const denied = mapGateReason(map, { childhood: isChildhood(state.player), quests: state.quests, reputation: adventure(state.player).reputation });
    if (denied) {
      state.toast(denied, 'warn');
      this.cancelQuestNav();
      this.scene.restart({ mapId: isChildhood(state.player) ? 'vuong_gia_thon' : 'rung_linh_thu' });
      return;
    }
    if (map.private && gameStore.getState().quests[HOME_QUEST]?.status !== 'done') {
      this.scene.restart({ mapId: 'dai_thua_vien' });
      return;
    }
    if (map.level) {
      const level = gameStore.getState().player.level;
      const check = canEnterField(level, map.level);
      if (!check.ok) {
        gameStore.getState().toast(check.reason, 'warn');
        this.scene.restart({ mapId: 'dai_thua_vien' });
        return;
      }
    }
    this.damageText = new DamageText(this);
    this.vfx = new SkillVfx(this);
    const W = map.width * TILE;
    const H = map.height * TILE;
    this.physics.world.setBounds(0, 0, W, H);

    this.buildTerrain(map);
    this.buildDecor(map);
    this.scenery = (this.children.list.filter(child => child.type === 'Image' && !(child as Phaser.GameObjects.Image).texture.key.startsWith(GROUND_PREFIX)) as Phaser.GameObjects.Image[])
      .filter(image => image.visible).map(image => ({ image, bounds: image.getBounds(), tweens: this.tweens.getTweensOf(image) }));
    publishWorldPreview(this, map);

    for (const n of map.npcs) {
      this.npcs.push(new Npc(this, n.id, n.x * TILE + TILE / 2, n.y * TILE + TILE - 6));
      this.collision.putTileAt(0, n.x, n.y);
    }
    for (const m of map.monsters) {
      this.monsters.push(new Monster(this, m.type, m.x * TILE + TILE / 2, m.y * TILE + TILE / 2));
    }

    const start = this.resolveSpawn(map);
    this.player = new Player(this, start.x, start.y);
    this.companion=new Companion(this);
    for(const person of wandererRoster(map,[...map.id].reduce((s,c)=>s+c.charCodeAt(0)*31,0))){
      let tile:{x:number;y:number}|null=null;
      for(let tries=0;tries<100;tries++){const x=2+Math.floor(Math.random()*(map.width-4)),y=2+Math.floor(Math.random()*(map.height-4));if(!map.blocked[y][x]&&Math.hypot(x-start.x/TILE,y-start.y/TILE)>4){tile={x,y};break;}}
      if(tile){const npc=new Wanderer(this,{x:(tile.x+.5)*TILE,y:(tile.y+.5)*TILE},person.name,person.cultivation,person.art);this.wanderers.push(npc);this.monsters.push(npc);}
    }
    const onWandererTalk=(name:string)=>gameStore.getState().toast(`${name}: Sơn hà rộng lớn, đạo hữu hãy cẩn thận trên đường.`, 'info');
    this.game.events.on('wanderer-talk',onWandererTalk);
    this.cleanups.push(()=>this.game.events.off('wanderer-talk',onWandererTalk));
    this.routeGuide = this.add.graphics().setDepth(-7000);
    this.buildHerbs();
    this.buildWorldPoints();
    if(map.private) for(let i=0;i<5;i++) {
      const at=iso((7+i*2)*TILE+TILE/2,12*TILE+TILE/2);
      const art=this.add.image(at.x,at.y-7,'immortal-thanh_linh_thao').setDisplaySize(70,44).setDepth(at.y+1).setVisible(false);
      const label=this.add.text(at.x,at.y+18,'',{fontSize:'9px',color:'#b9dfb0',stroke:'#1e3826',strokeThickness:2,resolution:2}).setOrigin(.5).setDepth(at.y+2);
      this.gardenVisuals.push({art,label});
    }
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
    const view = isoBounds();
    cam.setBounds(0, 0, view.width, view.height);
    // The camera follows a proxy: the player's physics body lives in map space,
    // the diamond it stands on lives on screen.
    this.camTarget = this.add.image(start.x, start.y, 'fx_dot').setVisible(false).setDepth(-10001);
    // Frame the village slightly ahead of the hero so roofs and the road ahead
    // remain visible above the mobile controls.
    cam.startFollow(this.camTarget, false, 0.12, 0.12, 0, map.id === 'vuong_gia_thon' ? 72 : 0);
    cam.setRoundPixels(false);
    this.fitZoom();
    if (map.id === 'vuong_gia_thon' && this.textures.exists('village-dawn-v3')) this.villageAtmosphere = new VillageAtmosphere(this);
    else if (this.textures.exists('world-vistas-v4')) {
      const theme = worldTheme(map);
      this.villageAtmosphere = new VillageAtmosphere(this, 'world-vistas-v4', theme === 'ice' ? 'sect' : theme);
    }
    this.scale.on(Phaser.Scale.Events.RESIZE, this.fitZoom, this);
    this.cleanups.push(() => this.scale.off(Phaser.Scale.Events.RESIZE, this.fitZoom, this));
    cam.fadeIn(400);
    if (this.game.renderer.type === Phaser.WEBGL && !this.game.config.disablePostFX && performanceStore.getState().tier === 0) {
      cam.postFX.addVignette(0.5, 0.5, 0.92, map.ambient === 'fireflies' ? 0.42 : 0.28);
    }
    this.buildAmbient(map);
    const emitters = this.children.list.filter(child => child.type === 'ParticleEmitter') as Phaser.GameObjects.Particles.ParticleEmitter[];
    const frequencies = emitters.map(emitter => emitter.frequency);
    const applyBudget = () => {
      const tier = performanceStore.getState().tier;
      emitters.forEach((emitter, i) => { if (frequencies[i] > 0) emitter.setFrequency(frequencies[i] * [1, 2.5, 5][tier]); });
      if (tier > 0) cam.postFX?.clear();
      this.sceneryTimer = 0;
    };
    applyBudget();
    this.cleanups.push(performanceStore.subscribe(applyBudget));

    this.bindInput();
    this.bindStore();

    const s = gameStore.getState();
    const progress = s.player.world ?? { interactions: {}, discovered: [] };
    s.patch({ mapId: map.id, zone: null, target: null, nearbyNpc: null, nearbyHerb: null, nearbyPoint: null, meditating: false, spawnPos: null, dungeon: null, dungeonResult: null,
      player: { ...s.player, world: { ...progress, discovered: [...new Set([...progress.discovered, map.id])] } },
    });
    s.addLog(`Tiến vào ${map.name}`);
    s.toast(map.name, 'info');
    s.questEvent({ type: 'enterZone', zone: map.id });
    if (map.arena) {
      const dungeonId = this.spawnData.dungeonId ?? map.arena.dungeon;
      const def = DUNGEONS[dungeonId];
      this.run = startRun(dungeonId, def);
      s.addLog(`Tiêu diệt ${def.waves.length} đợt quái và thủ lĩnh trước khi hết giờ!`);
    } else {
      if (s.dungeonReturn) s.patch({ dungeonReturn: null });
      if (!isChildhood(s.player) && (!s.quests.main_0 || s.quests.main_0.status === 'active')) {
        s.addLog('Hãy đến gặp Vân Hạc Trưởng Lão ở phía bắc (phím E để trò chuyện).');
      }
      if (trackedTravel()) this.guideTravel();
      else if (trackedQuest()) this.guideQuest();
    }
    this.save();
    this.startMultiplayer(map);
    this.game.events.emit('assets-progress', 1);
    this.worldBuilt = true;
    this.game.events.emit('assets-ready');

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.cancelArenaReturn?.();
      this.cancelArenaReturn = null;
      this.inArena = false;
      this.cleanups.forEach((fn) => fn());
      this.cleanups = [];
    });
  }

  // ---- construction ------------------------------------------------------

  private buildTerrain(map: MapDef) {
    clearGroundTextures(this);
    const data = map.terrain.map((row, y) =>
      row.map((t, x) => TERRAIN[t].base + (hash(x, y) % TERRAIN[t].variants)),
    );
    // The visible ground is one pre-baked isometric canvas; the grid below stays
    // flat and invisible so collision, path-finding and AI never meet the
    // projection at all.
    const ground = this.textures.exists('world-materials-v4')
      ? buildWorldGround(map, this.textures.get('world-materials-v4').getSourceImage() as HTMLImageElement)
      : map.id === 'vuong_gia_thon' && this.textures.exists('village-materials-v3')
      ? buildVillageGround(map, this.textures.get('village-materials-v3').getSourceImage() as HTMLImageElement)
      : buildIsoGround(map);
    addGroundTextures(this, ground.canvas);

    const tm = this.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });
    const tileset = tm.addTilesetImage('tiles', 'tiles', TILE, TILE, 0, 0)!;
    this.collision = tm.createBlankLayer('collision', tileset)!;
    map.blocked.forEach((row, y) =>
      row.forEach((b, x) => {
        if (b) this.collision.putTileAt(0, x, y);
      }),
    );
    this.collision.setCollision(0).setVisible(false);
  }

  private buildDecor(map: MapDef) {
    for (const landmark of map.landmarks ?? []) {
      // The village name is already in the minimap; large ground captions
      // overlap the family and the first quest route on narrow screens.
      if (map.id === 'vuong_gia_thon') continue;
      const at = iso(landmark.x * TILE + TILE / 2, landmark.y * TILE + TILE / 2);
      this.add.text(at.x, at.y, originText(landmark.name,gameStore.getState().player), {
        fontFamily: 'Georgia, serif', fontSize: '15px', letterSpacing: 3,
        color: '#e1d3ab', stroke: '#263c3b', strokeThickness: 3, resolution: 2,
      }).setOrigin(.5).setAlpha(.8).setDepth(-8000);
    }
    for (const d of map.decor) {
      const anchor = iso(d.x * TILE + TILE / 2, d.y * TILE + TILE - 2);
      const px = anchor.x;
      if (d.key === 'circle') {
        const zone = map.zones[0];
        const w = zone ? zone.rect[2] * TILE : 320;
        const h = zone ? zone.rect[3] * TILE : 200;
        const cy = iso(d.x * TILE + TILE / 2, d.y * TILE + TILE / 2).y;
        const outer = this.add
          .image(px, cy, 'circle')
          .setScale((w * 0.8) / 320, (h * 0.4) / 320)
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
      const py = anchor.y;
      const artKey = sceneryKey(d.key, map.id === 'vuong_gia_thon', map.ambient, map.id);
      const prop = WORLD_PROPS[artKey];
      const hasAtlas = prop && this.textures.exists(prop.atlas);
      const img = this.add.image(px, py, hasAtlas ? prop.atlas : prop?.fallback ?? d.key, hasAtlas ? artKey : undefined)
        .setOrigin(hasAtlas ? prop.originX ?? .5 : .5, hasAtlas ? prop.originY : 1).setDepth(prop?.ground ? -8500 : py).setFlipX(d.flipX ?? false);
      if (hasAtlas) img.setScale(prop.height / img.height * (d.scale ?? 1));
      if (prop?.tint) img.setTint(prop.tint);
      if (d.fade || prop?.fade) this.foregroundDecor.push(img);
      if (d.key.startsWith('tree') || ['world-tree', 'sect-cherry', 'village-willow', 'village25d-willow', 'village25d-peach'].includes(d.key)) {
        this.tweens.add({
          targets: img,
          scaleX: img.scaleX * 1.025,
          yoyo: true,
          repeat: -1,
          duration: 1800 + (hash(d.x, d.y) % 1200),
          ease: 'Sine.InOut',
        });
      }
      if (d.glow) {
        const g = this.add
          .image(px, py - (prop?.glowY ?? 82), d.glow === 'warm' ? 'glow_warm' : 'glow_cold')
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(prop ? .35 : .7)
          .setScale(prop ? .55 : .85)
          .setDepth(py + 1);
        this.tweens.add({
          targets: g,
          alpha: prop ? .2 : .44,
          scale: prop ? .48 : .74,
          yoyo: true,
          repeat: -1,
          duration: 900 + (hash(d.x, d.y) % 500),
          ease: 'Sine.InOut',
        });
      }
      if (d.key === 'burner' || d.key === 'court-burner') {
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
      if (d.key === 'world-waterfall') {
        this.add.particles(px, py - 80, 'fx_dot', { x: { min: -36, max: 36 }, speedY: { min: 20, max: 60 }, speedX: { min: -20, max: 20 }, tint: [0xbfefff, 0xffffff], alpha: { start: .4, end: 0 }, scale: { start: .5, end: 1.6 }, lifespan: 1400, frequency: 100 }).setDepth(py + 1);
      }
    }
  }

  private buildPortals(map: MapDef) {
    for (const p of map.portals) this.addPortal(p);
  }

  private addPortal(p: PortalDef) {
    const [x, y, w, h] = p.rect;
    const centre = iso((x + w / 2) * TILE, (y + h / 2) * TILE);
    const cx = centre.x;
    const cy = centre.y;
    const side = x === 0 ? -1 : x + w >= this.map.width ? 1 : 0;
    const band = p.levelBand ? fieldForLevel(gameStore.getState().player.level) : null;
    const label = band ? `${band.name} · ${realmNameAtLevel(band.minLevel)}` : p.label;
    const img = this.add.image(cx, cy, 'portal').setBlendMode(Phaser.BlendModes.ADD).setScale(1.1).setDepth(cy);
    this.tweens.add({ targets: img, angle: 360, duration: 3000, repeat: -1 });
    this.add
      .text(cx - side * 40, cy - 70, `${side < 0 ? '◀ ' : side > 0 ? '▶ ' : ''}${label}`, {
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#bfefff',
        stroke: '#06223a',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(90000);
    // The collider uses map coordinates, like the hidden player physics body.
    const zone = this.add.zone((x + w / 2) * TILE, (y + h / 2) * TILE, w * TILE, h * TILE);
    this.physics.add.existing(zone, true);
    this.physics.add.overlap(this.player, zone, () => this.transition(p));
    return img;
  }

  private buildAmbient(map: MapDef) {
    if (map.ambient === 'petals') {
      const em = this.add.particles(0, 0, 'fx_petal', {
        x: { min: -100, max: isoBounds().width },
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
        x: { min: -100, max: isoBounds().width },
        y: snow ? -20 : { min: 0, max: isoBounds().height },
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
        x: { min: 0, max: isoBounds().width },
        y: { min: 0, max: isoBounds().height },
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
    this.registry.set('phone-layout', window.matchMedia('(pointer: coarse), (hover: none) and (max-width: 900px)').matches);
    const density = (this.registry.get('render-density') as number | undefined) ?? 1;
    this.cameras.main.setZoom(worldZoom(this.scale.width / density, this.scale.height / density) * density);
    this.villageAtmosphere?.fit();
  }

  private setArenaPaused(pause: boolean) {
    this.cancelArenaReturn?.();
    this.cancelArenaReturn = null;
    this.input.keyboard?.resetKeys();
    virtualInput.x = 0;
    virtualInput.y = 0;
    if (pause) {
      this.inArena = true;
      this.player.clearRoute();
      this.player.setVelocity(0, 0);
      this.stopMultiplayer?.();
      this.scene.setVisible(false);
      this.scene.pause();
    } else if (this.inArena) {
      this.cancelArenaReturn = deferArenaReturn(() => {
        this.cancelArenaReturn = null;
        if (!this.inArena || socialStore.getState().duel || !this.sys.isPaused()) return;
        this.inArena = false;
        // Clear the duel's held pointer and timing history, including long mobile
        // background gaps. No game state, texture atlas or scene is rebuilt here.
        for (const pointer of this.input.manager.pointers) pointer.reset();
        this.game.loop.resetDelta();
        this.fitZoom();
        this.scene.setVisible(true);
        this.scene.resume();
        this.startMultiplayer(this.map);
      });
    }
  }

  private buildHerbs() {
    for (const node of herbNodes(this.mapId)) {
      if (this.map.blocked[node.y]?.[node.x]) continue;
      const at = iso(node.x * TILE + TILE / 2, node.y * TILE + TILE / 2);
      const village = this.mapId === 'vuong_gia_thon';
      const painted = village && this.textures.exists('village-nature-v3') && this.textures.get('village-nature-v3').has('village25d-herbs');
      const art = this.add.image(at.x, at.y - (painted ? 0 : 8), painted ? 'village-nature-v3' : `immortal-${node.item}`, painted ? 'village25d-herbs' : undefined)
        .setDisplaySize(village ? 78 : 160, village ? 58 : 100).setDepth(at.y + 1);
      if (painted) art.setOrigin(.5, .88);
      const label = this.add.text(at.x, at.y + 12, itemName(node.item), {
        fontFamily: 'Segoe UI, sans-serif', fontSize: village ? '12px' : '13px', color: '#c6f1cf', stroke: '#102b25', strokeThickness: 3, resolution: 2,
      }).setOrigin(0.5).setDepth(at.y + 2);
      art.setInteractive({ useHandCursor: true, hitArea: painted ? new Phaser.Geom.Rectangle(0, 0, art.width, art.height) : new Phaser.Geom.Rectangle(100, 45, 120, 130), hitAreaCallback: Phaser.Geom.Rectangle.Contains });
      art.on('pointerdown', () => this.harvest(node));
      this.herbs.push({ node, art, label });
    }
  }

  private harvest(node: HerbNode) {
    if (this.transitioning || this.player.life.status !== 'alive') return;
    const s = gameStore.getState();
    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, node.x * TILE + TILE / 2, node.y * TILE + TILE / 2);
    if (distance > 110) return s.toast('Đến gần dược liệu rồi chạm để hái (hoặc nhấn E).', 'info');
    if (this.time.now - this.player.lastDamageAt < 3000) return s.toast('Hãy thoát chiến trước khi hái dược.', 'warn');
    if (s.harvestHerb(node)) this.save();
  }

  private buildWorldPoints() {
    for (const point of this.map.points ?? []) {
      const at = iso(point.x * TILE + TILE / 2, point.y * TILE + TILE / 2);
      this.add.ellipse(at.x, at.y, 28, 12, 0xe6cf85, .18).setStrokeStyle(1, 0xe6cf85, .65).setDepth(at.y - 1);
      const label = this.add.text(at.x, at.y + 14, point.name, { fontFamily: 'Segoe UI', fontSize: '12px', color: '#f1ddb0', stroke: '#26352e', strokeThickness: 3, resolution: 2 }).setOrigin(.5).setDepth(at.y + 2);
      this.pointLabels.push({ point, label });
      this.add.zone(at.x, at.y - 15, 86, 68).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.interactPoint(point));
    }
  }

  private interactPoint(point: WorldPoint) {
    const s = gameStore.getState();
    if (this.transitioning || s.status !== 'alive') return;
    if (Math.hypot(this.player.x - point.x * TILE - TILE / 2, this.player.y - point.y * TILE - TILE / 2) > 110) return s.toast('Đến gần rồi nhấn E hoặc chạm để tương tác.', 'info');
    if(point.id.startsWith('home_')){s.patch({menu:'journey',journeySection:'home',homeSection:point.id==='home_array'?'chamber':point.id==='home_furnace'?'furnace':point.id==='home_chamber'?'chamber':'field'});return;}
    if (this.time.now - (this.pointCooldowns.get(point.id) ?? -10000) < 900) return;
    this.pointCooldowns.set(point.id, this.time.now);
    const progress = s.player.world ?? { interactions: {}, discovered: [] };
    const count = progress.interactions[point.id] ?? 0;
    if (!count || point.repeatable) {
      s.patch({ player: { ...s.player, world: { ...progress, interactions: { ...progress.interactions, [point.id]: count + 1 } } } });
      s.questEvent({ type: 'interact', point: point.id });
    }
    s.addLog(originText(point.text,s.player)); s.toast(originText(point.text,s.player), 'quest');
    this.save();
  }

  // ---- other players -----------------------------------------------------

  /**
   * Public maps share one channel; a party dungeon joins only its private room.
   * Solo dungeons and offline play skip multiplayer.
   */
  private startMultiplayer(map: MapDef) {
    if(this.channel)return;
    if ((map.arena || map.private) && !this.cooperativeRun) return;
    const user = getAccountState().user;
    if (!user) return;
    const p = gameStore.getState().player;
    const channel = joinWorldChannel({
      mapId: map.id,
      userId: user.id,
      name: p.name,
      sex: p.sex ?? 'female',
      heroId: p.heroId,
      realm: realmNameAtLevel(p.level),
      party: socialStore.getState().partyId,
      ...(this.cooperativeRun ? { room: { id: this.cooperativeRun.id, leader: this.cooperativeRun.leader, members: this.cooperativeRun.members.map(m => m.userId) } } : {}),
      pose: this.player.networkPose(),
    });
    if (!channel) return;
    this.channel = channel;
    this.shared=new SharedWorld(this,channel);
    const stop = channel.onRoster((roster) => this.syncRoster(roster));
    // Re-advertise the party so teammates still tint green after a map change.
    const stopParty = socialStore.subscribe((s, prev) => {
      if (s.partyId !== prev.partyId) channel.setParty(s.partyId);
    });
    const shared=this.shared;
    const leave=()=>{
      stop();stopParty();shared?.destroy();
      if(this.channel===channel){this.channel=null;this.shared=null;for(const remote of this.remotes.values())remote.destroy();this.remotes.clear();}
      gameStore.getState().patch({ online: 0 });
      void channel.leave();
      if(this.stopMultiplayer===leave)this.stopMultiplayer=null;
    };
    this.stopMultiplayer=leave;this.cleanups.push(()=>{if(this.stopMultiplayer===leave)leave();});
  }

  private syncRoster(roster: RemotePlayerState[]) {
    if(this.shared)this.shared.roster=roster;
    // The HUD only needs the count, and this runs on every movement packet.
    if (gameStore.getState().online !== roster.length) gameStore.getState().patch({ online: roster.length });
    const seen = new Set<string>();
    for (const meta of roster) {
      void ensureHeroSpell(this, heroFor(meta).id);
      seen.add(meta.key);
      const existing = this.remotes.get(meta.key);
      if (existing) existing.apply(meta);
      else this.remotes.set(meta.key, new RemotePlayer(this, meta));
    }
    for (const [key, remote] of this.remotes) {
      if (seen.has(key)) continue;
      remote.destroy();
      this.remotes.delete(key);
    }
  }

  private tickMultiplayer(dt: number) {
    const channel = this.channel;
    if (!channel) return;
    channel.publish(this.player.networkPose());
    this.shared?.tick(dt);
    for (const remote of this.remotes.values()) remote.update(dt);
  }

  /**
   * Focus in a text field must win over every game binding, including movement:
   * otherwise typing a name keeps walking and fires J/1/2/3/E/F/Q/T hotkeys.
   */
  private releaseKeysWhileTyping() {
    const kb = this.input.keyboard;
    if (!kb) return;
    const sync = (target: EventTarget | null) => {
      const blocked = isTypingTarget(target) || worldInputBlocked();
      if (blocked === !kb.enabled) return;
      kb.enabled = !blocked;
      kb.resetKeys();
    };
    const onFocusIn = (e: FocusEvent) => sync(e.target);
    const onFocusOut = () => setTimeout(() => sync(document.activeElement), 0);
    // Focusing on its own is not enough: inputs can already be focused when a key
    // arrives (programmatic focus, autofocus, React keeping focus across renders),
    // so the keystroke itself re-checks and heals the state. Capture phase, because
    // Phaser's own listener runs on window and must see the settled value.
    const onKeyDown = (e: KeyboardEvent) => sync(e.target);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    window.addEventListener('keydown', onKeyDown, true);
    this.cleanups.push(() => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      window.removeEventListener('keydown', onKeyDown, true);
    });
  }

  // ---- input & store wiring ---------------------------------------------

  private bindInput() {
    const kb = this.input.keyboard!;
    // Capturing keys here would eat them for every text field on the page (TAB is
    // also the only way to move between inputs), so leave the browser in charge.
    this.releaseKeysWhileTyping();
    this.bindMouseMovement();
    const on = (key: string, fn: () => void) => {
      kb.on(`keydown-${key}`, fn);
      this.cleanups.push(() => kb.off(`keydown-${key}`, fn));
    };
    on('J', () => this.player.attack());
    on('SPACE', () => this.player.attack());
    on('ONE', () => this.player.castSkill(skillLoadout(gameStore.getState().player)[0]));
    on('TWO', () => this.player.castSkill(skillLoadout(gameStore.getState().player)[1]));
    on('THREE', () => this.player.castSkill(skillLoadout(gameStore.getState().player)[2]));
    on('FOUR', () => this.player.castSkill(skillLoadout(gameStore.getState().player)[3]));
    on('FIVE', () => this.player.castSkill(skillLoadout(gameStore.getState().player)[4]));
    on('SIX', () => this.player.castSkill(skillLoadout(gameStore.getState().player)[5]));
    on('SEVEN', () => this.player.castSkill(skillLoadout(gameStore.getState().player)[6]));
    on('SHIFT', () => this.player.dash());
    on('E', () => this.interact());
    on('F', () => this.toggleMeditate());
    on('TAB', () => this.cycleTarget());
    on('Q', () => gameStore.getState().consumeItem('hoi_xuan_dan'));
    on('T', () => gameStore.getState().setAuto(!gameStore.getState().auto));
    on('ESC', () => gameStore.getState().patch({ menu: null, dialogNpc: null }));

    // SPACE would otherwise scroll/activate a focused button while playing.
    const swallowGameKeys = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.code === 'Space') e.preventDefault();
    };
    window.addEventListener('keydown', swallowGameKeys);
    this.cleanups.push(() => window.removeEventListener('keydown', swallowGameKeys));

    this.cleanups.push(
      EventBus.on('cmd:attack', () => { if (!worldInputBlocked()) this.player.attack(); }),
      EventBus.on('cmd:save', () => this.save()),
      EventBus.on('cmd:adminBossReset', ({map,monster}) => {
        if(map!==this.map.id || this.map.arena || (this.shared&&!this.shared.authority))return;
        this.monsters.filter(m=>m.type===monster&&m.def.boss).forEach(m=>m.adminReset());
      }),
      EventBus.on('cmd:skill', (id: SkillId) => { if (!worldInputBlocked()) this.player.castSkill(id); }),
      EventBus.on('cmd:nearChat',text=>{
        if(this.shared)this.shared.chat(text);
        else {const p=gameStore.getState().player;chatStore.getState().add({id:crypto.randomUUID(),kind:'near',from:getAccountState().user?.id??'me',name:p.name,text,at:Date.now()});gameStore.getState().addLog(`${p.name}: ${text}`,'near');this.showSpeech(text);}
      }),
      EventBus.on('chat:whisper',({from,text})=>{for(const remote of this.remotes.values())if(remote.userId===from)remote.speech(text,true);}),
      EventBus.on('cmd:interact', () => this.interact()),
      EventBus.on('cmd:meditate', () => this.toggleMeditate()),
      EventBus.on('cmd:target', () => this.cycleTarget()),
      EventBus.on('cmd:enterDungeon', (id: string) => this.enterDungeon(id)),
      EventBus.on('cmd:enterPartyDungeon', ticket => this.enterPartyDungeon(ticket)),
      EventBus.on('cmd:abortPartyDungeon', id => { if (this.cooperativeRun?.id === id) this.abortPartyDungeon(); }),
      EventBus.on('cmd:leaveDungeon', () => this.leaveDungeon()),
      EventBus.on('cmd:questGo', (id: string) => this.onQuestGo(id)),
      EventBus.on('cmd:home', () => this.visitHome()),
      EventBus.on('cmd:travel', (id: string) => this.travelTo(id)),
      EventBus.on('cmd:duelPause', (pause) => this.setArenaPaused(pause)),
      EventBus.on('cmd:mapWalk',(tile:{x:number;y:number})=>{
        const s=gameStore.getState();if(s.status!=='alive'||s.tribulation||lifeProgress(s.player).retreat)return;
        const path=findPath(this.map.blocked,Math.floor(this.player.x/TILE),Math.floor(this.player.y/TILE),tile.x,tile.y,0);
        if(!path.reached)return s.toast('Không tìm thấy đường tới vị trí này.','warn');
        this.cancelQuestNav();s.setAuto(false);s.setMenu(null);this.player.setRoute(path.tiles.map(t=>({x:(t.x+.5)*TILE,y:(t.y+.5)*TILE})));
      }),
    );
  }

  private bindMouseMovement() {
    const marker = this.add.ellipse(0, 0, 32, 16, 0xe8c075, .12).setStrokeStyle(2, 0xf3d28c).setDepth(90020).setVisible(false);
    this.mouseMarker = marker;
    const click = (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (pointer.wasTouch || !pointer.leftButtonDown() || worldInputBlocked() || isTypingTarget(document.activeElement) || this.transitioning) return;
      const s = gameStore.getState();
      if (s.status !== 'alive' || lifeProgress(s.player).retreat) return;
      this.cancelQuestNav(); s.setAuto(false); this.player.setVelocity(0, 0);
      if (over.length) return;
      const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      // NPCs and monsters are painted sprites in screen space, unlike their
      // physics bodies. Test their drawn bounds before treating the tap as ground.
      const npc = [...this.npcs].sort((a, b) => b.depth - a.depth).find(n => this.paintedMouseHit(n, point));
      const monster = [...this.monsters].filter(m => m.alive).sort((a, b) => b.art.depth - a.art.depth).find(m => this.paintedMouseHit(m.art, point));
      if (npc && (!monster || npc.depth >= monster.art.depth)) {
        this.cancelQuestNav(); s.setAuto(false);
        if (Math.hypot(this.player.x - npc.map.x, this.player.y - npc.map.y) <= 100) this.talkToMouseNpc(npc);
        else this.startMouseWalk(npc.map, npc);
      } else if (monster) {
        this.cancelQuestNav(); s.setAuto(false);
        this.player.setVelocity(0, 0);
        this.setTarget(monster); this.player.faceToward(monster);
      } else {
        this.startMouseWalk(uniso(point.x, point.y));
      }
    };
    this.input.on(Phaser.Input.Events.POINTER_DOWN, click);
    this.cleanups.push(() => this.input.off(Phaser.Input.Events.POINTER_DOWN, click));
  }

  private paintedMouseHit(sprite: Phaser.GameObjects.Sprite, point: Vec2) {
    if (!sprite.visible || !sprite.getBounds().contains(point.x, point.y)) return false;
    const local = sprite.getWorldTransformMatrix().applyInverse(point.x, point.y);
    let x = local.x + sprite.displayOriginX, y = local.y + sprite.displayOriginY;
    if (sprite.flipX) x = sprite.width - 1 - x;
    if (sprite.flipY) y = sprite.height - 1 - y;
    const alpha = this.textures.getPixelAlpha(Math.floor(x), Math.floor(y), sprite.texture.key, sprite.frame.name);
    return alpha === null || alpha >= 64;
  }

  private startMouseWalk(point: Vec2, npc?: Npc) {
    this.cancelQuestNav();
    gameStore.getState().setAuto(false);
    const route = mouseWalkPath(this.map.blocked, TILE, this.player.feet, point);
    if (!route) { gameStore.getState().toast('Không tìm được đường tới vị trí này.', 'info'); return; }
    this.mouseWalk = { point, npc };
    this.player.setRoute(route.points);
    const spot = iso(route.target.x, route.target.y), marker = this.mouseMarker!;
    this.tweens.killTweensOf(marker);
    marker.setPosition(spot.x, spot.y).setScale(1).setAlpha(1).setVisible(true);
    this.tweens.add({ targets: marker, alpha: 0, scale: 1.6, duration: 650, onComplete: () => marker.setVisible(false) });
  }

  private talkToMouseNpc(npc: Npc) {
    if (worldInputBlocked() || Math.hypot(this.player.x - npc.map.x, this.player.y - npc.map.y) > 130) return;
    this.player.stopMeditate(); this.player.faceToward(npc.map);
    const s = gameStore.getState();
    s.questEvent({ type: 'talk', npc: npc.npcId });
    s.setDialog(npc.npcId);
  }

  private bindStore() {
    let rewardPaused = false;
    this.cleanups.push(gameStore.subscribe((s) => {
      if (s.rewardPending && this.sys.isActive()) {
        rewardPaused = true;
        this.player.clearRoute();
        this.player.setVelocity(0, 0);
        this.scene.pause();
      } else if (!s.rewardPending && rewardPaused) {
        rewardPaused = false;
        this.game.loop.resetDelta();
        this.scene.resume();
      }
    }));
    window.addEventListener('keydown', dismissWorldPanel, true);
    this.cleanups.push(() => window.removeEventListener('keydown', dismissWorldPanel, true));
    const focus = () => {
      const blocked = worldInputBlocked();
      this.input.enabled = !blocked;
      if (this.input.keyboard) {
        this.input.keyboard.enabled = !blocked && !isTypingTarget(document.activeElement);
        this.input.keyboard.resetKeys();
      }
      if (blocked) {
        virtualInput.x = 0; virtualInput.y = 0;
        if (this.mouseWalk) { this.cancelQuestNav(); this.player.setVelocity(0, 0); }
      }
    };
    let wasBlocked = !worldInputBlocked();
    const syncFocus = () => { const blocked = worldInputBlocked(); if (blocked !== wasBlocked) { wasBlocked = blocked; focus(); } };
    this.cleanups.push(gameStore.subscribe(syncFocus), socialStore.subscribe(syncFocus), chatStore.subscribe(syncFocus), partyDungeonStore.subscribe(syncFocus));
    syncFocus();
    const unsub = gameStore.subscribe((s, prev) => {
      if (lifeProgress(s.player).retreat && !lifeProgress(prev.player).retreat) {
        this.player.stopMeditate();
        this.player.clearRoute();
      }
      if (isChildhood(s.player) !== isChildhood(prev.player)) {
        const pos = this.player.feet;
        this.time.delayedCall(0, () => this.scene.restart({ mapId: this.mapId, pos }));
      }
      if (s.player.level > prev.player.level) {
        this.vfx.ascend(this.player, s.player.realmIndex > prev.player.realmIndex);
      }
    });
    this.cleanups.push(unsub);
  }

  // ---- main loop ---------------------------------------------------------

  update(_time: number, delta: number) {
    if (!this.worldBuilt) return;
    const dt = Math.min(delta, 50);
    this.tickPartyConnection();
    this.updateTribulation(dt);
    this.player.update(dt);
    this.companion.update(dt);
    if(this.gardenVisuals.length){const l=lifeProgress(gameStore.getState().player);this.gardenVisuals.forEach((visual,i)=>{const plot=l.plots[i];visual.art.setVisible(!!plot);visual.label.setVisible(i<l.plots.length);if(plot){visual.art.setTexture(`immortal-${plot.herb}`).setAlpha(plot.readyDay<=l.days?1:.5);visual.label.setText(plot.readyDay<=l.days?'Có thể thu hoạch':`Còn ${plot.readyDay-l.days} ngày`);}else visual.label.setText('Đất trống');});}
    this.routeGuide.setVisible(!gameStore.getState().menu && !gameStore.getState().dialogNpc);
    this.guideTimer -= dt;
    if (this.guideTimer <= 0) { this.guideTimer = 500; this.drawRouteGuide(); }
    this.tickMultiplayer(dt);
    const targetable = this.player.life.status === 'alive' ? this.player.feet : null;
    for (const m of this.monsters) if (!this.cooperativeRun || !this.partyWaiting) m.update(dt, this.shared?.authority?this.shared.target(m):targetable);
    for (const l of this.loot.getChildren() as LootDrop[]) {
      if (l.tick(dt, this.player.feet)) this.collectLoot(l);
    }
    if (this.run && this.map.arena && (!this.cooperativeRun || (this.shared?.authority && !this.partyWaiting))) {
      const alive = this.monsters.reduce((n, m) => n + (m.alive ? 1 : 0), 0);
      for (const ev of tickRun(this.run, DUNGEONS[this.run.id], dt, alive)) this.onRunEvent(ev);
    }

    this.camTarget.setPosition(isoX(this.player.x, this.player.y), isoY(this.player.x, this.player.y));
    this.villageAtmosphere?.update();
    this.sceneryTimer -= dt;
    if (this.sceneryTimer <= 0) {
      this.sceneryTimer = 250;
      const view = this.cameras.main.worldView, tier = performanceStore.getState().tier;
      const visible = new Phaser.Geom.Rectangle(view.x - 160, view.y - 160, view.width + 320, view.height + 320);
      for (const entry of this.scenery) {
        const show = Phaser.Geom.Intersects.RectangleToRectangle(visible, entry.bounds);
        entry.image.setVisible(show);
        for (const tween of entry.tweens) { if (!show || tier === 2) tween.pause(); else tween.resume(); }
      }
    }

    if (this.target?.alive) {
      const ring = iso(this.target.x, this.target.y);
      this.targetRing.setVisible(true).setPosition(ring.x, ring.y);
    } else {
      if (this.target) this.setTarget(null);
      this.targetRing.setVisible(false);
    }

    this.syncTimer += dt;
    if (this.syncTimer >= 100) {
      this.syncTimer = 0;
      this.syncUi();
    }
    this.secondTimer += Math.min(delta, 1000);
    if (this.secondTimer >= 1000) {
      this.secondTimer -= 1000;
      this.perSecond();
      gameStore.getState().tickGameTime(1000);
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

  private drawRouteGuide() {
    this.routeGuide.clear();
    const s = gameStore.getState();
    if (this.map.arena || this.transitioning || s.status !== 'alive' || s.menu || s.dialogNpc) return;
    const from = { x: Math.floor(this.player.x / TILE), y: Math.floor(this.player.y / TILE) };
    const travel = trackedTravel();
    let stop: QuestStop;
    if (travel) {
      const map = getMap(travel);
      stop = { mapId: travel, tile: { x: map.playerSpawn[0], y: map.playerSpawn[1] }, label: map.name };
    } else {
      const id = trackedQuest();
      if (!id) return;
      const nav = questDestination(id, s.quests, s.player.level, this.map.id, from);
      if (nav.kind !== 'go') return;
      stop = nav.stop;
      if (stop.gatherItem && stop.mapId === this.map.id) {
        const readyAt = immortalProgress(s.player).harvestReadyAt;
        const node = this.herbs.find(h => h.node.item === stop.gatherItem && (readyAt[h.node.id] ?? 0) <= Date.now())?.node;
        if (!node) return;
        stop.tile = { x: node.x, y: node.y };
      }
    }
    const route = routeOnMap(this.map, from, stop, s.player.level, { childhood: isChildhood(s.player), quests: s.quests, reputation: adventure(s.player).reputation });
    if (route.kind !== 'path') return;
    const points = [{ x: (from.x + .5) * TILE, y: (from.y + .5) * TILE }, ...route.tiles.map(t => ({ x: (t.x + .5) * TILE, y: (t.y + .5) * TILE }))];
    for (const dot of routeDots(points)) {
      const at = iso(dot.x, dot.y);
      this.routeGuide.fillStyle(0x233238, .4).fillCircle(at.x, at.y + 1.5, 3.2);
      this.routeGuide.fillStyle(0xffffff, .8).fillCircle(at.x, at.y, 2.5);
    }
  }

  private syncUi() {
    const s = gameStore.getState();
    const p = this.player;
    const patch: Partial<typeof s> = {};
    const body = p.art.getBounds();
    // Tall columns and trees become translucent only while the hero is behind them.
    for (const prop of this.foregroundDecor) {
      const bounds = prop.getBounds();
      const obscures = prop.depth > p.art.depth && Phaser.Geom.Intersects.RectangleToRectangle(bounds, body);
      prop.setAlpha(obscures ? .38 : 1);
    }

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
      ? { name: t.def.name, level: t.hideStrength?0:t.def.level, hp: t.hideStrength?1:Math.ceil(t.hp), maxHp: t.hideStrength?1:t.def.hp }
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
      // NPC sprites are drawn in screen space; interaction distances stay in map space.
      const d = Phaser.Math.Distance.Between(n.map.x, n.map.y, p.x, p.y);
      if (d < best) {
        best = d;
        nearby = n.npcId;
      }
      n.refreshMarker(s.quests);
    }
    if (nearby !== s.nearbyNpc) patch.nearbyNpc = nearby;
    let nearbyHerb: HerbNode | null = null;
    let herbDistance = 110;
    const now = Date.now();
    const harvestTimes = immortalProgress(s.player).harvestReadyAt;
    for (const { node, art, label } of this.herbs) {
      const remaining = Math.max(0, Math.ceil(((harvestTimes[node.id] ?? 0) - now) / 1000));
      art.setAlpha(remaining ? 0.25 : 1);
      label.setText(remaining ? `${itemName(node.item)} · ${remaining}s` : itemName(node.item));
      const distance = Math.hypot(p.x - node.x * TILE - TILE / 2, p.y - node.y * TILE - TILE / 2);
      if (!remaining && distance < herbDistance) { nearbyHerb = node; herbDistance = distance; }
    }
    if (nearbyHerb?.id !== s.nearbyHerb?.id) patch.nearbyHerb = nearbyHerb ? { id: nearbyHerb.id, name: itemName(nearbyHerb.item) } : null;
    if (this.mapId === 'vuong_gia_thon') {
      for (const { node, label } of this.herbs) label.setVisible(node.id === nearbyHerb?.id);
      for (const { point, label } of this.pointLabels) label.setVisible(Math.hypot(p.x - (point.x + .5) * TILE, p.y - (point.y + .5) * TILE) < 180);
    }
    const nearestPoint = (this.map.points ?? []).filter((point) => Math.hypot(p.x - point.x * TILE - TILE / 2, p.y - point.y * TILE - TILE / 2) <= 110)
      .sort((a, b) => Math.hypot(p.x - a.x * TILE, p.y - a.y * TILE) - Math.hypot(p.x - b.x * TILE, p.y - b.y * TILE))[0];
    if (nearestPoint?.id !== s.nearbyPoint?.id) patch.nearbyPoint = nearestPoint ? { id: nearestPoint.id, name: nearestPoint.name } : null;
    if (!nearby && s.dialogNpc) patch.dialogNpc = null;

    if (this.run) {
      const def = DUNGEONS[this.run.id];
      const boss = this.monsters.find((m) => m.def.boss && m.alive);
      const hud: DungeonHud = {
        id: this.run.id,
        name: this.cooperativeRun && this.partyWaiting ? `${def.name} · Chờ đồng đội kết nối` : def.name,
        phase: this.run.phase,
        wave: Math.max(0, this.run.wave + 1),
        waves: def.waves.length,
        timeLeft: Math.ceil(this.run.timeLeft / 1000),
        remaining: this.monsters.filter((m) => m.alive).length,
        boss: boss ? { name: boss.def.name, hp: Math.ceil(boss.hp), maxHp: boss.def.hp } : null,
      };
      if (JSON.stringify(hud) !== JSON.stringify(s.dungeon)) patch.dungeon = hud;
    }

    if (s.menu === 'boss') publishBossSightings({ mapId: this.map.id, sightings: this.monsters.filter(m => !m.hideStrength).map((m, i) => ({ id: m.netId || `local:${i}`, type: m.type, homeX: m.brain.home.x, homeY: m.brain.home.y, hp: m.hp, maxHp: m.def.hp, alive: m.alive, respawnAt: m.respawnAt, generation: m.generation })) });
    patch.minimap = {
      player: { x: p.x, y: p.y },
      monsters: this.monsters.filter((m) => m.alive).map((m) => ({ x: m.x, y: m.y, boss: !!m.def.boss && !m.hideStrength, ...(!m.hideStrength ? { level: m.def.level, name: m.def.name } : {}) })),
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
    if (p.meditating && !lifeProgress(s.player).retreat) {
      const zone = this.currentZone;
      const rate = this.map.private ? homeMeditateRate(immortalProgress(s.player).homeLevel) + lifeProgress(s.player).facilities.array - 1 : zone?.rate ?? null;
      const gain = meditateGain(s.player.level, rate);
      s.addItem('linh_khi', gain.linhKhi, { silent: true });
      s.gainExp(gain.exp, { silent: true });
      s.restore(Math.round(s.stats.maxHp * gain.hpPct), Math.round(s.stats.maxMp * gain.mpPct));
      this.damageText.show(p.x, p.y - 96, `+${gain.linhKhi} Linh Khí  +${gain.exp} EXP`, 'info');
      s.questEvent({ type: 'meditate', zone: zone?.id ?? null, seconds: 1 });
    }
  }

  private updateTribulation(dt:number){
    const s=gameStore.getState(),trial=s.tribulation;if(!trial||s.status!=='alive')return;
    if (this.player.meditating) this.player.stopMeditate();
    const plan = tribulationPlan(trial.realm);
    // Background tabs cannot skip the trial or resolve several unseen waves at once.
    const remaining=Math.max(0,trial.remaining-Math.min(100,Math.max(0,dt)));
    const strikes=Math.min(plan.waves,Math.floor((plan.durationMs-remaining)/plan.intervalMs));
    s.patch({tribulation:{...trial,remaining,strikes}});
    if(strikes>trial.strikes){
      for (let i=0;i<plan.threats;i++) {
        const angle=strikes*1.7+i*Math.PI;
        const offset=i===0?0:plan.radius*1.9;
        const target={x:this.player.x+Math.cos(angle)*offset,y:this.player.y+Math.sin(angle)*offset};
        const spot=iso(target.x,target.y),radius=plan.radius;
        const warning=this.add.graphics().setDepth(spot.y-2)
          .fillStyle(0xff5252,.22).fillEllipse(spot.x,spot.y,radius*2*Math.SQRT2,radius*Math.SQRT2)
          .lineStyle(2,0xffdc78).strokeEllipse(spot.x,spot.y,radius*2*Math.SQRT2,radius*Math.SQRT2);
        this.time.delayedCall(plan.warningMs,()=>{
          warning.destroy();
          const current=gameStore.getState();
          if(!current.tribulation||current.tribulation.id!==trial.id||current.status!=='alive')return;
          const bolt=this.add.graphics().setDepth(spot.y+300).setBlendMode(Phaser.BlendModes.ADD);
          const points=Array.from({length:9},(_,n)=>({x:spot.x+(n===8?0:Math.sin(n*13+strikes)*19),y:spot.y-240+n*30}));
          for(const [width,color] of [[9,0x529bff],[3,0xffedbd]] as const){
            bolt.lineStyle(width,color,.9).beginPath().moveTo(points[0].x,points[0].y);
            points.slice(1).forEach(p=>bolt.lineTo(p.x,p.y));bolt.strokePath();
          }
          bolt.lineStyle(3,0xffe7a3).strokeEllipse(spot.x,spot.y,radius*1.8,radius*.9);
          this.tweens.add({targets:bolt,alpha:0,duration:480,onComplete:()=>bolt.destroy()});
          this.cameras.main.flash(80,160,185,255);
          if(Math.hypot(this.player.x-target.x,this.player.y-target.y)<radius)
            this.player.takeHit(Math.round(current.stats.maxHp*plan.damagePct),false,target);
        });
      }
    }
    if(!remaining)s.finishTribulation(true);
  }

  returnToSect(){
    const s=gameStore.getState();s.finishTribulation(false);this.cancelQuestNav();s.setAuto(false);
    if(this.run&&!runOver(this.run)){if(this.cooperativeRun)this.settlePartyRun(false,[]);else s.finishDungeon(this.run.id,false,this.run.elapsed);}
    const mapId=isChildhood(s.player)?'vuong_gia_thon':adventure(s.player).boundSect;
    this.time.delayedCall(SECT_RETURN_DELAY_MS,()=>{
      const fresh=gameStore.getState();fresh.restore(fresh.stats.maxHp,fresh.stats.maxMp);
      fresh.patch({status:'alive',downedRemaining:0,dungeon:null,dungeonReturn:null,menu:null,dialogNpc:null});
      this.scene.restart({mapId,spawn:getMap(mapId).playerSpawn});
    });
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
    const questPoint = (this.map.points ?? []).find((point) =>
      Math.hypot(this.player.x - (point.x + .5) * TILE, this.player.y - (point.y + .5) * TILE) <= 110 &&
      Object.entries(s.quests).some(([id, q]) => q.status === 'active' && QUESTS[id]?.objectives.some((o, i) =>
        o.type === 'interact' && o.point === point.id && (q.progress[i] ?? 0) < o.count)));
    if (questPoint) { this.interactPoint(questPoint); return; }
    if (!s.nearbyNpc && s.nearbyPoint) {
      const point = this.map.points?.find((p) => p.id === s.nearbyPoint?.id);
      if (point) this.interactPoint(point);
      return;
    }
    if (!s.nearbyNpc && s.nearbyHerb) {
      const herb = this.herbs.find((h) => h.node.id === s.nearbyHerb?.id);
      if (herb) this.harvest(herb.node);
      return;
    }
    const id = s.nearbyNpc;
    if (!id || this.player.life.status !== 'alive') return;
    const npc = this.npcs.find((n) => n.npcId === id);
    if (npc) this.player.faceToward(npc.map);
    this.player.stopMeditate();
    s.questEvent({ type: 'talk', npc: id });
    s.setDialog(id);
  }

  private toggleMeditate() {
    if (this.player.meditating) this.player.stopMeditate();
    else this.player.startMeditate();
  }

  private visitHome() {
    const s = gameStore.getState();
    if(lifeProgress(s.player).retreat)return s.toast('Hãy xuất quan hoặc dừng bế quan trước.','info');
    if (this.transitioning || this.player.life.status !== 'alive') return;
    if (this.map.arena) return s.toast('Hãy rời phó bản trước khi về động phủ.', 'warn');
    if (s.quests[HOME_QUEST]?.status !== 'done') return s.toast('Hoàn thành Lò Đan Khai Hỏa để nhận động phủ.', 'warn');
    if (this.time.now - this.player.lastDamageAt < 3000) return s.toast('Hãy thoát chiến trước khi truyền tống.', 'warn');
    this.cancelQuestNav();
    this.player.stopMeditate();
    s.setAuto(false);
    this.goTo({ mapId: this.map.private ? 'dai_thua_vien' : 'dong_phu' });
  }

  private transition(p: PortalDef) {
    if (this.player.life.status !== 'alive') return;
    if (this.map.arena) return this.leaveDungeon();
    const s = gameStore.getState();
    const reason = portalGateReason(p, { childhood: isChildhood(s.player), quests: s.quests, reputation: adventure(s.player).reputation });
    if (reason) {
      if (!this.levelWarned) { s.toast(reason, 'warn'); this.levelWarned = true; this.time.delayedCall(2500, () => { this.levelWarned = false; }); }
      return;
    }
    if (p.levelBand) {
      const level = gameStore.getState().player.level;
      const current=trackedQuest(),nav=current?questDestination(current,s.quests,level,this.map.id):null;
      const desired=trackedTravel()??(nav?.kind==='go'?nav.stop.mapId:undefined);
      const band = FIELD_BANDS.find(b=>b.id===desired)??fieldForLevel(level);
      const check = canEnterField(level, { min: band.minLevel, max: band.maxLevel });
      if (!check.ok) {
        gameStore.getState().toast(check.reason, 'warn');
        return;
      }
      this.goTo({ mapId: band.id, spawn: getMap(band.id).playerSpawn });
      return;
    }
    this.goTo({ mapId: p.to, spawn: p.spawn });
  }

  private goTo(data: WorldData) {
    if (this.transitioning) return;
    if (this.player.life.status !== 'alive') return;
    if (lifeProgress(gameStore.getState().player).retreat) return gameStore.getState().toast('Hãy xuất quan trước khi rời động phủ.','info');
    if (gameStore.getState().tribulation) return gameStore.getState().toast('Hãy hoàn thành thiên kiếp trước.','warn');
    this.transitioning = true;
    this.game.events.emit('assets-loading', { mapId: data.mapId ?? this.mapId, mapName: getMap(data.mapId ?? this.mapId).name });
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
    if (s.tribulation) return s.toast('Hãy hoàn thành thiên kiếp trước.','warn');
    if (lifeProgress(s.player).retreat) return s.toast('Hãy xuất quan trước khi vào phó bản.','info');
    if (!s.beginDungeon(id)) return;
    this.cancelQuestNav();
    this.player.stopMeditate();
    s.patch({ dungeonReturn: { mapId: this.map.id, pos: { x: this.player.x, y: this.player.y } } });
    this.goTo({ mapId: def.map, dungeonId: id });
  }

  private enterPartyDungeon(ticket: PartyRunTicket) {
    const s = gameStore.getState(), me = getAccountState().user?.id;
    if (this.map.arena || this.transitioning || !me || !ticket.members.some(m => m.userId === me) ||
      s.player.partyRun || s.player.partyRunReceipts?.includes(ticket.id) || !s.beginDungeon(ticket.dungeon)) {
      cancelPartyDungeon(); return;
    }
    this.cancelQuestNav(); this.player.stopMeditate();
    s.patch({ dungeonReturn: { mapId: this.map.id, pos: { x: this.player.x, y: this.player.y } },
      player: { ...gameStore.getState().player, partyRun: { id: ticket.id, dungeon: ticket.dungeon, day: todayKey() } } });
    this.save();
    this.goTo({ mapId: DUNGEONS[ticket.dungeon].map, dungeonId: ticket.dungeon, partyRun: ticket });
  }

  private tickPartyConnection() {
    const ticket = this.cooperativeRun;
    if (!ticket || !this.run || runOver(this.run)) return;
    if (partyDungeonStore.getState().ticket?.id !== ticket.id) { this.abortPartyDungeon(); return; }
    const me = getAccountState().user?.id, now = Date.now();
    const present = this.channel?.connected && ticket.members.every(m => m.userId === me || this.shared?.roster.some(p => p.userId === m.userId));
    this.partyWaiting = !present;
    if (partyDungeonStore.getState().waiting !== this.partyWaiting) partyDungeonStore.setState({ waiting: this.partyWaiting });
    if (present) { this.partyStarted = true; this.partyMissingAt = 0; }
    else {
      if (!this.partyMissingAt) this.partyMissingAt = now;
      if ((this.partyStarted && now - this.partyMissingAt > 15000) || (!this.partyStarted && now - this.partyEnteredAt > 30000)) this.abortPartyDungeon();
    }
  }

  private abortPartyDungeon() {
    if (!this.cooperativeRun || !this.run || runOver(this.run)) return;
    const s = gameStore.getState();
    this.run.phase = 'failed';
    s.patch({ player: resolvePartyRun(s.player, this.cooperativeRun.id, true) });
    completePartyDungeon(); this.save();
    s.toast('Phó bản tổ đội gián đoạn. Đã hoàn lượt; chưa nhận thưởng.', 'warn');
    this.leaveDungeon();
  }

  partyRunSnapshot() {
    return this.cooperativeRun && this.run ? { room: this.cooperativeRun.id, run: { ...this.run }, waiting: this.partyWaiting } : null;
  }
  applyPartyRunSnapshot(packet: { room: string; run: DungeonRun; eligible: string[]; waiting: boolean }) {
    if (!this.cooperativeRun || !this.run || packet.room !== this.cooperativeRun.id || packet.run.id !== this.run.id || runOver(this.run)) return;
    this.run = { ...packet.run }; this.partyWaiting = packet.waiting;
    if (runOver(this.run)) {
      this.settlePartyRun(this.run.phase === 'cleared', packet.eligible);
      this.openExit();
    }
  }
  private settlePartyRun(success: boolean, eligible: string[]) {
    const ticket = this.cooperativeRun, s = gameStore.getState();
    if (!ticket || !this.run || s.player.partyRun?.id !== ticket.id) return;
    s.patch({ player: resolvePartyRun(s.player, ticket.id, false) });
    const qualifies = eligible.includes(getAccountState().user?.id ?? '');
    if (!success || qualifies) s.finishDungeon(this.run.id, success, this.run.elapsed);
    else s.toast('Chưa đủ đóng góp để nhận thưởng. Cần trực tiếp đánh, khống chế hoặc hỗ trợ đồng đội.', 'warn');
    if (success && qualifies) s.recordBossVictory();
    completePartyDungeon(); this.save();
  }

  private onQuestGo(id: string) {
    const s = gameStore.getState();
    s.patch({ menu: null, dialogNpc: null });
    if (this.map.arena) {
      s.toast('Hãy rời phó bản trước.', 'warn');
      return;
    }
    if (this.player.life.status !== 'alive') return;
    trackQuest(id);
    trackTravel(null);
    this.navRepaths = 0;
    this.navLabel = '';
    this.player.stopMeditate();
    this.guideQuest();
  }

  /** Walk toward the tracked quest. Continues through gates after a map change. */
  private guideQuest() {
    const id = trackedQuest();
    if (!id || !this.player) return;
    const s = gameStore.getState();
    if (this.map.arena) {
      s.toast('Hãy rời phó bản trước.', 'warn');
      this.cancelQuestNav();
      return;
    }
    const from = { x: Math.floor(this.player.x / TILE), y: Math.floor(this.player.y / TILE) };
    const nav = questDestination(id, s.quests, s.player.level, this.map.id, from);
    if (nav.kind === 'toast') {
      s.toast(nav.text, 'warn');
      this.cancelQuestNav();
      return;
    }
    if (nav.kind === 'menu') {
      s.toast(`Mở bảng ${nav.label} để làm nhiệm vụ.`, 'info');
      s.setMenu(nav.menu);
      this.cancelQuestNav();
      return;
    }
    if (nav.stop.mapId === 'dong_phu' && !this.map.private) { this.visitHome(); return; }
    if (nav.stop.gatherItem && nav.stop.mapId === this.map.id) {
      const readyAt = immortalProgress(s.player).harvestReadyAt;
      const node = this.herbs.find((h) => h.node.item === nav.stop.gatherItem && (readyAt[h.node.id] ?? 0) <= Date.now())?.node;
      if (!node) { s.toast('Dược liệu đang hồi phục, hãy chờ một chút.', 'info'); this.cancelQuestNav(); return; }
      nav.stop.tile = { x: node.x, y: node.y };
    }
    if (nav.stop.mapId !== 'dong_phu' && this.map.private) {
      this.goTo({ mapId: 'dai_thua_vien' });
      return;
    }
    const route = routeOnMap(this.map, from, nav.stop, s.player.level, { childhood: isChildhood(s.player), quests: s.quests, reputation: adventure(s.player).reputation });
    if (route.kind === 'fail') {
      s.toast(route.text, 'warn');
      this.cancelQuestNav();
      return;
    }
    if (route.kind === 'there') {
      this.arriveAt(nav.stop);
      return;
    }
    if (route.kind === 'wait') return;
    if (nav.stop.label !== this.navLabel) {
      this.navLabel = nav.stop.label;
      s.toast(`Đang chạy tới ${nav.stop.label}`, 'info');
    }
    this.player.setRoute(route.tiles.map((t) => ({ x: t.x * TILE + TILE / 2, y: t.y * TILE + TILE / 2 })));
  }

  private arriveAt(stop: QuestStop) {
    const s = gameStore.getState();
    if (stop.talkTo) {
      const npc = this.npcs.find((n) => n.npcId === stop.talkTo);
      if (npc) {
        const d = Phaser.Math.Distance.Between(npc.map.x, npc.map.y, this.player.x, this.player.y);
        if (d > 80) {
          const k = (d - 64) / d;
          this.player.setRoute([
            {
              x: this.player.x + (npc.map.x - this.player.x) * k,
              y: this.player.y + (npc.map.y - this.player.y) * k,
            },
          ]);
          return;
        }
        this.cancelQuestNav();
        this.player.faceToward(npc.map);
        s.questEvent({ type: 'talk', npc: stop.talkTo });
        s.setDialog(stop.talkTo);
        return;
      }
    }
    this.cancelQuestNav();
    if (stop.gatherItem) {
      const readyAt = immortalProgress(s.player).harvestReadyAt;
      const node = this.herbs.find((h) => h.node.item === stop.gatherItem && (readyAt[h.node.id] ?? 0) <= Date.now() &&
        Math.hypot(this.player.x - (h.node.x + .5) * TILE, this.player.y - (h.node.y + .5) * TILE) <= 110)?.node;
      if (node) this.harvest(node);
      return;
    }
    if (stop.interactTo) {
      const point = this.map.points?.find((p) => p.id === stop.interactTo);
      if (point) this.interactPoint(point);
      return;
    }
    if (stop.meditate) {
      this.player.startMeditate();
      return;
    }
    if (stop.monsterType) {
      const mob = this.monsters.find((m) => m.alive && m.type === stop.monsterType);
      if (mob) this.setTarget(mob);
    }
    s.toast(`Đã tới ${stop.label}`, 'info');
  }

  cancelQuestNav() {
    trackQuest(null);
    trackTravel(null);
    this.navRepaths = 0;
    this.navLabel = '';
    this.player?.clearRoute();
    this.mouseWalk = null;
    this.mouseMarker?.setVisible(false);
    this.routeGuide?.clear();
  }

  repathQuest() {
    this.navRepaths += 1;
    if (this.navRepaths > 5) {
      gameStore.getState().toast('Không tìm được đường đi.', 'warn');
      this.cancelQuestNav();
      return;
    }
    if (this.mouseWalk) {
      const route = mouseWalkPath(this.map.blocked, TILE, this.player.feet, this.mouseWalk.point);
      if (route) this.player.setRoute(route.points);
      else this.cancelQuestNav();
    } else if (trackedTravel()) this.guideTravel();
    else this.guideQuest();
  }

  onQuestRouteDone() {
    if (this.mouseWalk) {
      const npc = this.mouseWalk.npc;
      this.mouseWalk = null;
      if (npc) this.talkToMouseNpc(npc);
    } else if (trackedTravel()) this.guideTravel();
    else if (trackedQuest()) this.guideQuest();
  }

  private travelTo(id: string) {
    const s = gameStore.getState();
    if(lifeProgress(s.player).retreat)return s.toast('Hãy xuất quan trước khi rời động phủ.','info');
    if (this.map.arena || this.transitioning || s.status !== 'alive') return;
    this.cancelQuestNav(); this.player.stopMeditate();
    s.patch({ auto: false, menu: null, dialogNpc: null });
    trackTravel(id); this.guideTravel();
  }

  private guideTravel() {
    const id = trackedTravel();
    if (!id) return;
    const s = gameStore.getState();
    const target = getMap(id);
    if (this.map.id === target.id) { this.cancelQuestNav(); s.toast(`Đã tới ${target.name}`); return; }
    const route = routeOnMap(this.map, { x: Math.floor(this.player.x / TILE), y: Math.floor(this.player.y / TILE) }, { mapId: id, tile: { x: target.playerSpawn[0], y: target.playerSpawn[1] }, label: target.name }, s.player.level, { childhood: isChildhood(s.player), quests: s.quests, reputation: adventure(s.player).reputation });
    if (route.kind === 'fail') { this.cancelQuestNav(); s.toast(route.text, 'warn'); return; }
    if (route.kind === 'path') this.player.setRoute(route.tiles.map((t) => ({ x: t.x * TILE + TILE / 2, y: t.y * TILE + TILE / 2 })));
  }

  private leaveDungeon() {
    if (!this.map.arena || this.transitioning) return;
    const s = gameStore.getState();
    if (this.run && !runOver(this.run)) s.addLog(`Rời khỏi ${DUNGEONS[this.run.id].name} giữa chừng.`);
    if (this.cooperativeRun && s.player.partyRun?.id === this.cooperativeRun.id) {
      s.patch({ player: resolvePartyRun(s.player, this.cooperativeRun.id, false) });
      completePartyDungeon(); this.save();
    }
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
        if (this.cooperativeRun) this.settlePartyRun(true, this.shared?.activePartyMembers() ?? []);
        else s.finishDungeon(run.id, true, run.elapsed);
        this.save();
        this.vfx.ascend(this.player, true);
        this.cameras.main.flash(400, 255, 230, 160);
        this.openExit();
        break;
      }
      case 'failed': {
        for (const m of this.monsters) m.vanish();
        if (this.cooperativeRun) this.settlePartyRun(false, []);
        else s.finishDungeon(run.id, false, run.elapsed);
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
    const original = MONSTERS[type], size = this.cooperativeRun?.members.length ?? 1;
    const m = new Monster(this, type, x, y, { arena: true, definition: size > 1 ? { ...original, hp: Math.round(original.hp * (size === 2 ? 1.8 : 2.6)) } : original });
    this.monsters.push(m);
    this.shared?.registerMonster(m);
    const at = iso(x, y);
    const ring = this.add
      .image(at.x, at.y, 'portal')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.2, 0.1)
      .setDepth(at.y - 1);
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
    if(this.shared){this.shared.slam(m,radius,windup,mul);return;}
    const aimed=m.def.boss?.pattern==='storm'||m.def.boss?.pattern==='celestial';
    const cx = aimed?this.player.x:m.x;
    const cy = aimed?this.player.y:m.y;
    // Warning circle: an ellipse on the ground, squashed by the isometric ratio.
    const show = iso(cx, cy);
    const rx = radius * 2;
    const ry = radius * 1.3;
    const zone = this.add.graphics().setDepth(show.y - 6);
    zone.fillStyle(0xff3b2f, 0.16).fillEllipse(show.x, show.y, rx, ry);
    zone.lineStyle(3, 0xff5a3a, 0.9).strokeEllipse(show.x, show.y, rx, ry);
    const fill = this.add.graphics().setDepth(show.y - 5).setPosition(show.x, show.y).setScale(0);
    fill.fillStyle(0xff5a3a, 0.35).fillEllipse(0, 0, rx, ry);
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
      if (p.life.status !== 'alive') return;
      if (Math.hypot(dx, dy) > radius + 12) {
        if (aimed) gameStore.getState().recordPractice('dodge');
        return;
      }
      const { stats } = gameStore.getState();
      const r = computeDamage({ atk: m.def.atk, def: stats.def, multiplier: mul, critRate: 0, critMul: 1,
        attackerRealm: realmIndexAtLevel(m.def.level), defenderRealm: gameStore.getState().player.realmIndex });
      if (!p.takeHit(r.amount, true, { x: cx, y: cy })) gameStore.getState().recordPractice('dodge');
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

  private damageMonster(m: Monster, multiplier: number, slowMs = 0, defenseFactor = 1) {
    const { stats } = gameStore.getState();
    const r = computeDamage({
      atk: stats.atk,
      def: m.def.def * (m.weakenTimer > 0 ? .8 : 1) * defenseFactor,
      multiplier,
      critRate: stats.critRate,
      critMul: stats.critMul,
      attackerRealm: gameStore.getState().player.realmIndex,
      defenderRealm: realmIndexAtLevel(m.def.level),
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
    if(this.shared){gameStore.getState().recordPractice('basic');this.shared.attack('basic',combo);return;}
    const sk = playerSkill('basic');
    const p = this.player;
    const f = p.facing;
    this.vfx.swing(p.feet, Math.atan2(f.y, f.x), combo, gameStore.getState().player.sex === 'male');
    const finisher = combo === 3;
    const hits = this.monstersInArc(sk.range + (finisher ? 16 : 0), finisher ? 80 : sk.arc);
    if (hits.length) gameStore.getState().recordPractice('basic');
    const finisherMul = sk.active?.finisherMul ?? 1.5;
    for (const m of hits) this.damageMonster(m, sk.multiplier * (finisher ? finisherMul : 1));
  }

  executeSkill(id: SkillId, target: Monster | null) {
    if(this.shared){if(id!=='basic'&&id!=='than_phap')gameStore.getState().recordPractice('skill');this.shared.attack(id);return;}
    if (id !== 'basic' && id !== 'than_phap') gameStore.getState().recordPractice('skill');
    const sk = playerSkill(id);
    const p = this.player;
    const f = p.facing;
    const ang = Math.atan2(f.y, f.x);
    const wangLinStyle = gameStore.getState().player.sex === 'male';
    const liMuStyle = !wangLinStyle;
    const spell = heroSpell(id);
    if (spell) {
      const from = {x:p.x,y:p.y}, facing = {...f};
      this.vfx.heroSpell(id,from,facing,sk.range);
      if(sk.kind==='heal'){gameStore.getState().restore(Math.round(gameStore.getState().stats.maxHp*spell.healFraction),0);return;}
      if(sk.kind==='shield'){p.grantShield(Math.round(gameStore.getState().stats.maxHp*spell.shieldFraction),spell.shieldMs);return;}
      this.time.delayedCall(spell.windupMs,()=>{
        if(p.life.status!=='alive')return;
        for(const m of this.monsters)if(m.alive && heroSpellHit(spell.shape,from,facing,sk.range,sk.arc,m)){
          this.damageMonster(m,sk.multiplier);
          if(m.alive && spell.rootMs)m.rootTimer=m.def.boss?Math.min(350,spell.rootMs):spell.rootMs;
        }
      });
      return;
    }
    if (wangEffect(id)) {
      const from = { x: p.x, y: p.y },
        facing = { ...f };
      const ritual = ritualSkill(id);
      const hits = () =>
        this.monsters
          .filter((m) => m.alive && signatureHit(id, from, facing, sk.range, m))
          .sort(
            (a, b) => Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y),
          );
      if (id !== 'dinh_than_thuat') this.vfx.signature(id, from, facing, sk.range);
      else
        this.vfx.signature(id, from, facing, sk.range, {
          castOnly: true,
          duration: 400,
        });
      if (id === 'luyen_hon_thuat') {
        for (let tick = 1; tick <= ritual!.ticks; tick++)
          this.time.delayedCall(tick * ritual!.tickMs, () => {
            if (p.life.status !== 'alive') return;
            let drained = 0;
            for (const m of hits()) {
              const before = m.hp;
              m.weakenTimer = 650;
              this.damageMonster(m, sk.multiplier);
              drained += Math.max(0, before - m.hp);
            }
            gameStore.getState().restore(soulDrain(drained, gameStore.getState().stats.maxHp), 0);
          });
      } else if (id === 'dao_hoa_hoang_tuyen') {
        for (let tick = 1; tick <= 8; tick++)
          this.time.delayedCall(tick * 500, () => {
            if (p.life.status !== 'alive') return;
            for (const m of hits()) {
              m.weakenTimer = 800;
              this.damageMonster(m, sk.multiplier, 800);
            }
          });
      } else
        this.time.delayedCall(ritual?.windup ?? (id === 'dich_linh_an' ? 450 : 400), () => {
          if (p.life.status !== 'alive') return;
          if (id === 'dinh_than_thuat') {
            const m = hits()[0];
            if (m) {
              m.rootTimer = 2000;
              this.vfx.signature(id, m, facing, sk.range, { duration: 2000 });
            } else
              this.vfx.signature(
                id,
                {
                  x: from.x + facing.x * sk.range,
                  y: from.y + facing.y * sk.range,
                },
                facing,
                sk.range,
              );
          } else
            for (const m of ritual?.singleTarget ? hits().slice(0, 1) : hits()) {
              this.damageMonster(m, sk.multiplier, 0, 1 - (ritual?.armorPierce ?? 0));
              const control = ritualControlMs(id);
              if (control && m.alive) m.rootTimer = control;
              if (id === 'dich_linh_an' && m.alive) m.rootTimer = m.def.boss ? 350 : 600;
            }
        });
      return;
    }
    if(sk.kind==='heal'){gameStore.getState().restore(Math.round(gameStore.getState().stats.maxHp*.24),0);this.vfx.ascend(p);return;}
    if(sk.kind==='shield'){p.grantShield(Math.round(gameStore.getState().stats.maxHp*.35),6000);return;}
    if(id==='loi_kich'||id==='phong_nhan'||id==='hoa_lien'){
      if(sk.kind==='nova')this.vfx.frostNova(p.feet,sk.range);else this.vfx.crescent(p.feet,ang,sk.range,false,false);
      const hits=sk.kind==='nova'?this.monsters.filter(m=>m.alive&&m.distanceTo(p)<=sk.range):this.monstersInArc(sk.range,sk.kind==='projectile'?35:100);
      for(const m of hits)this.damageMonster(m,sk.multiplier,id==='phong_nhan'?1200:0);return;
    }
    switch (id) {
      case 'bang_tam_tram': {
        this.vfx.crescent(p.feet, ang, sk.range, liMuStyle, wangLinStyle);
        this.time.delayedCall(90, () => {
          for (const m of this.monstersInArc(sk.range, sk.arc)) this.damageMonster(m, sk.multiplier);
        });
        const echo = sk.active?.echo;
        if (echo) {
          this.time.delayedCall(320, () => {
            if (p.life.status !== 'alive') return;
            this.vfx.crescent(p.feet, ang, sk.range * 1.1, liMuStyle, wangLinStyle);
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
        }, liMuStyle, wangLinStyle);
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
              }, liMuStyle, wangLinStyle);
            });
          });
        }
        break;
      }
      case 'han_bang_tran': {
        this.vfx.frostNova(p.feet, sk.range, liMuStyle, wangLinStyle);
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
    if(this.shared){this.shared.monsterHit(m);return;}
    const p = this.player;
    if (!m.alive || m.rootTimer > 0 || p.life.status !== 'alive') return;
    if (!gridLineClear(this.map.blocked,TILE,m,p,0,0)) return;
    if (m.distanceTo(p) > m.def.attackRange * 1.35) {
      this.damageText.show(p.x, p.y - 70, 'Né tránh', 'info');
      return;
    }
    const { stats } = gameStore.getState();
    const r = computeDamage({ atk: m.def.atk, def: stats.def, multiplier: 1, critRate: 0.08, critMul: 1.6,
      attackerRealm: realmIndexAtLevel(m.def.level), defenderRealm: gameStore.getState().player.realmIndex });
    if (p.takeHit(r.amount, r.crit, { x: m.x, y: m.y })) impact(this, p.x, p.y - 34, 0xff8a7a, r.crit);
  }

  onMonsterKilled(m: Monster) {
    if(this.shared){this.shared.killed(m);return;}
    this.rewardMonster(m);
  }
  rewardMonster(m:Monster, award?: SharedAward){
    if(!m.playerContribution)return;
    const s = gameStore.getState();
    s.addLog(`Đánh bại ${m.def.name}`, 'combat');
    if (m.def.boss) { s.recordBossVictory(); this.cameras.main.shake(500, 0.012); }
    const exp = award?.exp ?? killExp(m.def);
    this.damageText.show(m.x, m.y - 86, `+${exp} EXP`, 'info');
    s.gainExp(exp);
    s.questEvent({ type: 'kill', target: m.type });
    s.beastVictory(m.type);
    const drops = award?.drops ?? monsterDrops(m.def, !!this.map.arena);
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
  addSharedMonster(type:string,x:number,y:number,id:string){const m=this.spawnMonster(type,x,y);m.netId=id;return m;}
  showSpeech(text:string){
    const at=iso(this.player.x,this.player.y),bubble=this.add.text(at.x,at.y-150,text.slice(0,100),{fontSize:'12px',fontFamily:'Arial',color:'#183047',backgroundColor:'#f5ead7',padding:{x:9,y:6},wordWrap:{width:190},resolution:2}).setOrigin(.5,1).setDepth(95000);
    this.time.delayedCall(4500,()=>bubble.destroy());
  }
}
