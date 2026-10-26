import { afterEach, beforeEach, expect, it } from 'vitest';
import { gameStore, newPlayer } from '../../store/gameStore';
import { breakthroughBlocker, tribulationPlan } from './cultivation';
import { expToNext, playerStats } from './progression';
const previous = gameStore.getState();
beforeEach(() => {
  const player = {
    ...newPlayer(),
    admitted: true,
    level: 70,
    realmIndex: 6,
    exp: expToNext(70),
    linhKhi: 30000,
    inventory: { linh_thach: 200, pha_canh_dan: 2 },
  };
  gameStore.setState({
    player,
    stats: playerStats(player),
    mapId: 'dai_thua_vien',
    status: 'alive',
    tribulation: null,
    menu: 'cultivate',
    logs: [],
    toasts: [],
  });
});
afterEach(() => gameStore.setState(previous));

it('increases actual wave count and danger at higher realms', () => {
  const low = tribulationPlan(0),
    high = tribulationPlan(9);
  expect(low).toMatchObject({ waves: 4, durationMs: 18000, threats: 1 });
  expect(high.waves).toBeGreaterThan(low.waves);
  expect(high.durationMs).toBeGreaterThan(low.durationMs);
  expect(high.threats).toBe(3);
  expect(high.warningMs).toBeLessThan(low.warningMs);
});
it('grants no high realm until every required wave and the whole timer are finished', () => {
  gameStore.getState().tryBreakthrough();
  let state = gameStore.getState();
  expect(state.tribulation?.strikes).toBe(0);
  expect(state.player.realmIndex).toBe(6);
  expect(state.player.inventory.pha_canh_dan).toBe(1);
  state.tryBreakthrough();
  expect(gameStore.getState().player.inventory.pha_canh_dan).toBe(1);
  state.finishTribulation(true);
  expect(gameStore.getState().player.realmIndex).toBe(6);
  gameStore.setState({ tribulation: { realm: 6, remaining: 0, strikes: 4 } });
  state.finishTribulation(true);
  expect(gameStore.getState().player.realmIndex).toBe(6);
  gameStore.setState({
    tribulation: { realm: 6, remaining: 0, strikes: tribulationPlan(6).waves },
  });
  state.finishTribulation(true);
  state = gameStore.getState();
  expect(state.player).toMatchObject({ realmIndex: 7, level: 71, exp: 0 });
  expect(state.player.inventory.thien_loi_tinh).toBe(1);
  state.finishTribulation(true);
  expect(gameStore.getState().player.realmIndex).toBe(7);
});
it('failure retains the original realm and EXP and never restores consumed ingredients', () => {
  gameStore.getState().tryBreakthrough();
  gameStore.getState().finishTribulation(false);
  const state = gameStore.getState();
  expect(state.tribulation).toBeNull();
  expect(state.player).toMatchObject({
    realmIndex: 6,
    exp: expToNext(70),
    inventory: { pha_canh_dan: 1 },
  });
});
it('uses the same material, childhood and location gates as the menu', () => {
  const p = gameStore.getState().player;
  expect(breakthroughBlocker(p, 'dai_thua_vien', true)).toBeNull();
  expect(breakthroughBlocker(p, 'vuong_gia_thon', true)).toContain('tông môn');
  expect(breakthroughBlocker({ ...p, inventory: {} }, 'dai_thua_vien', true)).toContain(
    'Linh Thạch',
  );
  expect(
    breakthroughBlocker({ ...p, origin: 'vuong_gia_thon', admitted: false }, 'dai_thua_vien', true),
  ).toContain('nhập môn');
});
