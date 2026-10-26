import { isoVector } from '../art/iso';
/** Sword art points right with a slight authored tilt. Both local and remote riders use this. */
export function flightRotation(facing: { x: number; y: number }) {
  const vector = isoVector(facing.x, facing.y);
  return Math.atan2(vector.y, vector.x) + Math.atan2(7, 117);
}
