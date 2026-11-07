import { ITEMS } from '../../data';
import type { HeroId } from '../../data/heroes';
import { equipmentBaseId } from './equipment';

/** An NPC's shared weapon offer resolves to a real existing school definition. */
export function schoolWeaponId(id: string, hero: HeroId) {
  const base = equipmentBaseId(id),
    def = ITEMS[base],
    variant = `${base}_${hero}`;
  return def?.slot === 'weapon' && !def.hero && ITEMS[variant]?.hero === hero
    ? variant + id.slice(base.length)
    : id;
}
