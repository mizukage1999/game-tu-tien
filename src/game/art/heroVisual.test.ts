import { expect, it } from 'vitest';
import { heroWorldScale, mobileActorScale } from './heroVisual';

it('reduces adults by exactly 15% only on mobile, preserving children and PC sizes', () => {
  expect(heroWorldScale(true) / heroWorldScale(false)).toBeCloseTo(0.85);
  expect(heroWorldScale(false)).toBe(0.94);
  expect(heroWorldScale(true, true)).toBe(heroWorldScale(false, true));
  expect(mobileActorScale(true)).toBe(0.85);
  expect(mobileActorScale(false)).toBe(1);
});
