import { expect, it } from 'vitest';
import { CombatInputBuffer, INPUT_BUFFER_MS } from './combatInput';
it('keeps only the latest recent intent and consumes it once', () => {
  const b = new CombatInputBuffer();
  b.push('basic');
  b.tick(60);
  b.push('hoa_ma_chi');
  b.tick(80);
  expect(b.take()).toBe('hoa_ma_chi');
  expect(b.take()).toBeNull();
  b.push('basic');
  b.tick(INPUT_BUFFER_MS);
  expect(b.peek()).toBeNull();
});
it('drops pending attacks when control is interrupted', () => {
  const b = new CombatInputBuffer();
  b.push('hoa_ma_chi');
  b.clear();
  b.tick(10);
  expect(b.peek()).toBeNull();
});
