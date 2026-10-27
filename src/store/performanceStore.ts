import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { FrameBudget, type PerformanceTier } from '../game/systems/frameBudget';

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
export const performanceStore = createStore<{ tier: PerformanceTier }>(() => ({ tier: initial }));
export function sampleFrame(delta: number) {
  if (typeof document !== 'undefined' && document.hidden) {
    budget.reset();
    return;
  }
  const tier = budget.sample(delta);
  if (tier !== performanceStore.getState().tier) performanceStore.setState({ tier });
}
export function usePerformanceTier() {
  return useStore(performanceStore, (s) => s.tier);
}
