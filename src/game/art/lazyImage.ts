import type Phaser from 'phaser';
import { optimizedAsset } from '../../data/assetDelivery';

const requests = new WeakMap<Phaser.Game, Map<string, Promise<boolean>>>();

/** Shared, on-demand image preparation. A stopped map cannot keep a request pending forever. */
export function ensureImage(
  scene: Phaser.Scene,
  key: string,
  url: string,
  ready: () => boolean,
  prepare: () => void,
): Promise<boolean> {
  if (ready()) return Promise.resolve(true);
  if (scene.textures.exists(key)) {
    try {
      prepare();
      return Promise.resolve(ready());
    } catch (error) {
      console.warn(`[assets] could not prepare ${key}`, error);
      return Promise.resolve(false);
    }
  }
  let cache = requests.get(scene.game);
  if (!cache) {
    cache = new Map();
    requests.set(scene.game, cache);
  }
  const existing = cache.get(key);
  if (existing) return existing;
  let finish!: (value: boolean) => void;
  const promise = new Promise<boolean>((resolve) => {
    finish = resolve;
  });
  cache.set(key, promise);
  const cleanup = () => {
    scene.load.off(`filecomplete-image-${key}`, loaded);
    scene.load.off('loaderror', failed);
    scene.events.off('shutdown', stopped);
    cache!.delete(key);
  };
  const stopped = () => {
    cleanup();
    finish(false);
  };
  const failed = (file: Phaser.Loader.File) => {
    if (file.key === key) stopped();
  };
  const loaded = () => {
    cleanup();
    try {
      prepare();
      finish(ready());
    } catch (error) {
      console.warn(`[assets] could not prepare ${key}`, error);
      finish(false);
    }
  };
  scene.load.once(`filecomplete-image-${key}`, loaded);
  scene.load.on('loaderror', failed);
  scene.events.once('shutdown', stopped);
  scene.load.image(key, optimizedAsset(url));
  if (!scene.load.isLoading()) scene.load.start();
  return promise;
}
