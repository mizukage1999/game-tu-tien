import { afterEach, expect, it, vi } from 'vitest';
import { DUNGEONS, MONSTERS } from '../../data';
import { WORLD_QUESTS, PROLOGUE_ORDER } from '../../data/world';
import { gameStore, newPlayer } from '../../store/gameStore';
import { contributionAwards, recordContribution } from './contribution';
import { activityDay } from './activityDay';
import { adventureAction, sectEvent } from './adventure';
import { lifeProgress, performLifeAction, advanceLife, DAY_MS } from './life';
import { herbNodes, herbYield } from './immortal';
import { FIELD_BANDS } from './scale';
import { getMap } from '../maps';
import { findPath } from './path';
import { expToNext, breakthroughPillCount, addExp, playerStats } from './progression';
import { isSanctuary, mayPk, parseWorldEvent } from '../../net/worldProtocol';
import { resolvePartyRun, recoverPartyRun, parsePartyDungeonPacket } from './partyDungeon';

const before = gameStore.getState();
afterEach(() => {
  vi.useRealTimers();
  gameStore.setState(before);
});

it('shares credit without copying loot, excludes spectators/stale fighters, and caps overkill', () => {
  let entries = recordContribution([], 'a', 900, 1000, 10000);
  entries = recordContribution(entries, 'b', 10000, 100, 11000);
  entries = recordContribution(entries, 'old', 500, 1000, 0);
  const actors = ['a', 'b', 'old', 'idle'].map((key) => ({
    key,
    x: 100,
    y: 100,
    alive: true,
    party: 'team',
  }));
  const drops = [
    { item: 'weapon_red', qty: 1 },
    { item: 'linh_chi', qty: 7 },
  ];
  const awards = contributionAwards(
    entries,
    actors,
    { x: 100, y: 100, hp: 1000 },
    1000,
    drops,
    40000,
    () => 0,
  );
  expect(entries.find((e) => e.key === 'b')?.damage).toBe(100);
  expect(awards.map((a) => a.to)).toEqual(['a', 'b']);
  expect(awards[0].exp).toBeGreaterThan(awards[1].exp);
  expect(awards.reduce((sum, a) => sum + a.exp, 0)).toBe(1100);
  for (const drop of drops)
    expect(
      awards
        .flatMap((a) => a.drops)
        .filter((d) => d.item === drop.item)
        .reduce((n, d) => n + d.qty, 0),
    ).toBe(drop.qty);
  expect(
    contributionAwards(
      entries,
      actors.map((a) => ({ ...a, x: 10000 })),
      { x: 100, y: 100, hp: 1000 },
      1000,
      drops,
      40000,
    ),
  ).toEqual([]);
  expect(
    parseWorldEvent({ t: 'kill', id: 'm:1', generation: 0, killer: 'a', awards }),
  ).not.toBeNull();
  expect(
    parseWorldEvent({
      t: 'kill',
      id: 'm:1',
      generation: 0,
      killer: 'a',
      awards: [...awards, awards[0]],
    }),
  ).toBeNull();
});

it('safeguards quest hubs while preserving field PK mode rules', () => {
  for (const mapId of [
    'vuong_gia_thon',
    'ngoai_mon',
    'dai_thua_vien',
    'linh_son_tong',
    'dinh_ta',
    'dong_phu',
  ]) {
    expect(isSanctuary(mapId)).toBe(true);
    expect(mayPk({ mapId, mode: 'all', sect: 'a' }, { sect: 'b' })).toBe(false);
  }
  expect(mayPk({ mapId: 'linh_thu_lam', mode: 'all' }, { sect: 'a' })).toBe(true);
  expect(mayPk({ mapId: 'linh_thu_lam', mode: 'peace' }, { sect: 'a' })).toBe(false);
  expect(mayPk({ mapId: 'linh_thu_lam', mode: 'sect', sect: 'a' }, { sect: 'a' })).toBe(false);
});

it('uses the same Vietnam midnight for sect missions and prevents farming a daily every game day', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-28T16:59:59Z'));
  expect(activityDay()).toBe('2026-10-28');
  const accepted = adventureAction(newPlayer(), { type: 'mission', id: 'hunt' }, true);
  if (!accepted.ok) throw Error(accepted.reason);
  const claimed = adventureAction(
    sectEvent(accepted.player, 'kill', 8),
    { type: 'claimMission' },
    true,
  );
  if (!claimed.ok) throw Error(claimed.reason);
  const advanced = advanceLife(claimed.player, DAY_MS * 10);
  expect(adventureAction(advanced, { type: 'mission', id: 'hunt' }, true).ok).toBe(false);
  vi.setSystemTime(new Date('2026-10-28T17:00:00Z'));
  expect(activityDay()).toBe('2026-10-29');
  expect(adventureAction(advanced, { type: 'mission', id: 'hunt' }, true).ok).toBe(true);
});

it('refunds half the paid pills once on failure without advancing a realm or restoring qi', () => {
  const count = breakthroughPillCount(9),
    p = {
      ...newPlayer(),
      admitted: true,
      level: 100,
      realmIndex: 9,
      exp: expToNext(100),
      linhKhi: 10000000,
      inventory: { linh_thach: 1000000, pha_canh_dan: count + 3 },
    };
  gameStore.setState({
    player: p,
    stats: playerStats(p),
    status: 'alive',
    mapId: 'dai_thua_vien',
    tribulation: null,
  });
  gameStore.getState().tryBreakthrough();
  expect(gameStore.getState().tribulation).not.toBeNull();
  expect(gameStore.getState().player.inventory.pha_canh_dan).toBe(3);
  const qi = gameStore.getState().player.linhKhi;
  gameStore.getState().finishTribulation(false);
  expect(gameStore.getState().player.inventory.pha_canh_dan).toBe(3 + count / 2);
  expect(gameStore.getState().player.realmIndex).toBe(9);
  expect(gameStore.getState().player.linhKhi).toBe(qi);
  gameStore.getState().finishTribulation(false);
  expect(gameStore.getState().player.inventory.pha_canh_dan).toBe(3 + count / 2);
});

it('pays meaningful high-level materials from challenging sources and keeps low-level herbs modest', () => {
  const elite = MONSTERS.field_toai_niet_dai_elite.loot.find((d) => d.item === 'yeu_dan')!;
  const lastCost = breakthroughPillCount(10) * 4;
  expect(lastCost / ((elite.chance * (elite.qty[0] + elite.qty[1])) / 2)).toBeGreaterThan(60);
  expect(lastCost / ((elite.chance * (elite.qty[0] + elite.qty[1])) / 2)).toBeLessThan(150);
  const clear = DUNGEONS.tier_110_kho.rewards.items!;
  expect(clear.linh_chi).toBeGreaterThan(100);
  expect(clear.yeu_dan).toBeGreaterThan(100);
  expect(herbYield('dai_thua_vien', 'linh_chi')).toBe(1);
  expect(herbYield('toai_niet_dai', 'linh_chi')).toBeGreaterThan(50);
  const p = { ...newPlayer(), level: 110 };
  p.life = { ...lifeProgress(p), plots: [{ herb: 'linh_chi', readyDay: 0 }] };
  const harvest = performLifeAction(p, { type: 'harvest', plot: 0 }, true, true);
  expect(harvest.ok && harvest.player.inventory.linh_chi).toBeGreaterThan(50);
  for (const band of FIELD_BANDS.filter((b) => b.generated)) {
    const map = getMap(band.id),
      [x, y] = map.playerSpawn;
    for (const node of herbNodes(map.id))
      expect(findPath(map.blocked, x, y, node.x, node.y).reached, node.id).toBe(true);
  }
});

it('reaches the first visible level milestone at admission, without Alphatest rewards', () => {
  const p = newPlayer();
  for (const id of PROLOGUE_ORDER) addExp(p, WORLD_QUESTS[id].rewards.exp ?? 0);
  expect(p.level).toBe(2);
  expect(p.realmIndex).toBe(0);
});

it('recovers exactly one paid party attempt after interruption and cannot refund a settled clear', () => {
  const p = {
    ...newPlayer(),
    dungeons: { day: '2026-10-28', runs: { tier_90_kho: 2 }, clears: { tier_90_kho: 5 } },
    partyRun: { id: 'run-1', dungeon: 'tier_90_kho', day: '2026-10-28' },
  };
  const refund = resolvePartyRun(p, 'run-1', true, '2026-10-28');
  expect(refund.dungeons?.runs.tier_90_kho).toBe(1);
  expect(refund.dungeons?.clears.tier_90_kho).toBe(5);
  expect(resolvePartyRun(refund, 'run-1', true, '2026-10-28')).toBe(refund);
  const settled = resolvePartyRun(p, 'run-1', false, '2026-10-28');
  expect(recoverPartyRun(settled)).toBe(settled);
  expect(settled.dungeons?.runs.tier_90_kho).toBe(2);
  expect(resolvePartyRun(p, 'run-1', true, '2026-10-29').dungeons?.runs.tier_90_kho).toBe(2);
  const ticket = {
    id: 'run-1',
    party: 'team',
    leader: 'a',
    dungeon: 'tier_90_kho',
    members: [
      { userId: 'a', name: 'A' },
      { userId: 'b', name: 'B' },
    ],
    expires: Date.now() + 45000,
  };
  expect(parsePartyDungeonPacket({ kind: 'offer', ticket })).not.toBeNull();
  expect(
    parsePartyDungeonPacket({
      kind: 'offer',
      ticket: { ...ticket, members: [ticket.members[0], ticket.members[0]] },
    }),
  ).toBeNull();
  expect(
    parsePartyDungeonPacket({ kind: 'offer', ticket: { ...ticket, dungeon: 'ngoc_an_thu_luyen' } }),
  ).toBeNull();
});
