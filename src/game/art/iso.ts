import type { Vec2 } from '../types';

/**
 * Isometric projection for the world.
 *
 * Gameplay, AI, path-finding and collision all stay in the old top-down map
 * space (one 48 px cell per tile). Only *where things are drawn* goes through
 * this module: a map point (mx, my) lands on screen at
 *
 *   x = originX + (mx - my)
 *   y = originY + (mx + my) / 2
 *
 * so every 48×48 cell becomes a 48×24 diamond and the world reads as a 2:1
 * isometric courtyard while the simulation underneath is untouched.
 */

export const ISO_X = 1;
export const ISO_Y = 0.5;

let originX = 0;
let originY = 0;
let screenW = 0;
let screenH = 0;

/** Half a diamond of padding so the top and side vertices are never clipped. */
export const ISO_PAD = 16;

/** Must be called once per map, before the ground canvas or any prop is placed. */
export function setIsoOrigin(mapWidthPx: number, mapHeightPx: number) {
  originX = mapHeightPx * ISO_X + ISO_PAD;
  originY = ISO_PAD;
  screenW = (mapWidthPx + mapHeightPx) * ISO_X + ISO_PAD * 2;
  screenH = (mapWidthPx + mapHeightPx) * ISO_Y + ISO_PAD * 2;
}

export function iso(mx: number, my: number): Vec2 {
  return { x: originX + (mx - my) * ISO_X, y: originY + (mx + my) * ISO_Y };
}

export function isoX(mx: number, my: number) {
  return originX + (mx - my) * ISO_X;
}

export function isoY(mx: number, my: number) {
  return originY + (mx + my) * ISO_Y;
}

/** Painter's-order depth: things lower on the screen draw in front. */
export function isoDepth(mx: number, my: number) {
  return isoY(mx, my);
}

/** Map-space direction (dx, dy) expressed on screen. */
export function isoVector(dx: number, dy: number): Vec2 {
  return { x: (dx - dy) * ISO_X, y: (dx + dy) * ISO_Y };
}

/**
 * Turns a screen-space input (keys, joystick) into a map-space direction, so
 * "up" on screen really walks away from the camera along the map diagonal.
 */
export function inputToMap(sx: number, sy: number): Vec2 {
  const mx = sx / (2 * ISO_X) + sy / (2 * ISO_Y);
  const my = -sx / (2 * ISO_X) + sy / (2 * ISO_Y);
  const len = Math.hypot(mx, my) || 1;
  return { x: mx / len, y: my / len };
}

export function isoBounds() {
  return { width: screenW, height: screenH };
}

/** Screen position of the map centre, used to frame the camera at boot. */
export function isoCentre(mapWidthPx: number, mapHeightPx: number): Vec2 {
  return iso(mapWidthPx / 2, mapHeightPx / 2);
}
