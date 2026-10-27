import { ARENA_H, ARENA_ROCKS, ARENA_W } from './arena';
import { arenaSteer } from './arenaNavigation';
import type { Vec2 } from '../types';

export function arenaMousePoint(client: Vec2, rect: { left: number; top: number; width: number; height: number }, from: Vec2, turned = false): Vec2 | null {
  if (rect.width <= 0 || rect.height <= 0) return null;
  let x = turned ? (client.y - rect.top) / rect.height * ARENA_W : (client.x - rect.left) / rect.width * ARENA_W;
  let y = turned ? (rect.left + rect.width - client.x) / rect.width * ARENA_H : (client.y - rect.top) / rect.height * ARENA_H;
  if (![x, y].every(Number.isFinite)) return null;
  x = Math.max(28, Math.min(ARENA_W - 28, x)); y = Math.max(28, Math.min(ARENA_H - 28, y));
  for (const rock of ARENA_ROCKS) {
    if (Math.hypot(x - rock.x, y - rock.y) >= rock.r + 17) continue;
    let dx = x - rock.x, dy = y - rock.y;
    if (Math.hypot(dx, dy) < .01) { dx = from.x - rock.x; dy = from.y - rock.y; }
    const length = Math.hypot(dx, dy) || 1;
    x = rock.x + dx / length * (rock.r + 17); y = rock.y + dy / length * (rock.r + 17);
  }
  return { x, y };
}
export function arenaMouseMotion(from: Vec2, to: Vec2, speed: number): Vec2 | null {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  if (distance <= 6) return null;
  const steer = arenaSteer(from, to), slow = Math.min(1, distance / Math.max(1, speed * .18));
  return { x: steer.x * slow, y: steer.y * slow };
}
