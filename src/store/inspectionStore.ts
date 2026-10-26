import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { PlayerInspection } from '../net/inspection';
interface InspectionState {
  target: string | null;
  nonce: string | null;
  status: 'idle' | 'loading' | 'ready' | 'unavailable';
  data: PlayerInspection | null;
  begin(target: string, nonce: string): void;
  complete(from: string, nonce: string, data: PlayerInspection): void;
  fail(nonce: string): void;
  reset(): void;
}
export const inspectionStore = createStore<InspectionState>((set, get) => ({
  target: null,
  nonce: null,
  status: 'idle',
  data: null,
  begin(target, nonce) {
    set({ target, nonce, status: 'loading', data: null });
  },
  complete(from, nonce, data) {
    const s = get();
    if (s.status === 'loading' && s.target === from && s.nonce === nonce && data.userId === from)
      set({ status: 'ready', data });
  },
  fail(nonce) {
    if (get().nonce === nonce && get().status === 'loading') set({ status: 'unavailable' });
  },
  reset() {
    set({ target: null, nonce: null, status: 'idle', data: null });
  },
}));
export function useInspection<T>(selector: (s: InspectionState) => T) {
  return useStore(inspectionStore, selector);
}
