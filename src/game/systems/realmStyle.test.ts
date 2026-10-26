import { describe, expect, it } from 'vitest';
import { REALMS } from '../../data';
import { realmStyle, REALM_COLORS, REALM_PHASES } from './realmStyle';
describe('realm nameplate presentation', () => {
  it.each(REALMS.map((r, index) => ({ ...r, index })))(
    'keeps all four stages and the right color for $name',
    (r) => {
      for (const [phaseIndex, offset] of [0, 3, 6, 9].entries()) {
        const result = realmStyle({ level: r.minLevel + offset });
        expect(result).toEqual({
          index: r.index,
          name: r.name,
          phase: REALM_PHASES[phaseIndex],
          phaseIndex,
          color: REALM_COLORS[r.index],
        });
      }
    },
  );
  it('shows one final stage when older peers send Hậu Kỳ Đại Viên Mãn', () => {
    expect(realmStyle({ realm: 'Nguyên Anh Hậu Kỳ Đại Viên Mãn' })).toMatchObject({
      index: 3,
      name: 'Nguyên Anh',
      phase: 'Đại Viên Mãn',
      phaseIndex: 3,
    });
    expect(realmStyle({ realm: 'Kết Đan Trung Kỳ' })).toMatchObject({
      index: 2,
      name: 'Kim Đan',
      phase: 'Trung Kỳ',
    });
  });
  it('keeps children mortal and handles missing or invalid peer data', () => {
    expect(realmStyle({ child: true, level: 100 })).toMatchObject({
      index: -1,
      name: 'Phàm Nhân',
      phase: '',
    });
    expect(realmStyle({ realm: 'Phàm Nhân' }).index).toBe(-1);
    expect(realmStyle({ level: NaN }).name).toBe('Chưa rõ');
    expect(realmStyle({ level: 999 })).toMatchObject({ name: 'Toái Niết', phase: 'Đại Viên Mãn' });
  });
});
