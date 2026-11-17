import { expect, it } from 'vitest';
import { EQUIP_SLOTS, RARITIES } from '../../data';
import { HEROES } from '../../data/heroes';
import { inventoryIconUrl } from './inventoryIcons';

it('uses seven distinct authored sprites for every equipment slot and every school weapon', () => {
  for (const slot of EQUIP_SLOTS) {
    const urls = RARITIES.map((r) => inventoryIconUrl(`${slot.id}_${r.id}`));
    expect(urls.every((url) => url?.endsWith('.webp'))).toBe(true);
    expect(new Set(urls).size).toBe(7);
  }
  for (const hero of HEROES) {
    const urls = RARITIES.map((r) => inventoryIconUrl(`weapon_${r.id}_${hero.id}`));
    expect(urls.every(Boolean)).toBe(true);
    expect(new Set(urls).size).toBe(7);
  }
  expect(new Set(HEROES.map((h) => inventoryIconUrl(`weapon_red_${h.id}`))).size).toBe(8);
});
it('resolves physical item copies to their tier art and preserves consumable art', () => {
  expect(inventoryIconUrl('armor_red~physical-a')).toBe(inventoryIconUrl('armor_red~physical-b'));
  expect(inventoryIconUrl('armor_red_wang_lam')).toBe(inventoryIconUrl('armor_red'));
  expect(inventoryIconUrl('weapon_pink_ly_mo_uyen')).not.toBe(inventoryIconUrl('weapon_pink'));
  expect(inventoryIconUrl('linh_chi')).toBeTruthy();
  expect(inventoryIconUrl('hoi_xuan_dan')).not.toBe(inventoryIconUrl('armor_white'));
});
