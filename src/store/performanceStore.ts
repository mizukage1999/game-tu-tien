import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { FrameBudget, FrameClock, type PerformanceTier } from '../game/systems/frameBudget';

const coarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
const memory =
  typeof navigator !== 'undefined'
    ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory
    : undefined;
const initial: PerformanceTier =
  memory && memory <= 2
    ? 2
    : coarse ||
        (typeof navigator !== 'undefined' &&
          navigator.hardwareConcurrency > 0 &&
          navigator.hardwareConcurrency <= 4)
      ? 1
      : 0;
const budget = new FrameBudget(initial);
const clock = new FrameClock();
export const performanceStore = createStore<{ tier: PerformanceTier }>(() => ({ tier: initial }));
export function sampleFrame(delta: number) {
  if (typeof document !== 'undefined' && document.hidden) {
    budget.reset();
    return;
  }
  const tier = budget.sample(delta);
  if (tier !== performanceStore.getState().tier) performanceStore.setState({ tier });
}
export function sampleRenderedFrame(now: number, active: boolean) {
  const visible = active && (typeof document === 'undefined' || !document.hidden);
  const delta = clock.sample(now, visible);
  if (!visible) {
    budget.reset();
    return;
  }
  if (delta !== null) sampleFrame(delta);
}
export function usePerformanceTier() {
  return useStore(performanceStore, (s) => s.tier);
}
