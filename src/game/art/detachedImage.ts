import type Phaser from 'phaser';

const requests = new WeakMap<Phaser.Game, Map<string, Promise<boolean>>>();
/** Background art must not join the destination map's Phaser loader queue. */
export function ensureDetachedImage(
  scene: Phaser.Scene,
  key: string,
  url: string,
  ready: () => boolean,
  prepare: (image: HTMLImageElement) => void,
): Promise<boolean> {
  if (ready()) return Promise.resolve(true);
  let cache = requests.get(scene.game);
  if (!cache) {
    cache = new Map();
    requests.set(scene.game, cache);
  }
  const existing = cache.get(key);
  if (existing) return existing;
  const image = new Image();
  image.decoding = 'async';
  image.fetchPriority = 'low';
  let finish!: (ready: boolean) => void,
    ended = false;
  const promise = new Promise<boolean>((resolve) => {
    finish = resolve;
  });
  cache.set(key, promise);
  const end = (value: boolean) => {
    if (ended) return;
    ended = true;
    image.onload = image.onerror = null;
    scene.events.off('shutdown', stopped);
    cache!.delete(key);
    finish(value);
  };
  const stopped = () => {
    end(false);
    image.src = '';
  };
  scene.events.once('shutdown', stopped);
  image.onerror = () => end(false);
  image.onload = () => {
    void (async () => {
      try {
        await image.decode();
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        if (ended) return;
        prepare(image);
        end(ready());
      } catch {
        end(false);
      }
    })();
  };
  image.src = url;
  return promise;
}
