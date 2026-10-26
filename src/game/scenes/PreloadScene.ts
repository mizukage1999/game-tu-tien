import Phaser from 'phaser';
import { generateArt } from '../art/generate';
import { ITEM_SPRITE_ASSETS } from '../art/icons';
import { gameStore } from '../../store/gameStore';
import { getMap } from '../maps';
import { buildImmortalArt } from '../art/immortal';
import { COURTYARD_ATLAS, registerCourtyardFrames } from '../art/courtyard';
import { WORLD_ATLASES, registerWorldArt } from '../art/world';
import { COHESION_ATLASES, registerCohesiveArt } from '../art/cohesion';
import { EXPANSION_ATLASES, registerExpansionArt } from '../art/expansionArt';
import { WANG_EFFECT_ART } from '../../data/wangSkills';
import { buildWangSheet, WANG_CELL } from '../art/wangEffects';
import { registerCultivationIcons, registerChildProfile } from '../art/skillIcons';
import { registerInventoryIcons } from '../art/inventoryIcons';
import { VILLAGE_ATLASES, registerVillageArt } from '../art/village';
import { WORLD_STYLE_ATLASES, registerWorldStyle } from '../art/worldStyle';
import { HERO_SHEETS, registerHeroes } from '../art/heroes';
import { ROSTER_SOURCE, ROSTER_POSES_URL, registerRosterArt, registerHeroSpells } from '../art/heroRoster';
import { HEROES } from '../../data/heroes';
import { SCHOOL_ART, spellSource } from '../../data/heroSpellArt';
import { BESTIARY_SHEETS, registerMonsterArt } from '../art/monsterArt';
import { DIRECTIONAL_SOURCES, registerDirectionalHeroes } from '../art/directionalHeroes';
import { REALM_CREST_TEXTURE } from '../entities/RealmNameplate';

interface AtlasEntry {
  atlas: string;
  json: string;
}

/**
 * Loads optional real art listed in `public/assets/sprites/manifest.json`
 * (e.g. `{ "player": { "atlas": "player.png", "json": "player.json" } }`).
 * Frames must be named `<anim>_<dir>_<index>` (see src/data/animations.json).
 * Anything not provided is generated procedurally.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload() {
    this.load.spritesheet(REALM_CREST_TEXTURE,'/assets/ui/cultivation/realm-crests-v1.png',{frameWidth:512,frameHeight:256});
    for(const name of DIRECTIONAL_SOURCES)this.load.image(`hero-v8-${name}-source`,`/assets/heroes-v8/${name}.png`);
    this.load.image(ROSTER_SOURCE, ROSTER_POSES_URL);
    for (const hero of HEROES) this.load.image(spellSource(hero.id), `${SCHOOL_ART}/${hero.id}.png`);
    for (const sheet of BESTIARY_SHEETS) this.load.image(`bestiary-${sheet}-source`, `assets/monsters/${sheet}-v6.png`);
    for (const key of HERO_SHEETS) this.load.image(`${key}-source`, `assets/sprites/${key}.png`);
    this.load.image('inventory-item-icons','/assets/ui/cultivation/bag-items-v1.png');
    this.load.image('cult-skill-icons','/assets/ui/cultivation/skill-icons-alpha-v2.png');
    for (const art of Object.values(WANG_EFFECT_ART)) this.load.image(`${art.texture}-source`, art.url);
    for (const key of WORLD_ATLASES) this.load.image(key, `assets/maps/${key}.png`);
    for (const key of COHESION_ATLASES) this.load.image(key, `assets/maps/${key}.png`);
    for(const key of EXPANSION_ATLASES)this.load.image(key,`assets/maps/${key}.png`);
    for (const key of VILLAGE_ATLASES) this.load.image(key, `assets/maps/${key}.png`);
    for (const key of WORLD_STYLE_ATLASES) this.load.image(key, `assets/maps/${key}.png`);
    this.load.image('child-source', 'assets/maps/thiet-tru.png');
    this.load.image(COURTYARD_ATLAS, 'assets/maps/courtyard-architecture.png');
    this.load.on(Phaser.Loader.Events.PROGRESS, (progress: number) => this.game.events.emit('assets-progress', progress));
    for (const [id, url] of Object.entries(ITEM_SPRITE_ASSETS)) {
      this.load.image(`item-sprite-${id}`, url);
    }
    this.load.json('sprite-manifest', 'assets/sprites/manifest.json');
    this.load.once(`${Phaser.Loader.Events.FILE_COMPLETE}-json-sprite-manifest`, () => {
      const manifest = (this.cache.json.get('sprite-manifest') ?? {}) as Record<string, AtlasEntry>;
      for (const [key, entry] of Object.entries(manifest)) {
        if (key.startsWith('_')) continue;
        if(['player','player_male','li_mu_fx','wang_lin_fx'].includes(key))continue;
        this.load.atlas(key, `assets/sprites/${entry.atlas}`, `assets/sprites/${entry.json}`);
      }
    });
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      console.warn(`[assets] không tải được ${file.key}, dùng đồ họa tạo sẵn.`);
    });
  }

  create() {
    if(this.textures.exists('inventory-item-icons'))registerInventoryIcons(this.textures.get('inventory-item-icons').getSourceImage() as HTMLImageElement);
    for (const art of Object.values(WANG_EFFECT_ART)) {
      if (!this.textures.exists(`${art.texture}-source`)) continue;
      const source = this.textures.get(`${art.texture}-source`).getSourceImage() as HTMLImageElement;
      const sheet = buildWangSheet(art, source);
      const texture = this.textures.addCanvas(art.texture, sheet)!;
      for (let i = 0; i < 6; i++) texture.add(i, 0, i * WANG_CELL, 0, WANG_CELL, WANG_CELL);
    }
    registerCourtyardFrames(this);
    registerWorldArt(this);
    registerCohesiveArt(this);
    registerExpansionArt(this);
    registerHeroes(this);
    registerRosterArt(this);
    registerDirectionalHeroes(this);
    registerHeroSpells(this);
    registerMonsterArt(this);
    registerVillageArt(this);
    registerWorldStyle(this);
    if(this.textures.exists('cult-skill-icons'))registerCultivationIcons(this.textures.get('cult-skill-icons').getSourceImage() as HTMLImageElement);
    for(const [sex,key] of [['male','thiet_tru'],['female','mu_uyen_child']]) {
      if(!this.textures.exists(key))continue;
      const frame=this.textures.get(key).get('idle_side_0');
      registerChildProfile(sex,frame.source.image as CanvasImageSource,frame.cutX,frame.cutY,frame.cutWidth,frame.cutHeight);
    }
    generateArt(this);
    buildImmortalArt(this);
    const s = gameStore.getState();
    this.game.events.emit('assets-ready');
    // never boot straight into a dungeon (that would start a run without spending an attempt)
    if (getMap(s.mapId).arena) {
      this.scene.start('World', { mapId: s.dungeonReturn?.mapId ?? 'dai_thua_vien', pos: s.dungeonReturn?.pos ?? null });
      return;
    }
    this.scene.start('World', { mapId: s.mapId, pos: s.spawnPos });
  }
}
