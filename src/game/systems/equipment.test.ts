import { afterEach, describe, expect, it } from 'vitest';
import { ITEMS } from '../../data';
import { gameStore, newPlayer } from '../../store/gameStore';
import { adventure, adventureAction } from './adventure';
import { equipmentBaseId, normalizeEquipment } from './equipment';
import { deserialize, serialize } from './save';
import { playerStats } from './progression';

const previous = gameStore.getState();
afterEach(() => gameStore.setState(previous));

describe('individual equipment', () => {
  it('does not resolve a premium entitlement as ordinary individual loot', () => {
    expect(ITEMS.tien_phap_bao).toBeDefined();
    expect(ITEMS['tien_phap_bao~unverified']).toBeUndefined();
  });
  it('upgrades one copy, swaps identical weapons and preserves both across reload', () => {
    const p = { ...newPlayer(), level: 20, inventory: { tinh_luyen_thach: 5 } };
    gameStore.setState({ player: p, stats: playerStats(p), status: 'alive', quests: {} });
    gameStore.getState().addItem('weapon_white', 2);
    const keys = Object.keys(gameStore.getState().player.inventory).filter(
      (id) => ITEMS[id]?.slot === 'weapon',
    );
    expect(keys).toHaveLength(2);
    expect(new Set(keys).size).toBe(2);
    expect(keys.map(equipmentBaseId)).toEqual(['weapon_white', 'weapon_white']);
    gameStore.getState().equip(keys[0]);
    const before = gameStore.getState().stats.atk;
    gameStore.getState().adventureAction({ type: 'enhance', id: keys[0] });
    expect(gameStore.getState().stats.atk).toBeGreaterThan(before);
    expect(gameStore.getState().player.adventure?.enhancements[keys[1]] ?? 0).toBe(0);
    gameStore.getState().equip(keys[1]);
    expect(gameStore.getState().stats.atk).toBe(before);
    expect(gameStore.getState().player.inventory[keys[0]]).toBe(1);
    gameStore.getState().unequip('weapon');
    const loaded = deserialize(
      serialize({
        player: gameStore.getState().player,
        quests: {},
        mapId: 'dai_thua_vien',
        pos: null,
      }),
    )!;
    expect(loaded.player.inventory[keys[0]]).toBe(1);
    expect(loaded.player.inventory[keys[1]]).toBe(1);
    expect(loaded.player.adventure?.enhancements[keys[0]]).toBe(1);
    expect(loaded.player.adventure?.enhancements[keys[1]] ?? 0).toBe(0);
  });

  it('migrates one shared upgrade onto the worn copy without cloning it to spares', () => {
    const p = {
      ...newPlayer(),
      equipment: { weapon: 'weapon_white' },
      inventory: { weapon_white: 2, hoi_xuan_dan: 3 },
      adventure: { ...adventure(newPlayer()), enhancements: { weapon_white: 6 } },
    };
    const migrated = normalizeEquipment(p, ITEMS),
      key = migrated.equipment.weapon!;
    expect(equipmentBaseId(key)).toBe('weapon_white');
    expect(migrated.adventure?.enhancements[key]).toBe(6);
    const spare = Object.keys(migrated.inventory).filter((id) => ITEMS[id]?.slot === 'weapon');
    expect(spare).toHaveLength(2);
    for (const id of spare) expect(migrated.adventure?.enhancements[id] ?? 0).toBe(0);
    expect(migrated.inventory.hoi_xuan_dan).toBe(3);
    expect(normalizeEquipment(migrated, ITEMS)).toBe(migrated);
    expect(normalizeEquipment(p, ITEMS)).toEqual(migrated);
    expect(p.inventory.weapon_white).toBe(2);
  });

  it('keeps failed upgrades and a bag copy independent from the worn item', () => {
    let p = normalizeEquipment(
      {
        ...newPlayer(),
        equipment: { weapon: 'weapon_white' },
        inventory: { weapon_white: 1, tinh_luyen_thach: 10 },
      },
      ITEMS,
    );
    const bag = Object.keys(p.inventory).find((id) => ITEMS[id]?.slot)!;
    let result = adventureAction(p, { type: 'enhance', id: bag }, false, () => 0);
    if (!result.ok) throw Error(result.reason);
    p = result.player;
    const stats = playerStats(p),
      stones = p.inventory.tinh_luyen_thach;
    result = adventureAction(p, { type: 'enhance', id: bag }, false, () => 0.999);
    if (!result.ok) throw Error(result.reason);
    expect(result.player.adventure?.enhancements[bag]).toBe(1);
    expect(result.player.adventure?.enhancements[p.equipment.weapon!] ?? 0).toBe(0);
    expect(result.player.inventory.tinh_luyen_thach).toBe(stones - 1);
    expect(playerStats(result.player)).toEqual(stats);
  });
});
