import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';

export const SETTINGS_KEY = 'tu-tien-device-settings-v1';
export type RenderQuality = 'light' | 'balanced' | 'sharp';
export interface DeviceSettings {
  quality: RenderQuality;
  brightness: number;
  showDamage: boolean;
  showNames: boolean;
  hitEffects: boolean;
}
export const DEFAULT_SETTINGS: Readonly<DeviceSettings> = Object.freeze({
  quality: 'balanced',
  brightness: 100,
  showDamage: true,
  showNames: true,
  hitEffects: true,
});

/** Device preferences are independent of account saves and tolerate old/corrupt storage. */
export function normalizeSettings(raw: unknown): DeviceSettings {
  const p = raw && typeof raw === 'object' ? (raw as Partial<DeviceSettings>) : {};
  return {
    quality: p.quality === 'light' || p.quality === 'sharp' ? p.quality : 'balanced',
    brightness:
      typeof p.brightness === 'number' && Number.isFinite(p.brightness)
        ? Math.max(70, Math.min(130, Math.round(p.brightness)))
        : 100,
    showDamage: typeof p.showDamage === 'boolean' ? p.showDamage : true,
    showNames: typeof p.showNames === 'boolean' ? p.showNames : true,
    hitEffects: typeof p.hitEffects === 'boolean' ? p.hitEffects : true,
  };
}
function loadSettings() {
  try {
    return normalizeSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null'));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}
interface SettingsState {
  preferences: DeviceSettings;
  persisted: boolean;
  update(patch: Partial<DeviceSettings>): void;
  reset(): void;
}
function persist(preferences: DeviceSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(preferences));
    return true;
  } catch {
    return false;
  }
}
export const settingsStore = createStore<SettingsState>((set) => ({
  preferences: loadSettings(),
  persisted: true,
  update(patch) {
    set((state) => {
      const preferences = normalizeSettings({ ...state.preferences, ...patch });
      return { preferences, persisted: persist(preferences) };
    });
  },
  reset() {
    const preferences = { ...DEFAULT_SETTINGS };
    set({ preferences, persisted: persist(preferences) });
  },
}));
export function useSettings<T>(selector: (s: SettingsState) => T) {
  return useStore(settingsStore, selector);
}
