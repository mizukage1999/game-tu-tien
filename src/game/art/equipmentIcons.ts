import type { ItemDef } from '../../data';
import icons from '../../data/equipmentIconAssets.json';

/** Every tier has authored geometry; an enhancement never changes an item's rarity. */
export function equipmentIconUrl(item: ItemDef | undefined) {
  if (!item?.slot) return undefined;
  const key = `${item.slot}:${item.rarity ?? 'white'}`;
  const native =
    item.slot === 'weapon' && item.hero && item.hero !== 'wang_lam' ? `${key}:${item.hero}` : key;
  return (icons as Record<string, string>)[native];
}
