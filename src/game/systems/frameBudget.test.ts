import { expect, it } from 'vitest';
import { FrameBudget } from './frameBudget';
import { adaptiveDensity } from './display';

it('reduces visual quality only after sustained slow frames, then recovers slowly', () => {
  const budget = new FrameBudget();
  for (let i = 0; i < 30; i++) budget.sample(33);
  expect(budget.tier).toBe(0);
  for (let i = 0; i < 100; i++) budget.sample(33);
  expect(budget.tier).toBe(2);
  for (let i = 0; i < 240; i++) budget.sample(16.667);
  expect(budget.tier).toBe(2);
  for (let i = 0; i < 600; i++) budget.sample(16.667);
  expect(budget.tier).toBe(1);
});
it('ignores hidden-tab gaps and does not reduce quality for normal 60 FPS timing', () => {
  const budget = new FrameBudget();
  for (let i = 0; i < 1200; i++) budget.sample(16.667);
  for (const delta of [10000, NaN, -1, Infinity]) budget.sample(delta);
  expect(budget.tier).toBe(0);
});
it('preserves Retina resolution while effects adapt, with a fixed 8 MP ceiling', () => {
  for (const [w, h] of [
    [844, 390],
    [1920, 1080],
    [3840, 2160],
  ]) {
    const sharp = adaptiveDensity(w, h, 3, 'sharp');
    expect(sharp).toBeGreaterThanOrEqual(1);
    expect(sharp * sharp * w * h).toBeLessThanOrEqual(Math.max(8_000_000, w * h) + 1);
  }
  expect(adaptiveDensity(844, 390, 3, 'sharp')).toBe(3);
  expect(adaptiveDensity(390, 844, 3, 'sharp')).toBe(3);
  expect(adaptiveDensity(844, 390, 2.75, 'sharp')).toBe(2.75);
  expect(adaptiveDensity(844, 390, 3, 'light')).toBe(1);
  expect(adaptiveDensity(844, 390, NaN, 'sharp')).toBe(1);
});
