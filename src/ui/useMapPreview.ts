import { useSyncExternalStore } from 'react';
import { getMapPreview, subscribeMapPreviews } from '../game/art/mapPreviews';

export function useMapPreview(id: string) {
  return useSyncExternalStore(subscribeMapPreviews, () => getMapPreview(id), () => null);
}
