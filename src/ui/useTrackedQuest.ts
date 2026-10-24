import { useSyncExternalStore } from 'react';
import { subscribeQuestTracking, trackedQuest } from '../game/systems/questNav';

export function useTrackedQuest() {
  return useSyncExternalStore(subscribeQuestTracking, trackedQuest, () => null);
}
