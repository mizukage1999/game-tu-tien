import { expect, it } from 'vitest';
import { WANG_EFFECT_ART, wangFrameRect, wangSheetLayout, wangVisual } from './wangSkills';

it('keeps every v2 frame inside its own source and compact runtime atlas cell', () => {
  for (const id of [
    'tram_la_quyet',
    'hoa_ma_chi',
    'dinh_than_thuat',
    'dao_hoa_hoang_tuyen',
  ] as const) {
    const art = WANG_EFFECT_ART[id],
      grid = wangSheetLayout(art);
    expect(grid.frames).toBe(24);
    const cells = new Set();
    for (let frame = 0; frame < 24; frame++) {
      const rect = wangFrameRect(1536, 1024, frame, art);
      expect(rect.width).toBe(256);
      expect(rect.height).toBe(256);
      expect(rect.x + rect.width).toBeLessThanOrEqual(1536);
      expect(rect.y + rect.height).toBeLessThanOrEqual(1024);
      cells.add(`${rect.x}:${rect.y}`);
    }
    expect(cells.size).toBe(24);
    expect(grid.columns * grid.rows * grid.cell ** 2 * 4).toBeLessThan(2_500_000);
  }
});
it('moves a projectile through charge, flight, impact at 400ms and dissolve in order', () => {
  for (const id of ['tram_la_quyet', 'hoa_ma_chi'] as const) {
    const art = WANG_EFFECT_ART[id];
    expect(wangVisual(art, 80, 360).frame).toBeLessThan(6);
    const flight = wangVisual(art, 280, 360);
    expect(flight.frame).toBeGreaterThanOrEqual(6);
    expect(flight.frame).toBeLessThan(12);
    expect(flight.advance).toBeGreaterThan(wangVisual(art, 140, 360).advance);
    expect(wangVisual(art, 400, 360).frame).toBe(12);
    expect(wangVisual(art, 700, 360).frame).toBeGreaterThanOrEqual(18);
    expect(wangVisual(art, 1000, 360)).toMatchObject({ frame: 23, alpha: 0 });
  }
});
it('holds binding chains until release and keeps the vortex active through its eighth hit', () => {
  const bind = WANG_EFFECT_ART.dinh_than_thuat,
    river = WANG_EFFECT_ART.dao_hoa_hoang_tuyen;
  expect(wangVisual(bind, 200, 270, { castOnly: true, duration: 400 }).frame).toBeLessThan(6);
  expect(wangVisual(bind, 400, 270).frame).toBeGreaterThanOrEqual(12);
  expect(wangVisual(bind, 1500, 270, { duration: 2000 }).frame).toBeLessThan(18);
  expect(wangVisual(bind, 1950, 270, { duration: 2000 }).frame).toBeGreaterThanOrEqual(18);
  for (const age of [500, 1000, 2000, 3500, 3999])
    expect(wangVisual(river, age, 165).frame).toBeGreaterThanOrEqual(6);
  expect(wangVisual(river, 4000, 165)).toMatchObject({ frame: 18, alpha: 1 });
  expect(wangVisual(river, 4500, 165).alpha).toBe(0);
});
