import Phaser from 'phaser';
import { gameStore } from '../../store/gameStore';
import { optimizedAsset } from '../../data/assetDelivery';
import { getMap } from '../maps';
import { heroFor, type HeroId } from '../../data/heroes';
import { SCHOOL_ART, spellSource, spellTexture } from '../../data/heroSpellArt';
import { WANG_EFFECT_ART } from '../../data/wangSkills';
import { generateArt, registerCharacterArt } from './generate';
import { buildImmortalArt } from './immortal';
import { COURTYARD_ATLAS, registerCourtyardFrames } from './courtyard';
import { WORLD_ATLASES, registerWorldArt } from './world';
import { COHESION_ATLASES, registerCohesiveArt, registerVillageReferenceProps } from './cohesion';
import { EXPANSION_ATLASES, registerExpansionArt } from './expansionArt';
import { VILLAGE_ATLASES, registerVillageArt } from './village';
import { WORLD_STYLE_ATLASES, registerWorldStyle } from './worldStyle';
import { BESTIARY_SHEETS, registerMonsterArt } from './monsterArt';
import { DIRECTIONAL_SOURCES, registerDirectionalHeroes } from './directionalHeroes';
import { registerHeroSpells } from './heroRoster';
import { registerCultivationIcons, registerChildProfile } from './skillIcons';
import { registerInventoryIcons } from './inventoryIcons';
import { buildWangSheet, WANG_CELL } from './wangEffects';
import { ITEM_SPRITE_ASSETS } from './icons';
import { REALM_CREST_TEXTURE } from '../entities/RealmNameplate';

const pending = new WeakMap<Phaser.Scene, Map<string, () => void>>();
const spellLoads = new WeakMap<Phaser.Game, Map<HeroId, Promise<boolean>>>();

/** Large character/monster libraries are prepared only for maps that use them. */
export function queueMapAssets(scene: Phaser.Scene, mapId: string) {
  const map = getMap(mapId),
    builders = new Map<string, () => void>();
  pending.set(scene, builders);
  let count = 0;
  const image = (key: string, url: string) => {
    if (!scene.textures.exists(key)) {
      scene.load.image(key, optimizedAsset(url));
      count++;
    }
  };
  const maps = (keys: readonly string[]) =>
    keys.forEach((key) => image(key, `/assets/maps/${key}.png`));
  const group = (id: string, queue: () => void, build: () => void) => {
    if (scene.registry.get(`art-ready:${id}`)) return;
    queue();
    builders.set(id, build);
  };
  group(
    'core',
    () => {
      scene.load.spritesheet(
        REALM_CREST_TEXTURE,
        optimizedAsset('/assets/ui/cultivation/realm-crests-v1.png'),
        {
          frameWidth: 512,
          frameHeight: 256,
        },
      );
      count++;
      maps(WORLD_ATLASES);
      maps([COURTYARD_ATLAS]);
      maps(WORLD_STYLE_ATLASES);
      image('child-source', '/assets/maps/thiet-tru.png');
      image('inventory-item-icons', '/assets/ui/cultivation/bag-items-v1.png');
      image('cult-skill-icons', '/assets/ui/cultivation/skill-icons-alpha-v2.png');
      for (const id of ['linh_thach', 'linh_khi', 'hoi_xuan_dan', 'nhan_bac', 'kiem_pho'])
        image(`item-sprite-${id}`, ITEM_SPRITE_ASSETS[id]);
      for (const art of Object.values(WANG_EFFECT_ART)) image(`${art.texture}-source`, art.url);
      for (const name of DIRECTIONAL_SOURCES)
        image(`hero-v8-${name}-source`, `/assets/heroes-v8/${name}.png`);
      scene.load.json('sprite-manifest', '/assets/sprites/manifest.json');
      count++;
      scene.load.once(`${Phaser.Loader.Events.FILE_COMPLETE}-json-sprite-manifest`, () => {
        const manifest = scene.cache.json.get('sprite-manifest') ?? {};
        for (const [key, value] of Object.entries(manifest)) {
          if (
            key.startsWith('_') ||
            ['player', 'player_male', 'li_mu_fx', 'wang_lin_fx'].includes(key)
          )
            continue;
          const entry = value as { atlas: string; json: string };
          scene.load.atlas(
            key,
            optimizedAsset(`/assets/sprites/${entry.atlas}`),
            `/assets/sprites/${entry.json}`,
          );
        }
      });
    },
    () => {
      if (scene.textures.exists('inventory-item-icons'))
        registerInventoryIcons(
          scene.textures.get('inventory-item-icons').getSourceImage() as HTMLImageElement,
        );
      for (const art of Object.values(WANG_EFFECT_ART)) {
        if (!scene.textures.exists(`${art.texture}-source`)) continue;
        const sheet = buildWangSheet(
          art,
          scene.textures.get(`${art.texture}-source`).getSourceImage() as HTMLImageElement,
        );
        const texture = scene.textures.addCanvas(art.texture, sheet)!;
        for (let i = 0; i < 6; i++) texture.add(i, 0, i * WANG_CELL, 0, WANG_CELL, WANG_CELL);
        scene.textures.remove(`${art.texture}-source`);
      }
      registerCourtyardFrames(scene);
      registerVillageReferenceProps(scene);
      registerWorldArt(scene);
      registerDirectionalHeroes(scene);
      if (scene.textures.exists('cult-skill-icons'))
        registerCultivationIcons(
          scene.textures.get('cult-skill-icons').getSourceImage() as HTMLImageElement,
        );
      for (const [sex, key] of [
        ['male', 'thiet_tru'],
        ['female', 'mu_uyen_child'],
      ]) {
        if (!scene.textures.exists(key)) continue;
        const frame = scene.textures.get(key).get('idle_side_0');
        registerChildProfile(
          sex,
          frame.source.image as CanvasImageSource,
          frame.cutX,
          frame.cutY,
          frame.cutWidth,
          frame.cutHeight,
        );
      }
    },
  );
  if (map.id === 'vuong_gia_thon')
    group(
      'village',
      () => maps(VILLAGE_ATLASES),
      () => registerVillageArt(scene),
    );
  else {
    group(
      'cities',
      () => maps(COHESION_ATLASES),
      () => registerCohesiveArt(scene),
    );
    // v8 directional heroes replace the retired simple and v5/v7 pose atlases.
    group(
      'actors',
      () =>
        maps(
          EXPANSION_ATLASES.filter((key) => key !== 'hero-wang-simple' && key !== 'hero-li-simple'),
        ),
      () => registerExpansionArt(scene),
    );
  }
  if (map.monsters.length || map.arena) {
    group(
      'items',
      () => {
        for (const [id, url] of Object.entries(ITEM_SPRITE_ASSETS)) image(`item-sprite-${id}`, url);
      },
      () => {},
    );
    group(
      'monsters',
      () =>
        BESTIARY_SHEETS.forEach((sheet) =>
          image(`bestiary-${sheet}-source`, `/assets/monsters/${sheet}-v6.png`),
        ),
      () => {
        registerMonsterArt(scene);
        for (const sheet of BESTIARY_SHEETS)
          if (scene.textures.exists(`bestiary-${sheet}-source`))
            scene.textures.remove(`bestiary-${sheet}-source`);
      },
    );
  }
  const hero = heroFor(gameStore.getState().player).id;
  if (!scene.textures.exists(spellTexture(hero)))
    group(
      `spell:${hero}`,
      () => image(spellSource(hero), `${SCHOOL_ART}/${hero}.png`),
      () => registerHeroSpells(scene),
    );
  return count;
}

export function finishMapAssets(scene: Phaser.Scene) {
  const builders = pending.get(scene);
  if (!builders?.size) return;
  for (const [id, build] of builders) {
    build();
    scene.registry.set(`art-ready:${id}`, true);
  }
  registerWorldStyle(scene);
  if (!scene.registry.get('art-ready:procedural')) {
    generateArt(scene);
    buildImmortalArt(scene);
    scene.registry.set('art-ready:procedural', true);
  } else registerCharacterArt(scene);
  pending.delete(scene);
}

/** Peers can arrive from any school; load that school's effects once on arrival. */
export function ensureHeroSpell(scene: Phaser.Scene, hero: HeroId): Promise<boolean> {
  if (scene.textures.exists(spellTexture(hero))) return Promise.resolve(true);
  if (scene.textures.exists(spellSource(hero))) {
    registerHeroSpells(scene);
    return Promise.resolve(scene.textures.exists(spellTexture(hero)));
  }
  let loads = spellLoads.get(scene.game);
  if (!loads) {
    loads = new Map();
    spellLoads.set(scene.game, loads);
  }
  const existing = loads.get(hero);
  if (existing) return existing;
  const promise = new Promise<boolean>((resolve) => {
    const key = spellSource(hero),
      cleanup = () => {
        scene.events.off(Phaser.Scenes.Events.SHUTDOWN, stopped);
        scene.load.off(`${Phaser.Loader.Events.FILE_COMPLETE}-image-${key}`, done);
        scene.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, failed);
      },
      stopped = () => {
        cleanup();
        loads!.delete(hero);
        resolve(false);
      },
      done = () => {
        cleanup();
        registerHeroSpells(scene);
        resolve(scene.textures.exists(spellTexture(hero)));
      },
      failed = (file: Phaser.Loader.File) => {
        if (file.key !== key) return;
        cleanup();
        loads!.delete(hero);
        resolve(false);
      };
    scene.load.once(`${Phaser.Loader.Events.FILE_COMPLETE}-image-${key}`, done);
    scene.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, failed);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, stopped);
    scene.load.image(key, optimizedAsset(`${SCHOOL_ART}/${hero}.png`));
    if (!scene.load.isLoading()) scene.load.start();
  });
  loads.set(hero, promise);
  return promise;
}
