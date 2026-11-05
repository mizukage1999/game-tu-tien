import Phaser from 'phaser';
import { addStaticTexture } from './staticTexture';
import { gameStore } from '../../store/gameStore';
import { optimizedAsset } from '../../data/assetDelivery';
import { getMap } from '../maps';
import { heroFor, type HeroId } from '../../data/heroes';
import { spellAsset, spellSource, spellTexture } from '../../data/heroSpellArt';
import {
  WANG_EFFECT_ART,
  WANG_ICON_ATLAS,
  WANG_RITUAL_ICON_ATLAS,
  WANG_GATE_ICON,
  wangSheetLayout,
} from '../../data/wangSkills';
import { generateArt, registerCharacterArt } from './generate';
import { buildImmortalArt } from './immortal';
import { COURTYARD_ATLAS, registerCourtyardFrames } from './courtyard';
import { registerWorldArt } from './world';
import { COHESION_ATLASES, registerCohesiveArt, registerVillageReferenceProps } from './cohesion';
import { EXPANSION_ATLASES, registerExpansionArt } from './expansionArt';
import { registerWorldStyle } from './worldStyle';
import { BESTIARY_SHEETS, registerMonsterArt } from './monsterArt';
import {
  directionalArt,
  ensureDirectionalHero,
  directionalAsset,
  registerDirectionalHeroes,
} from './directionalHeroes';
import { registerHeroSpells } from './heroRoster';
import { buildWangSheet, registerWangIcons, registerWangGateIcon } from './wangEffects';
import { ITEM_SPRITE_ASSETS } from './icons';
import { REALM_CREST_ASSET, REALM_CREST_TEXTURE, REALM_CREST_CELL } from './realmCrests';
import { createSkillFxAnimations } from './fx';
import { NPCS } from '../../data';
import { usesChildSprite } from '../systems/origin';
import { playerArt } from '../systems/character';
import { NPC_SPRITES } from '../systems/npcArt';
import { mapMonsterArt, monsterSheets, openingMapPlan } from '../systems/mapAssetPlan';
import { ensureImage } from './lazyImage';
import type { SkillId } from '../../data';
import { wangEffect, type WangEffectArt } from '../../data/wangSkills';
import { warmedImage, clearStartupWarmCache } from './startupCache';
import startup from '../../data/startupAssets.json';
import {
  registerVillageStartup,
  VILLAGE_STARTUP_TEXTURE,
  villageGroundTexture,
  villageNpcFrame,
} from './villageStartup';

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
  const player = gameStore.getState().player;
  const plan = openingMapPlan(mapId, usesChildSprite(player));
  const village = mapId === 'vuong_gia_thon';
  pending.set(scene, builders);
  mapIds.set(scene, mapId);
  let count = 0;
  const image = (key: string, url: string) => {
    if (!scene.textures.exists(key)) {
      const cached = warmedImage(url);
      if (cached) {
        scene.textures.addImage(key, cached);
        return;
      }
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
  if (plan.combat && !scene.textures.exists(REALM_CREST_TEXTURE)) {
    scene.load.spritesheet(REALM_CREST_TEXTURE, optimizedAsset(REALM_CREST_ASSET), {
      frameWidth: REALM_CREST_CELL.width,
      frameHeight: REALM_CREST_CELL.height,
    });
    count++;
  }
  group(
    'core',
    () => {
      for (const id of ['linh_thach', 'linh_khi', 'hoi_xuan_dan', 'nhan_bac', 'kiem_pho'])
        image(`item-sprite-${id}`, ITEM_SPRITE_ASSETS[id]);
    },
    () => {},
  );
  if (!village)
    group(
      'courtyard',
      () => maps([COURTYARD_ATLAS]),
      () => {
        registerCourtyardFrames(scene);
        registerVillageReferenceProps(scene);
      },
    );
  if (plan.combat)
    group(
      'combat-atlases',
      () => {
        scene.load.json('sprite-manifest', '/assets/sprites/manifest.json');
        count++;
        scene.load.once(`${Phaser.Loader.Events.FILE_COMPLETE}-json-sprite-manifest`, () => {
          const manifest = scene.cache.json.get('sprite-manifest') ?? {};
          for (const [key, value] of Object.entries(manifest)) {
            if (
              key.startsWith('_') ||
              ['player', 'player_male', 'li_mu_fx', 'wang_lin_fx', 'beast_snow'].includes(key) ||
              scene.textures.exists(key)
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
      () => createSkillFxAnimations(scene),
    );
  group(
    `world:${map.id === 'vuong_gia_thon' ? 'village' : 'all'}`,
    () => maps(plan.world),
    () => {
      registerWorldArt(scene);
      releaseSources(scene, ['child-source', 'world-people']);
    },
  );
  const child = usesChildSprite(player),
    hero = heroFor(player).id;
  group(
    `directions:${hero}:${child ? 'child' : 'adult'}`,
    () => image(directionalArt(hero, child), directionalAsset(hero, child)),
    () => registerDirectionalHeroes(scene, [{ id: hero, child }]),
  );
  if (plan.combat && hero === 'wang_lam')
    group(
      'wang-combat',
      () => {
        for (const art of Object.values(WANG_EFFECT_ART)) image(`${art.texture}-source`, art.url);
        image('wang-signature-icons-source', WANG_ICON_ATLAS);
        image('wang-ritual-icons-source', WANG_RITUAL_ICON_ATLAS);
        image('wang-gate-icon-source', WANG_GATE_ICON);
      },
      () => {
        for (const art of Object.values(WANG_EFFECT_ART)) prepareWangEffect(scene, art);
        for (const [key, ritual] of [
          ['wang-signature-icons-source', false],
          ['wang-ritual-icons-source', true],
        ] as const) {
          if (!scene.textures.exists(key)) continue;
          registerWangIcons(scene.textures.get(key).getSourceImage() as HTMLImageElement, ritual);
          scene.textures.remove(key);
        }
        if (scene.textures.exists('wang-gate-icon-source')) {
          registerWangGateIcon(
            scene.textures.get('wang-gate-icon-source').getSourceImage() as HTMLImageElement,
          );
          scene.textures.remove('wang-gate-icon-source');
        }
      },
    );
  if (village)
    group(
      'village-startup',
      () => {
        image(VILLAGE_STARTUP_TEXTURE, startup.urls.village);
        maps(['village-dawn-v3']);
      },
      () => registerVillageStartup(scene),
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
        releaseSources(scene, [
          'mu-uyen-child',
          'wanderers',
          'spirit-companions',
          'dungeon-bosses-v3',
        ]);
      },
    );
  }
  if (village)
    for (const page of startup.groundPages)
      image(villageGroundTexture(page.key), (startup.urls as Record<string, string>)[page.key]);
  if (map.monsters.length || map.arena) {
    const arts = mapMonsterArt(map),
      sheets = monsterSheets(new Set([...arts].filter((art) => !scene.textures.exists(art))));
    group(
      'items',
      () => {
        for (const [id, url] of Object.entries(ITEM_SPRITE_ASSETS)) image(`item-sprite-${id}`, url);
        if (!scene.textures.exists('beast_snow')) {
          scene.load.atlas(
            'beast_snow',
            optimizedAsset('/assets/sprites/beast-snow.png'),
            '/assets/sprites/beast-snow.json',
          );
          count++;
        }
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
  if (plan.combat && !scene.textures.exists(spellTexture(hero)))
    group(
      `spell:${hero}`,
      () => image(spellSource(hero), spellAsset(hero)),
      () => registerHeroSpells(scene),
    );
  return count;
}

function prepareWangEffect(scene: Phaser.Scene, art: WangEffectArt) {
  const source = `${art.texture}-source`;
  if (!scene.textures.exists(source) || scene.textures.exists(art.texture)) return;
  const sheet = buildWangSheet(
    art,
    scene.textures.get(source).getSourceImage() as HTMLImageElement,
  );
  const texture = addStaticTexture(scene, art.texture, sheet)!;
  const { frames, columns, cell } = wangSheetLayout(art);
  for (let i = 0; i < frames; i++)
    texture.add(i, 0, (i % columns) * cell, Math.floor(i / columns) * cell, cell, cell);
  scene.textures.remove(source);
}

/** A visitor can cast a Wang spell even when this client's opening map never needed it. */
export function ensureWangEffect(scene: Phaser.Scene, id: SkillId) {
  const art = wangEffect(id);
  if (!art) return Promise.resolve(false);
  return ensureImage(
    scene,
    `${art.texture}-source`,
    art.url,
    () => scene.textures.exists(art.texture),
    () => prepareWangEffect(scene, art),
  );
}

export function finishMapAssets(scene: Phaser.Scene) {
  const builders = pending.get(scene);
  for (const [id, build] of builders ?? []) {
    build();
    scene.registry.set(`art-ready:${id}`, true);
  }
  registerWorldStyle(scene);
  const player = gameStore.getState().player,
    hero = heroFor(player).id,
    child = usesChildSprite(player);
  ensureDirectionalHero(scene, hero, child);
  const required = new Set<string>();
  if (!scene.textures.exists(directionalArt(hero, child))) required.add(playerArt(player.sex));
  const map = getMap(mapIds.get(scene) ?? gameStore.getState().mapId);
  if (map.id === 'vuong_gia_thon') registerVillageStartup(scene);
  for (const npc of map.npcs) {
    if (
      map.id === 'vuong_gia_thon' &&
      scene.textures.exists(VILLAGE_STARTUP_TEXTURE) &&
      villageNpcFrame(npc.id)
    )
      continue;
    if (!scene.textures.exists(NPC_SPRITES[npc.id]?.texture ?? '')) required.add(NPCS[npc.id].art);
  }
  for (const art of mapMonsterArt(map)) required.add(art);
  if (map.monsters.length || map.arena) {
    required.add('beast_snow');
    required.add('beast_frost_king');
  }
  if (!scene.registry.get('art-ready:procedural')) {
    generateArt(scene, required);
    buildImmortalArt(scene);
    scene.registry.set('art-ready:procedural', true);
  } else registerCharacterArt(scene, required);
  pending.delete(scene);
  mapIds.delete(scene);
  clearStartupWarmCache();
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
