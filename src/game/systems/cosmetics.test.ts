import { afterEach, expect, it, vi } from 'vitest';
import { ITEMS } from '../../data';
import { parseCosmeticLook, OUTFITS, WEAPON_SKINS } from '../../data/cosmetics';
import { gameStore, newPlayer } from '../../store/gameStore';
import { appearanceStore, stopAppearancePreview, tryAppearance } from '../../store/appearanceStore';
import { buildInspection, parseInspection } from '../../net/inspection';
import { parseRemote, shouldPublish } from '../../net/presence';
import { chooseCosmetic, wornCosmetics } from './cosmetics';
import { playerStats } from './progression';
import { deserialize, serialize } from './save';

const look = { outfit: 'ao_huyet_nguyet', weapon: 'kiem_anh_cuu_huyen' } as const;
const fixture = () => ({
  ...newPlayer(),
  admitted: true,
  heroId: 'wang_lam' as const,
  inventory: { ao_huyet_nguyet: 1, kiem_anh_cuu_huyen: 1 },
});
const before = gameStore.getState();
afterEach(() => {
  stopAppearancePreview();
  vi.useRealTimers();
  gameStore.setState(before);
});
it('only equips an owned, allowlisted item in its correct cosmetic slot', () => {
  const p = fixture();
  expect(chooseCosmetic(p, 'outfit', look.outfit)?.outfit).toBe(look.outfit);
  expect(chooseCosmetic(p, 'outfit', 'ao_long_uy')).toBeNull();
  expect(chooseCosmetic(p, 'outfit', look.weapon)).toBeNull();
  expect(parseCosmeticLook({ outfit: '../../bad', weapon: 'bogus', admin: true })).toEqual({
    outfit: null,
    weapon: null,
  });
  expect(wornCosmetics({ ...p, cosmetics: look, inventory: {} })).toEqual({
    outfit: null,
    weapon: null,
  });
  expect(
    wornCosmetics({ ...p, cosmetics: look, inventory: { ao_huyet_nguyet: 0.5 } }).outfit,
  ).toBeNull();
});
it('wears, saves, restores and removes appearance without changing combat equipment, inventory or stats', () => {
  const p = fixture(),
    stats = playerStats(p);
  gameStore.setState({ player: p, stats });
  expect(gameStore.getState().wearCosmetic('outfit', look.outfit)).toBe(true);
  expect(gameStore.getState().wearCosmetic('weapon', look.weapon)).toBe(true);
  const changed = gameStore.getState().player;
  expect(playerStats(changed)).toEqual(stats);
  expect(changed.equipment).toBe(p.equipment);
  expect(changed.inventory).toBe(p.inventory);
  const restored = deserialize(
    serialize({ player: changed, quests: {}, mapId: 'dai_thua_vien', pos: { x: 100, y: 100 } }),
  )!;
  expect(wornCosmetics(restored.player)).toEqual(look);
  expect(gameStore.getState().wearCosmetic('outfit', null)).toBe(true);
  expect(wornCosmetics(gameStore.getState().player)).toEqual({ ...look, outfit: null });
  expect([...OUTFITS, ...WEAPON_SKINS].every((x) => !ITEMS[x.id].slot && !ITEMS[x.id].bonus)).toBe(
    true,
  );
});
it('expires local try-on after 30 seconds without writing it into the public inspection or save', () => {
  vi.useFakeTimers();
  const p = fixture();
  gameStore.setState({ player: p, stats: playerStats(p) });
  tryAppearance(look);
  expect(appearanceStore.getState().preview).toEqual(look);
  expect(gameStore.getState().player).toBe(p);
  const info = buildInspection(p, playerStats(p), {}, 'dai_thua_vien', 'me');
  expect(info.cosmetics).toEqual({ outfit: null, weapon: null });
  vi.advanceTimersByTime(30000);
  expect(appearanceStore.getState().preview).toBeNull();
});
it('publishes appearance while stationary and parses only the public cosmetic IDs', () => {
  const pose = { x: 10, y: 10, dir: 'down' as const, moving: false };
  expect(shouldPublish(pose, { ...pose, cosmetics: look }, 100)).toBe(true);
  expect(parseRemote('p', { ...pose, user_id: 'peer', cosmetics: look }, 0)?.cosmetics).toEqual(
    look,
  );
  const p = { ...fixture(), cosmetics: look };
  const info = buildInspection(p, playerStats(p), {}, 'dai_thua_vien', 'peer');
  expect(parseInspection({ ...info, privateInventory: { secret: 99 } })?.cosmetics).toEqual(look);
});
