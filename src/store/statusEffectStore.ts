import { createStore } from 'zustand/vanilla';
import type { ActiveStatusEffect } from '../game/systems/statusEffects';

/** Presentation only: the combat engine remains the source of remaining time. */
export const statusEffectStore = createStore<{
  effects: ActiveStatusEffect[];
  sync: (effects: ActiveStatusEffect[]) => void;
}>()((set, get) => ({
  effects: [],
  sync: (effects) => {
    if (!effects.length && !get().effects.length) return;
    set({ effects });
  },
}));
