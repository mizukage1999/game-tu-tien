import { expect, it } from 'vitest';
import { iso, setIsoOrigin, uniso } from '../art/iso';
import { mouseWalkPath } from './mouseNavigation';
import { gridLineClear } from './gridNavigation';
import { arenaMouseMotion, arenaMousePoint } from './arenaMouse';
import { ARENA_ROCKS } from './arena';

it('maps clicks back to the same gameplay point after the isometric map origin changes', () => {
  for (const [w, h] of [[48 * 40, 48 * 30], [48 * 32, 48 * 48]]) {
    setIsoOrigin(w, h);
    for (const [x, y] of [[0, 0], [315.25, 480.75], [w - 10, h - 10]]) {
      const screen = iso(x, y), point = uniso(screen.x, screen.y);
      expect(point.x).toBeCloseTo(x); expect(point.y).toBeCloseTo(y);
    }
  }
});
it('routes around solid obstacles with body clearance and reaches the actual ground click', () => {
  const tile = 48, blocked = Array.from({ length: 9 }, () => Array<boolean>(9).fill(false));
  for (let y = 2; y <= 6; y++) blocked[y][4] = true;
  const from = { x: 2.5 * tile, y: 4.5 * tile }, requested = { x: 6.2 * tile, y: 4.7 * tile };
  const route = mouseWalkPath(blocked, tile, from, requested)!;
  expect(route.target).toEqual(requested);
  let last = from;
  for (const next of route.points) { expect(gridLineClear(blocked, tile, last, next, 12, 9)).toBe(true); last = next; }
  expect(last).toEqual(requested);
  expect(route.points.some(p => p.y < 2 * tile || p.y > 7 * tile)).toBe(true);
});
it('redirects clicks on a wall to walkable ground and rejects outside or disconnected destinations', () => {
  const tile = 48, blocked = Array.from({ length: 7 }, () => Array<boolean>(7).fill(false));
  const from = { x: 1.5 * tile, y: 3.5 * tile };
  blocked[3][3] = true;
  const route = mouseWalkPath(blocked, tile, from, { x: 3.5 * tile, y: 3.5 * tile })!;
  expect(blocked[Math.floor(route.target.y / tile)][Math.floor(route.target.x / tile)]).toBe(false);
  for (const point of [{ x: -1, y: 20 }, { x: 336, y: 20 }, { x: NaN, y: 20 }]) expect(mouseWalkPath(blocked, tile, from, point)).toBeNull();
  for (let y = 0; y < 7; y++) blocked[y][3] = true;
  expect(mouseWalkPath(blocked, tile, from, { x: 5.5 * tile, y: 3.5 * tile })).toBeNull();
});
it('projects arena clicks independently of display density and keeps rock destinations outside collision', () => {
  const from = { x: 110, y: 200 };
  expect(arenaMousePoint({ x: 370, y: 220 }, { left: 10, top: 20, width: 720, height: 400 }, from)).toEqual({ x: 360, y: 200 });
  expect(arenaMousePoint({ x: 510, y: 370 }, { left: 10, top: 10, width: 1000, height: 720 }, from, true)).toEqual({ x: 360, y: 200 });
  const rock = ARENA_ROCKS[0], goal = arenaMousePoint(rock, { left: 0, top: 0, width: 720, height: 400 }, from)!;
  expect(Math.hypot(goal.x - rock.x, goal.y - rock.y)).toBeGreaterThanOrEqual(rock.r + 16);
  expect(arenaMousePoint(from, { left: 0, top: 0, width: 0, height: 0 }, from)).toBeNull();
});
it('steers a clicked arena destination around obstacles and slows to a stable stop', () => {
  const goal = { x: 600, y: 120 }, point = { x: 100, y: 120 }, speed = 180;
  let stopped = false;
  for (let i = 0; i < 150; i++) {
    const motion = arenaMouseMotion(point, goal, speed);
    if (!motion) { stopped = true; break; }
    point.x += motion.x * speed * .08; point.y += motion.y * speed * .08;
    expect(ARENA_ROCKS.every(r => Math.hypot(point.x - r.x, point.y - r.y) >= r.r + 14)).toBe(true);
  }
  expect(stopped).toBe(true); expect(Math.hypot(point.x - goal.x, point.y - goal.y)).toBeLessThanOrEqual(6);
});
