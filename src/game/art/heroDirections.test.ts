import { describe, expect, it } from 'vitest';
import { cardinalDirection, heroDirection, type HeroDirection } from './heroDirections';
import { inputToMap, isoVector } from './iso';

describe('hero screen facing', () => {
  const cases: [number, number, HeroDirection][] = [
    [0, 1, 'down'],
    [-1, 1, 'down-left'],
    [-1, 0, 'left'],
    [-1, -1, 'up-left'],
    [0, -1, 'up'],
    [1, -1, 'up-right'],
    [1, 0, 'right'],
    [1, 1, 'down-right'],
  ];
  it.each(cases)(
    'follows screen input (%s, %s) through the isometric movement transform',
    (x, y, direction) => {
      const map = inputToMap(x, y),
        projected = isoVector(map.x, map.y);
      expect(heroDirection(projected.x, projected.y)).toBe(direction);
    },
  );
  it('keeps the last facing when stopped, with cardinal fallbacks for older NPC rigs', () => {
    expect(heroDirection(0, 0, 'up-right')).toBe('up-right');
    expect(cardinalDirection('down-left')).toBe('left');
    expect(cardinalDirection('up-right')).toBe('right');
    expect(cardinalDirection('up')).toBe('up');
  });
});
