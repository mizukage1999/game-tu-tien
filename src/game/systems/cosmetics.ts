import { parseCosmeticLook, type CosmeticLook, type CosmeticSlot } from '../../data/cosmetics';
import type { PlayerSave } from './save';

export function ownsCosmetic(p: Pick<PlayerSave, 'inventory'>, id: string | null) {
  return id === null || (Number.isSafeInteger(p.inventory[id]) && p.inventory[id] > 0);
}
export function wornCosmetics(p: Pick<PlayerSave, 'cosmetics' | 'inventory'>): CosmeticLook {
  const look = parseCosmeticLook(p.cosmetics);
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
  if (id !== null && (look[slot] !== id || !ownsCosmetic(p, id))) return null;
  return { ...wornCosmetics(p), [slot]: look[slot] };
}
