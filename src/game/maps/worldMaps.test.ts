import { beforeEach, describe, expect, it } from 'vitest';
import { NEW_MAPS, PROLOGUE_ORDER, WORLD_QUESTS } from '../../data/world';
import { ITEMS, NPCS, QUESTS } from '../../data';
import { gameStore, createCharacter, newPlayer } from '../../store/gameStore';
import { getMap, MAP_IDS } from './index';
import { findPath } from '../systems/path';
import { herbNodes } from '../systems/immortal';
import { portalToward, questDestination, routeOnMap } from '../systems/questNav';
import { isChildhood } from '../systems/origin';
import { mapGateReason, portalGateReason } from '../systems/worldAccess';
import { deserialize, serialize } from '../systems/save';
import type { GameEvent, QuestLog } from '../systems/quest';

const unlocked: QuestLog = Object.fromEntries(Object.entries(QUESTS).map(([id, d]) => [id, { status: 'done', progress: d.objectives.map((o) => o.count) }]));
const context = { quests: unlocked, childhood: false };
beforeEach(() => gameStore.setState({ player: newPlayer(), quests: {}, mapId: 'dai_thua_vien', status: 'alive', logs: [], toasts: [], menu: null, dialogNpc: null }));

describe('seven authored world maps', () => {
  it('has seven distinct maps with reachable NPCs, interactions, herbs, monsters and gates', () => {
    expect(NEW_MAPS).toHaveLength(7);
    for (const def of NEW_MAPS) {
      const map = getMap(def.id), [sx, sy] = map.playerSpawn;
      expect(map.id).toBe(def.id);
      expect(map.decor.length, def.id).toBeGreaterThan(12);
      const grid = map.blocked.map((r) => r.slice());
      for (const npc of map.npcs) { expect(NPCS[npc.id], npc.id).toBeDefined(); expect(map.blocked[npc.y][npc.x], `${def.id} NPC ${npc.id} blocked`).toBe(false); grid[npc.y][npc.x] = true; }
      expect(grid[sy][sx], `${map.id} spawn`).toBe(false);
      for (const npc of map.npcs) expect(findPath(grid, sx, sy, npc.x, npc.y, 1).reached, `${def.id} NPC ${npc.id}`).toBe(true);
      for (const target of [...(map.points ?? []), ...herbNodes(map.id), ...map.monsters]) {
        expect(grid[target.y][target.x], `${def.id} blocked target ${target.x},${target.y}`).toBe(false);
        expect(findPath(grid, sx, sy, target.x, target.y).reached, `${def.id} target ${target.x},${target.y}`).toBe(true);
      }
      for (const portal of map.portals) {
        expect(MAP_IDS).toContain(portal.to);
        const [x, y, w, h] = portal.rect;
        expect(findPath(grid, sx, sy, x + Math.floor((w - 1) / 2), y + Math.floor((h - 1) / 2)).reached, `${def.id} portal ${portal.to}`).toBe(true);
        const next = getMap(portal.to);
        expect(next.blocked[portal.spawn[1]][portal.spawn[0]], `${def.id} arrival ${next.id}`).toBe(false);
        expect(next.portals.some((p) => p.to === map.id), `${map.id} return from ${next.id}`).toBe(true);
      }
    }
  });

  it('finds a first hop between every connected new map without hub fallback loops', () => {
    for (const a of [...NEW_MAPS.map((m) => m.id), 'dai_thua_vien']) for (const b of [...NEW_MAPS.map((m) => m.id), 'dai_thua_vien']) {
      if (a === b) continue;
      const visited = new Set<string>(); let current: string = a;
      while (current !== b) {
        expect(visited.has(current), `${a} -> ${b} cycle`).toBe(false); visited.add(current);
        const portal = portalToward(getMap(current), b, 5, context);
        expect(portal, `${current} -> ${b}`).not.toBeNull();
        current = portal!.to;
      }
    }
  });

  it('enforces farewell, admission and cave gates without blocking legacy characters', () => {
    const villageGate = getMap('vuong_gia_thon').portals[0];
    expect(portalGateReason(villageGate, { childhood: true, quests: {} })).toBeTruthy();
    expect(portalGateReason(villageGate, { childhood: false, quests: {} })).toBeNull();
    expect(mapGateReason(getMap('linh_son_tong'), { childhood: true, quests: {} })).toBeTruthy();
    expect(mapGateReason(getMap('linh_son_tong'), { childhood: false, quests: {} })).toBeNull();
    expect(mapGateReason(getMap('bi_canh_thach_linh'), { childhood: false, quests: {} })).toBeTruthy();
    expect(mapGateReason(getMap('bi_canh_thach_linh'), context)).toBeNull();
    expect(portalToward(getMap('vuong_gia_thon'), 'ngoai_mon', 1, { childhood: true, quests: {} })).toBeNull();
  });
});

describe('Thiet Tru prologue', () => {
  it('starts a fresh character in the village and progresses all ten quests into admission', () => {
    createCharacter('Vương Lâm', 'male');
    expect(gameStore.getState().mapId).toBe('vuong_gia_thon');
    expect(isChildhood(gameStore.getState().player)).toBe(true);
    expect(gameStore.getState().quests.main_0).toBeUndefined();
    for (const id of PROLOGUE_ORDER) {
      const s = gameStore.getState(); const def = QUESTS[id];
      expect(s.quests[id], `auto accept ${id}`).toBeDefined();
      for (const o of def.objectives) {
        let ev: GameEvent;
        if (o.type === 'talk') ev = { type: 'talk', npc: o.npc };
        else if (o.type === 'interact') ev = { type: 'interact', point: o.point };
        else if (o.type === 'gather') ev = { type: 'gather', item: o.item, qty: 1 };
        else if (o.type === 'enterZone') ev = { type: 'enterZone', zone: o.zone };
        else throw new Error('Unexpected prologue objective');
        for (let n = 0; n < o.count; n++) gameStore.getState().questEvent(ev);
      }
      if (def.turnIn) gameStore.getState().turnInQuest(id);
      expect(gameStore.getState().quests[id]?.status, id).toBe('done');
    }
    expect(isChildhood(gameStore.getState().player)).toBe(false);
    expect(gameStore.getState().quests.main_0?.status).toBe('active');
    expect(gameStore.getState().player.name).toBe('Vương Lâm');
  });

  it('prevents skipping prologue and preserves chapter, world interactions and discoveries through reload', () => {
    createCharacter('Đạo Hữu', 'female');
    gameStore.getState().acceptQuest('main_0');
    gameStore.getState().acceptQuest('village_9');
    expect(gameStore.getState().quests.main_0).toBeUndefined();
    expect(gameStore.getState().quests.village_9).toBeUndefined();
    const s = gameStore.getState();
    const data = deserialize(serialize({ player: { ...s.player, world: { interactions: { village_well: 2 }, discovered: ['vuong_gia_thon'] } }, quests: s.quests, mapId: s.mapId, pos: { x: 500, y: 500 } }));
    expect(data?.player.origin).toBe('vuong_gia_thon');
    expect(data?.player.world?.interactions.village_well).toBe(2);
    expect(data?.mapId).toBe('vuong_gia_thon');
  });

  it('provides valid routes for every new quest objective and valid reward items', () => {
    for (const [id, def] of Object.entries(WORLD_QUESTS)) {
      if (def.requires) expect(QUESTS[def.requires], id).toBeDefined();
      for (const [i, objective] of def.objectives.entries()) {
        const log: QuestLog = { ...unlocked, [id]: { status: 'active', progress: def.objectives.map((o, j) => j === i ? 0 : o.count) } };
        const start = objective.type === 'gather' && id.startsWith('village_') ? 'vuong_gia_thon' : 'dai_thua_vien';
        const nav = questDestination(id, log, 5, start);
        expect(nav.kind, id).toBe('go');
        if (nav.kind === 'go') {
          const m = getMap(start);
          expect(routeOnMap(m, { x: m.playerSpawn[0], y: m.playerSpawn[1] }, nav.stop, 5, context).kind, `${id} route`).not.toBe('fail');
        }
      }
      for (const item of Object.keys(def.rewards.items ?? {})) expect(ITEMS[item], item).toBeDefined();
    }
  });
});
