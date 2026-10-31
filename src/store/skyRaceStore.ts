import { createStore } from 'zustand/vanilla';
/** The flight overlay owns movement and invitations until its run closes. */
export const skyRaceStore = createStore<{ active: boolean }>(() => ({ active: false }));
