import { createStore } from 'zustand/vanilla';
import { parseCosmeticLook, type CosmeticLook } from '../data/cosmetics';

/** Try-on is explicitly local and temporary; it never enters a save, wallet or packet. */
export const appearanceStore = createStore<{
  selection: string | null;
  preview: CosmeticLook | null;
  until: number;
}>(() => ({ selection: null, preview: null, until: 0 }));
let expiry: ReturnType<typeof setTimeout> | undefined;
export function stopAppearancePreview() {
  clearTimeout(expiry);
  appearanceStore.setState({ preview: null, until: 0 });
}
export function tryAppearance(look: CosmeticLook) {
  stopAppearancePreview();
  appearanceStore.setState({ preview: parseCosmeticLook(look), until: Date.now() + 30000 });
  expiry = setTimeout(stopAppearancePreview, 30000);
}
