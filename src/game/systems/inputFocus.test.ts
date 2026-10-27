import { afterEach, expect, it } from 'vitest';
import { gameStore } from '../../store/gameStore';
import { socialStore } from '../../store/socialStore';
import { chatStore } from '../../store/chatStore';
import { dismissWorldPanel, worldInputBlocked } from './inputFocus';

const game = gameStore.getState(),
  social = socialStore.getState(),
  chat = chatStore.getState();
afterEach(() => {
  gameStore.setState(game);
  socialStore.setState(social);
  chatStore.setState(chat);
});
it('blocks world clicks throughout menus, inspection, chat, NPC dialog and arena activity', () => {
  gameStore.setState({ menu: null, dialogNpc: null, dungeonResult: null });
  socialStore.setState({ card: null, duel: null });
  chatStore.setState({ open: false });
  expect(worldInputBlocked()).toBe(false);
  for (const menu of ['character', 'bag', 'skills'] as const) {
    gameStore.setState({ menu });
    expect(worldInputBlocked()).toBe(true);
  }
  gameStore.setState({ menu: null });
  socialStore.getState().openCard('chosen-player');
  expect(worldInputBlocked()).toBe(true);
  socialStore.getState().closeCard();
  expect(worldInputBlocked()).toBe(false);
  chatStore.getState().show('near');
  expect(worldInputBlocked()).toBe(true);
  chatStore.getState().close();
  gameStore.setState({ dialogNpc: 'truong_lao' });
  expect(worldInputBlocked()).toBe(true);
  gameStore.setState({ dialogNpc: null });
  expect(worldInputBlocked()).toBe(false);
});

it('lets Escape close the current menu while leaving typing and inspection to their own controls', () => {
  gameStore.setState({ menu: 'character', dialogNpc: null });
  socialStore.setState({ card: null, duel: null });
  chatStore.setState({ open: false });
  const event = { key: 'Escape', target: null, preventDefault() {} };
  expect(
    dismissWorldPanel({ ...event, target: { tagName: 'INPUT' } as unknown as EventTarget }),
  ).toBe(false);
  expect(gameStore.getState().menu).toBe('character');
  expect(dismissWorldPanel(event)).toBe(true);
  expect(gameStore.getState().menu).toBeNull();
  socialStore.setState({ card: 'peer' });
  gameStore.setState({ menu: 'character' });
  expect(dismissWorldPanel(event)).toBe(false);
  expect(socialStore.getState().card).toBe('peer');
});
