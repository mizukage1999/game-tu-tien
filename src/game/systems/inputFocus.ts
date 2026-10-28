import { gameStore } from '../../store/gameStore';
import { socialStore } from '../../store/socialStore';
import { chatStore } from '../../store/chatStore';
import { isTypingTarget } from './typing';
import { partyDungeonStore } from '../../net/partyDungeon';

/** UI actions may deliberately open another card; world actors may not steal it. */
export function worldInputBlocked() {
  const game = gameStore.getState(),
    social = socialStore.getState();
  return !!(
    game.menu ||
    partyDungeonStore.getState().phase === 'forming' ||
    partyDungeonStore.getState().waiting ||
    game.rewardPending ||
    game.dialogNpc ||
    game.dungeonResult ||
    social.card ||
    social.duel ||
    chatStore.getState().open
  );
}

/** Escape belongs to the open panel even when Phaser's keyboard is disabled. */
export function dismissWorldPanel(event: Pick<KeyboardEvent, 'key' | 'target' | 'preventDefault'>) {
  const social = socialStore.getState(),
    game = gameStore.getState();
  if (
    event.key !== 'Escape' ||
    isTypingTarget(event.target) ||
    social.card ||
    social.duel ||
    chatStore.getState().open ||
    (!game.menu && !game.dialogNpc)
  )
    return false;
  event.preventDefault();
  if (game.rewardPending) return true;
  game.patch({ menu: null, dialogNpc: null });
  return true;
}
