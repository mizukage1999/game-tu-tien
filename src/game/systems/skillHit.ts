import type { SkillId } from '../../data';
import type { Vec2 } from '../types';

/** The same hit areas are used in map combat and the manual arena. */
export function signatureHit(id: SkillId, from: Vec2, facing: Vec2, range: number, target: Vec2) {
  const x = target.x - from.x,
    y = target.y - from.y;
  if (id === 'dao_hoa_hoang_tuyen') return Math.hypot(x, y) <= range + 15;
  const along = x * facing.x + y * facing.y;
  const side = Math.abs(x * facing.y - y * facing.x);
  if (id === 'dich_linh_an')
    return Math.hypot(x - facing.x * range * 0.65, y - facing.y * range * 0.65) <= range * 0.6 + 15;
  return along >= -12 && along <= range + 15 && side <= (id === 'tram_la_quyet' ? 45 : 24);
}
