import { afterEach, expect, it } from 'vitest';
import { ITEMS, NPCS } from '../../data';
import { HEROES } from '../../data/heroes';
import { cosmeticsForHero } from '../../data/cosmetics';
import { HERO_WEAPONS } from '../../data/heroWeapons';
import { gameStore, newPlayer } from '../../store/gameStore';
import { equipmentBaseId } from './equipment';
import { schoolWeaponId } from './schoolEquipment';
import { canEquip, playerStats } from './progression';
import { wornCosmetics } from './cosmetics';
import { inventoryIconUrl } from '../art/inventoryIcons';

const before = gameStore.getState();
afterEach(() => gameStore.setState(before));
it('resolves NPC weapons to each school without changing price, quality or stats', () => {
  const index = NPCS.thuong_nhan.shop!.findIndex((o) => ITEMS[o.item]?.slot === 'weapon'),
    offer = NPCS.thuong_nhan.shop![index];
  const icons = new Set<string>();
  for (const hero of HEROES) {
    const p = {
      ...newPlayer(),
      heroId: hero.id,
      sex: hero.sex,
      level: 99,
      admitted: true,
      linhKhi: 999999,
      inventory: { linh_thach: 99999 },
    };
    gameStore.setState({ player: p, stats: playerStats(p) });
    const expected = schoolWeaponId(offer.item, hero.id);
    expect(ITEMS[expected].hero).toBe(hero.id);
    expect(ITEMS[expected].name).toContain(HERO_WEAPONS[hero.id]);
    expect(ITEMS[expected].bonus).toEqual(ITEMS[offer.item].bonus);
    expect(ITEMS[expected].rarity).toBe(ITEMS[offer.item].rarity);
    gameStore.getState().buy('thuong_nhan', index);
    const s = gameStore.getState(),
      key = Object.keys(s.player.inventory).find((id) => equipmentBaseId(id) === expected)!;
    expect(key).toBeTruthy();
    expect(s.player.inventory[key]).toBe(offer.qty);
    expect(s.player.linhKhi).toBe(999999 - (offer.price.linh_khi ?? 0));
    expect(s.player.inventory.linh_thach).toBe(99999 - (offer.price.linh_thach ?? 0));
    expect(canEquip(key, 99, hero.id).ok).toBe(true);
    expect(canEquip(key, 99, HEROES.find((h) => h.id !== hero.id)!.id).ok).toBe(false);
    icons.add(inventoryIconUrl(key)!);
  }
  expect(icons.size).toBe(8);
});
it('blocks incompatible sword skins and suppresses previously saved ones without deleting owned items', () => {
  const look = { outfit: 'ao_cuu_huyen', weapon: 'kiem_anh_cuu_huyen' } as const;
  for (const hero of HEROES) {
    const p = {
      ...newPlayer(),
      heroId: hero.id,
      sex: hero.sex,
      admitted: true,
      cosmetics: look,
      inventory: { ao_cuu_huyen: 1, kiem_anh_cuu_huyen: 1 },
    };
    gameStore.setState({ player: p });
    const valid = hero.id === 'wang_lam';
    expect(gameStore.getState().wearCosmetic('weapon', look.weapon)).toBe(valid);
    expect(wornCosmetics(p).weapon).toBe(valid ? look.weapon : null);
    expect(cosmeticsForHero(hero.id, look).weapon).toBe(valid ? look.weapon : null);
    expect(gameStore.getState().player.inventory).toEqual(p.inventory);
  }
});
