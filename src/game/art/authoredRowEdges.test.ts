import { expect, it } from 'vitest';
import { authoredRowEdges } from './authoredRowEdges';
it('does not cut the head off a falling pose when authored rows have different heights', () => {
  const width = 128,
    height = 800,
    pixels = new Uint8ClampedArray(width * height * 4);
  const tops: number[] = [],
    bottoms: number[] = [];
  let y = 5;
  for (const h of [110, 100, 90, 70, 50, 40, 30, 24]) {
    tops.push(y);
    bottoms.push(y + h - 1);
    for (let cy = y; cy < y + h; cy++)
      for (let x = 20; x < 100; x++) pixels[(cy * width + x) * 4 + 3] = 255;
    y += h + 15;
  }
  const edges = authoredRowEdges(pixels, width, height);
  for (let row = 0; row < 8; row++) {
    expect(edges[row]).toBeLessThanOrEqual(tops[row]);
    expect(edges[row + 1]).toBeGreaterThan(bottoms[row]);
  }
  expect(edges[4]).not.toBe(400);
});
