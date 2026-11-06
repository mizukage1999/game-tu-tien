import { expect, it } from 'vitest';
import { OUTFITS } from '../../data/cosmetics';
import { dyeGarmentCell } from './garmentPalette';
it('changes cloth hue while preserving alpha, head, skin and dark hair', () => {
  const bytes = new Uint8ClampedArray(20 * 20 * 4);
  for (let y = 1; y < 19; y++)
    for (let x = 1; x < 19; x++) bytes.set([50, 100, 220, 255], (y * 20 + x) * 4);
  const at = (x: number, y: number) => (y * 20 + x) * 4;
  bytes.set([190, 150, 120, 255], at(3, 12));
  bytes.set([20, 15, 10, 255], at(5, 15));
  const before = bytes.slice();
  dyeGarmentCell(bytes, 20, 20, { x: 0, y: 0, width: 20, height: 20 }, OUTFITS[1]);
  const pixel = (source: Uint8ClampedArray, x: number, y: number) => [
    ...source.slice(at(x, y), at(x, y) + 4),
  ];
  expect(pixel(bytes, 10, 12)[0]).toBeGreaterThan(pixel(bytes, 10, 12)[2]);
  for (const [x, y] of [
    [10, 2],
    [3, 12],
    [5, 15],
    [0, 0],
  ])
    expect(pixel(bytes, x, y)).toEqual(pixel(before, x, y));
  expect(bytes.filter((_, i) => i % 4 === 3)).toEqual(before.filter((_, i) => i % 4 === 3));
});
