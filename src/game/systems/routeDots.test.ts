import { describe, expect, it } from 'vitest';
import { routeDots } from './routeDots';
import { getMap } from '../maps';
import { findPath } from './path';

describe('quest breadcrumbs', () => {
  it('follows corridor bends without drawing a straight line through walls', () => {
    expect(routeDots([{x:0,y:0},{x:50,y:0},{x:50,y:50}],20)).toEqual([
      {x:20,y:0},{x:40,y:0},{x:50,y:10},{x:50,y:30},{x:50,y:50},
    ]);
  });
  it('bounds the number of dots and tolerates empty or duplicate segments', () => {
    expect(routeDots([])).toEqual([]);
    expect(routeDots([{x:0,y:0},{x:0,y:0},{x:10000,y:0}],30,40)).toHaveLength(40);
    expect(routeDots([{x:0,y:0},{x:10,y:0}],0)).toEqual([]);
  });
  it('keeps the village well guide on walkable terrain', () => {
    const map = getMap('vuong_gia_thon');
    const path = findPath(map.blocked, 15, 12, 20, 18);
    expect(path.reached).toBe(true);
    const dots = routeDots([{x:15.5*48,y:12.5*48}, ...path.tiles.map(t=>({x:(t.x+.5)*48,y:(t.y+.5)*48}))]);
    expect(dots.length).toBeGreaterThan(3);
    for (const dot of dots) expect(map.blocked[Math.floor(dot.y/48)][Math.floor(dot.x/48)]).toBe(false);
  });
});
