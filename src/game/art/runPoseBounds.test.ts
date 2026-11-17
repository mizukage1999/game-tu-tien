import { expect, it } from 'vitest';
import { runPoseBounds } from './runPoseBounds';
import { heroRunPhase, isHeroCastingFrame } from './heroSheetLayout';

it('keeps both connected shoes and excludes a stray fragment at the cell edge', () => {
  const pixels = new Uint8ClampedArray(32 * 64 * 4);
  const fill = (x: number, y: number, w: number, h: number) => {
    for (let cy = y; cy < y + h; cy++)
      for (let cx = x; cx < x + w; cx++) pixels[(cy * 32 + cx) * 4 + 3] = 255;
  };
  fill(14, 38, 5, 12);
  fill(12, 48, 4, 8);
  fill(17, 48, 4, 8);
  fill(8, 33, 2, 1); // Previous row's foot, not part of this figure.
  const bounds = runPoseBounds(pixels, 32, 0, 32, 32, 64)!;
  expect(bounds.y).toBe(36);
  expect(bounds.y + bounds.h).toBe(58);
  expect(bounds.x).toBeLessThanOrEqual(12);
  expect(bounds.x + bounds.w).toBeGreaterThanOrEqual(21);
});
it('rejects a missing pose instead of silently substituting idle', () => {
  expect(runPoseBounds(new Uint8ClampedArray(16 * 16 * 4), 16, 0, 0, 16, 16)).toBe(null);
});
it('does not mistake any adult or child running frame for a casting pose', () => {
  for (const cell of [128, 160]) {
    expect(isHeroCastingFrame(cell, cell)).toBe(true);
    for (let phase = 0; phase < 8; phase++) {
      const y = (phase + 2) * cell;
      expect(heroRunPhase(y, cell)).toBe(phase);
      expect(isHeroCastingFrame(y, cell)).toBe(false);
    }
    expect(heroRunPhase(0, cell)).toBe(-1);
    expect(heroRunPhase(cell, cell)).toBe(-1);
  }
});
