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
    for (const art of Object.values(WANG_EFFECT_ART)) this.load.image(`${art.texture}-source`, art.url);
    for (const key of WORLD_ATLASES) this.load.image(key, `assets/maps/${key}.png`);
    for (const key of COHESION_ATLASES) this.load.image(key, `assets/maps/${key}.png`);
    for(const key of EXPANSION_ATLASES)this.load.image(key,`assets/maps/${key}.png`);
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
