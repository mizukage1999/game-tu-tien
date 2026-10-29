import { Monster } from './Monster';
import type { WorldScene } from '../scenes/WorldScene';
import type { Vec2 } from '../types';
import { statsForWanderer } from '../systems/scale';

/** Hostile itinerant: strength drives combat, while its label never exposes a level. */
export class Wanderer extends Monster {
  constructor(world: WorldScene, pos: Vec2, name: string, cultivation: number, variant: number) {
    const stats = statsForWanderer(cultivation);
    super(world, 'wanderer', pos.x, pos.y, {
      hideStrength: true,
      definition: {
        name: `${name} · Tán Tu`,
        level: cultivation,
        art: `wanderer_${variant}`,
        ...stats,
        exp: Math.round(stats.exp * 1.3),
        speed: 110,
        aggroRadius: 240,
        attackRange: 68,
        attackInterval: 1500,
        attackWindup: 480,
        leashRadius: 430,
        respawnMs: 45000,
        loot: [
          { item: 'linh_thach', qty: [1, 3], chance: 0.6 },
          { item: 'huyen_thiet', qty: [1, 2], chance: 0.5 },
        ],
      },
    });
  }
}
