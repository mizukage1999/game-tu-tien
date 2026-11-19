import { App } from '@capacitor/app';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { EventBus, virtualInput } from '../game/EventBus';
import { isTypingTarget } from '../game/systems/typing';
import { gameStore } from '../store/gameStore';
import { chatStore } from '../store/chatStore';
import { socialStore } from '../store/socialStore';
import { partyDungeonStore } from '../net/partyDungeon';
import { skyRaceStore } from '../store/skyRaceStore';

/** Loaded after bootOnline: importing gameStore before cloud save resolution loses progress. */
export async function startAndroidRuntime(): Promise<() => void> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return () => {};
  let lastBack = 0;
  const resetInput = () => {
    virtualInput.x = 0;
    virtualInput.y = 0;
    window.dispatchEvent(new Event('blur'));
  };
  const save = () => EventBus.emit('cmd:save');
  const back = () => {
    const game = gameStore.getState();
    const social = socialStore.getState();
    const active = document.activeElement;
    // Give nested confirmations their existing Escape/cancel behaviour first.
    if (document.querySelector('[role="alertdialog"][aria-modal="true"]')) {
      lastBack = 0;
      (active instanceof HTMLElement ? active : document.body).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
      return;
    }
    if (isTypingTarget(active)) {
      lastBack = 0;
      (active as HTMLElement).blur();
      return;
    }
    if (chatStore.getState().open) {
      lastBack = 0;
      chatStore.getState().close();
      return;
    }
    if (social.card) {
      lastBack = 0;
      social.closeCard();
      return;
    }
    if (
      social.duel ||
      skyRaceStore.getState().active ||
      partyDungeonStore.getState().waiting ||
      game.rewardPending
    ) {
      lastBack = 0;
      game.toast('Dùng nút trong giao diện để hoàn tất hoặc rời hoạt động.');
      return;
    }
    if (game.menu || game.dialogNpc) {
      lastBack = 0;
      game.patch({ menu: null, dialogNpc: null });
      return;
    }
    const now = Date.now();
    if (lastBack && now - lastBack < 2000) {
      lastBack = 0;
      resetInput();
      save();
      void App.minimizeApp().catch(console.error);
    } else {
      lastBack = now;
      game.toast('Bấm Back lần nữa để thu nhỏ game.');
    }
  };
  const listeners: PluginListenerHandle[] = [];
  try {
    listeners.push(await App.addListener('backButton', back));
    listeners.push(
      await App.addListener('appStateChange', ({ isActive }) => {
        lastBack = 0;
        if (!isActive) {
          resetInput();
          save();
        } else window.dispatchEvent(new Event('resize'));
      }),
    );
  } catch (error) {
    for (const listener of listeners) void listener.remove();
    throw error;
  }
  return () => {
    for (const listener of listeners) void listener.remove();
  };
}
