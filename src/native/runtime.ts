import { Capacitor } from '@capacitor/core';

/** Import only after account hydration: platform handlers load the game store. */
export async function startNativeRuntime(): Promise<() => void> {
  if (!Capacitor.isNativePlatform()) return () => {};
  if (Capacitor.getPlatform() === 'ios') {
    const { startIOSRuntime } = await import('./ios');
    return startIOSRuntime();
  }
  if (Capacitor.getPlatform() === 'android') {
    const { startAndroidRuntime } = await import('./android');
    return startAndroidRuntime();
  }
  return () => {};
}
