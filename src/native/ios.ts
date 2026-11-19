import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { EventBus, virtualInput } from '../game/EventBus';

/** iOS has no Android Back button. Save and release input before suspension. */
export async function startIOSRuntime(): Promise<() => void> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') return () => {};
  const listener = await App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) {
      window.dispatchEvent(new Event('resize'));
    } else {
      virtualInput.x = 0;
      virtualInput.y = 0;
      window.dispatchEvent(new Event('blur'));
      EventBus.emit('cmd:save');
    }
  });
  return () => { void listener.remove(); };
}
