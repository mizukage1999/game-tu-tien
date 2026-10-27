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
it('keeps the back buffer inside its GPU budget without changing simulation or device preferences', () => {
  for (const [w, h] of [
    [844, 390],
    [1920, 1080],
    [3840, 2160],
  ]) {
    const high = adaptiveDensity(w, h, 3, 'sharp', 0),
      low = adaptiveDensity(w, h, 3, 'sharp', 2);
    expect(low).toBeLessThan(high);
    expect(low).toBeGreaterThanOrEqual(0.65);
    expect(low * low * w * h).toBeLessThanOrEqual(Math.max(1_000_000, 0.65 ** 2 * w * h) + 1);
  }
});
