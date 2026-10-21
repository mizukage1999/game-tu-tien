import type { SaveData } from '../game/systems/save';

/**
 * Picks the save to keep when a browser cache and the cloud disagree.
 *
 * The newer `savedAt` wins. Equal (or missing) timestamps keep the local copy, so
 * a fresh page load with an unreachable cloud never throws progress away.
 * Pure: unit tested in merge.test.ts.
 */
export function pickNewer(local: SaveData | null, cloud: SaveData | null): SaveData | null {
  if (!local) return cloud;
  if (!cloud) return local;
  const localAt = Number(local.savedAt) || 0;
  const cloudAt = Number(cloud.savedAt) || 0;
  return cloudAt > localAt ? cloud : local;
}
