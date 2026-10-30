import Phaser from 'phaser';
import { addStaticTexture } from './staticTexture';
import { gameStore } from '../../store/gameStore';
import { optimizedAsset } from '../../data/assetDelivery';
import { getMap } from '../maps';
import { heroFor, type HeroId } from '../../data/heroes';
import { spellAsset, spellSource, spellTexture } from '../../data/heroSpellArt';
import { WANG_EFFECT_ART, WANG_ICON_ATLAS, WANG_RITUAL_ICON_ATLAS, WANG_GATE_ICON, wangSheetLayout } from '../../data/wangSkills';
import { generateArt, registerCharacterArt } from './generate';
import { buildImmortalArt } from './immortal';
import { COURTYARD_ATLAS, registerCourtyardFrames } from './courtyard';
import { WORLD_ATLASES, registerWorldArt } from './world';
import { COHESION_ATLASES, registerCohesiveArt, registerVillageReferenceProps } from './cohesion';
import { EXPANSION_ATLASES, registerExpansionArt } from './expansionArt';
import { VILLAGE_ATLASES, registerVillageArt } from './village';
import { WORLD_STYLE_ATLASES, registerWorldStyle } from './worldStyle';
import { BESTIARY_SHEETS, registerMonsterArt } from './monsterArt';
import { DIRECTIONAL_SOURCES, directionalArt, ensureDirectionalHero, registerDirectionalHeroes } from './directionalHeroes';
import { registerHeroSpells } from './heroRoster';
import { registerCultivationIcons, registerChildProfile } from './skillIcons';
import { registerInventoryIcons } from './inventoryIcons';
import { buildWangSheet, registerWangIcons, registerWangGateIcon } from './wangEffects';
import { ITEM_SPRITE_ASSETS } from './icons';
import { REALM_CREST_TEXTURE } from '../entities/RealmNameplate';
import { NPCS } from '../../data';
import { usesChildSprite } from '../systems/origin';
import { playerArt } from '../systems/character';
import { NPC_SPRITES } from '../systems/npcArt';
import { mapMonsterArt, monsterSheets } from '../systems/mapAssetPlan';

const pending = new WeakMap<Phaser.Scene, Map<string, () => void>>();
const mapIds = new WeakMap<Phaser.Scene, string>();
const spellLoads = new WeakMap<Phaser.Game, Map<HeroId, Promise<boolean>>>();
function releaseSources(scene: Phaser.Scene, keys: readonly string[]) {
  for (const key of keys) if (scene.textures.exists(key)) scene.textures.remove(key);
}

/** Large character/monster libraries are prepared only for maps that use them. */
export function queueMapAssets(scene: Phaser.Scene, mapId: string) {
  const map = getMap(mapId),
    builders = new Map<string, () => void>();
  pending.set(scene, builders);
  mapIds.set(scene, mapId);
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
      image('wang-signature-icons-source', WANG_ICON_ATLAS);
      image('wang-ritual-icons-source', WANG_RITUAL_ICON_ATLAS);
      image('wang-gate-icon-source', WANG_GATE_ICON);
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
        const texture = addStaticTexture(scene, art.texture, sheet)!;
        const { frames, columns, cell } = wangSheetLayout(art);
        for (let i = 0; i < frames; i++) texture.add(i, 0, i % columns * cell, Math.floor(i / columns) * cell, cell, cell);
        scene.textures.remove(`${art.texture}-source`);
      }
      if (scene.textures.exists('wang-signature-icons-source')) {
        registerWangIcons(scene.textures.get('wang-signature-icons-source').getSourceImage() as HTMLImageElement);
        scene.textures.remove('wang-signature-icons-source');
      }
      registerCourtyardFrames(scene);
      if (scene.textures.exists('wang-ritual-icons-source')) {
        registerWangIcons(scene.textures.get('wang-ritual-icons-source').getSourceImage() as HTMLImageElement,true);
        scene.textures.remove('wang-ritual-icons-source');
      }
      registerVillageReferenceProps(scene);
      if (scene.textures.exists('wang-gate-icon-source')) {
        registerWangGateIcon(scene.textures.get('wang-gate-icon-source').getSourceImage() as HTMLImageElement);
        scene.textures.remove('wang-gate-icon-source');
      }
      registerWorldArt(scene);
      const player = gameStore.getState().player;
      registerDirectionalHeroes(scene, [{ id: heroFor(player).id, child: usesChildSprite(player) }]);
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
      // These sheets have become small NPC textures / DOM icon URLs. No actor
      // renders the original sheets, so retaining their GPU copies is wasteful.
      releaseSources(scene, ['inventory-item-icons', 'cult-skill-icons', 'child-source', 'world-people']);
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
      () => {
        registerCohesiveArt(scene);
        releaseSources(scene, ['city-people-v2', 'travel-people-v2']);
      },
    );
    // v8 directional heroes replace the retired simple and v5/v7 pose atlases.
    group(
      'actors',
      () =>
        maps(
          EXPANSION_ATLASES.filter((key) => key !== 'hero-wang-simple' && key !== 'hero-li-simple'),
        ),
      () => {
        registerExpansionArt(scene);
        releaseSources(scene, ['mu-uyen-child', 'wanderers', 'spirit-companions', 'dungeon-bosses-v3']);
      },
    );
  }
  if (map.monsters.length || map.arena) {
    const arts = mapMonsterArt(map), sheets = monsterSheets(new Set([...arts].filter(art => !scene.textures.exists(art))));
    group(
      'items',
      () => {
        for (const [id, url] of Object.entries(ITEM_SPRITE_ASSETS)) image(`item-sprite-${id}`, url);
      },
      () => {},
    );
    group(
      `monsters:${map.id}`,
      () =>
        sheets.forEach((sheet) =>
          image(`bestiary-${sheet}-source`, `/assets/monsters/${sheet}-v6.png`),
        ),
      () => {
        registerMonsterArt(scene, arts);
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
      () => image(spellSource(hero), spellAsset(hero)),
      () => registerHeroSpells(scene),
    );
  return count;
}

export function finishMapAssets(scene: Phaser.Scene) {
  const builders = pending.get(scene);
  for (const [id, build] of builders ?? []) {
    build();
    scene.registry.set(`art-ready:${id}`, true);
  }
  registerWorldStyle(scene);
  const player = gameStore.getState().player, hero = heroFor(player).id, child = usesChildSprite(player);
  ensureDirectionalHero(scene, hero, child);
  const required = new Set<string>();
  if (!scene.textures.exists(directionalArt(hero, child))) required.add(playerArt(player.sex));
  const map = getMap(mapIds.get(scene) ?? gameStore.getState().mapId);
  for (const npc of map.npcs) {
    if (!scene.textures.exists(NPC_SPRITES[npc.id]?.texture ?? '')) required.add(NPCS[npc.id].art);
  }
  for (const art of mapMonsterArt(map)) required.add(art);
  if (map.monsters.length || map.arena) { required.add('beast_snow'); required.add('beast_frost_king'); }
  if (!scene.registry.get('art-ready:procedural')) {
    generateArt(scene, required);
    buildImmortalArt(scene);
    scene.registry.set('art-ready:procedural', true);
  } else registerCharacterArt(scene, required);
  pending.delete(scene);
  mapIds.delete(scene);
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
    scene.load.image(key, optimizedAsset(spellAsset(hero)));
    if (!scene.load.isLoading()) scene.load.start();
  });
  loads.set(hero, promise);
  return promise;
}
