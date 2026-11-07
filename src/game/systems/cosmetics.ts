import {
  parseCosmeticLook,
  cosmeticsForHero,
  compatibleWeaponSkin,
  type CosmeticLook,
  type CosmeticSlot,
} from '../../data/cosmetics';
import { heroFor } from '../../data/heroes';
import type { PlayerSave } from './save';

export function ownsCosmetic(p: Pick<PlayerSave, 'inventory'>, id: string | null) {
  return id === null || (Number.isSafeInteger(p.inventory[id]) && p.inventory[id] > 0);
}
export function wornCosmetics(
  p: Pick<PlayerSave, 'cosmetics' | 'inventory'> & Partial<Pick<PlayerSave, 'heroId' | 'sex'>>,
): CosmeticLook {
  const look = cosmeticsForHero(heroFor(p).id, p.cosmetics);
  return {
    outfit: ownsCosmetic(p, look.outfit) ? look.outfit : null,
    weapon: ownsCosmetic(p, look.weapon) ? look.weapon : null,
  };
}
/** Returns a new appearance only; equipment, inventory quantities and stats stay intact. */
export function chooseCosmetic(
  p: PlayerSave,
  slot: CosmeticSlot,
  id: string | null,
): CosmeticLook | null {
  const look = parseCosmeticLook({ [slot]: id });
  if (slot === 'weapon' && !compatibleWeaponSkin(heroFor(p).id, id)) return null;
  if (id !== null && (look[slot] !== id || !ownsCosmetic(p, id))) return null;
  return { ...wornCosmetics(p), [slot]: look[slot] };
}
