import { expect, it } from 'vitest';
import { WANG_EFFECT_ART, wangFrameRect, wangSheetLayout, wangVisual } from './wangSkills';

it('keeps every v2 frame inside its own source and compact runtime atlas cell', () => {
  for (const id of [
    'tram_la_quyet',
    'hoa_ma_chi',
    'dinh_than_thuat',
    'dao_hoa_hoang_tuyen',
    'dich_linh_an',
    'tich_diet_chi',
    'luyen_hon_thuat',
  ] as const) {
    const art = WANG_EFFECT_ART[id],
      grid = wangSheetLayout(art);
    expect(grid.frames).toBe(id === 'dao_hoa_hoang_tuyen' ? 25 : 24);
    const source = art.sourceSize ?? { width: 1536, height: 1024 };
    const cells = new Set();
    for (let frame = 0; frame < grid.frames; frame++) {
      const rect = wangFrameRect(source.width, source.height, frame, art);
      expect(rect.width).toBeGreaterThanOrEqual(Math.floor(source.width / grid.columns));
      expect(rect.height).toBeGreaterThanOrEqual(Math.floor(source.height / grid.rows));
      expect(rect.x + rect.width).toBeLessThanOrEqual(source.width);
      expect(rect.y + rect.height).toBeLessThanOrEqual(source.height);
      cells.add(`${rect.x}:${rect.y}`);
    }
    expect(cells.size).toBe(grid.frames);
    expect(grid.columns * grid.rows * grid.cell ** 2 * 4).toBeLessThan(
      id === 'dao_hoa_hoang_tuyen' ? 4_000_000 : 2_500_000,
    );
  }
});
it('times the descending palm and summoned rituals around their real hit windows', () => {
  const palm = WANG_EFFECT_ART.dich_linh_an,
    finger = WANG_EFFECT_ART.tich_diet_chi,
    banner = WANG_EFFECT_ART.luyen_hon_thuat;
  expect(wangVisual(palm, 350, 115, { windupMs: 600 }).frame).toBeLessThan(12);
  expect(wangVisual(palm, 600, 115, { windupMs: 600 })).toMatchObject({ frame: 12, advance: 0.65 });
  expect(wangVisual(finger, 450, 410).frame).toBeGreaterThanOrEqual(6);
  expect(wangVisual(finger, 600, 410)).toMatchObject({ frame: 12, advance: 1 });
  expect(wangVisual(banner, 1500, 180).frame).toBeGreaterThanOrEqual(12);
  expect(wangVisual(banner, 4200, 180)).toMatchObject({ frame: 23, alpha: 0 });
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
it('holds binding chains until release and keeps the gate active through its eighth hit', () => {
  const bind = WANG_EFFECT_ART.dinh_than_thuat,
    river = WANG_EFFECT_ART.dao_hoa_hoang_tuyen;
  expect(wangVisual(bind, 200, 270, { castOnly: true, duration: 400 }).frame).toBeLessThan(6);
  expect(wangVisual(bind, 400, 270).frame).toBeGreaterThanOrEqual(12);
  expect(wangVisual(bind, 1500, 270, { duration: 2000 }).frame).toBeLessThan(18);
  expect(wangVisual(bind, 1950, 270, { duration: 2000 }).frame).toBeGreaterThanOrEqual(18);
  for (const age of [500, 1000, 2000, 3500, 3999])
    expect(wangVisual(river, age, 165).frame).toBeGreaterThanOrEqual(5);
  expect(wangVisual(river, 4000, 165)).toMatchObject({ frame: 20, alpha: 1 });
  expect(wangVisual(river, 4500, 165).alpha).toBe(0);
});
it('plays all five gate phases and pulses on the existing half-second damage clock', () => {
  const gate = WANG_EFFECT_ART.dao_hoa_hoang_tuyen;
  expect(wangVisual(gate, 100, 165).frame).toBeLessThan(5);
  expect(wangVisual(gate, 500, 165).frame).toBe(5);
  expect(wangVisual(gate, 1000, 165).frame).toBe(10);
  for (const time of [1500, 2000, 2500, 3000, 3500])
    expect(wangVisual(gate, time, 165).frame).toBe(15);
  expect(wangVisual(gate, 1700, 165).frame).toBe(10);
  expect(wangVisual(gate, 4500, 165)).toMatchObject({ frame: 24, alpha: 0, advance: 0 });
});
