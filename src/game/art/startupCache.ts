import { optimizedAsset } from '../../data/assetDelivery';
import type { HeroId } from '../../data/heroes';
import { villageStartupImages } from '../../data/startupPlan';

type WarmImage = {
  image: HTMLImageElement;
  ready: boolean;
  promise: Promise<boolean>;
  cancel: () => void;
};
const images = new Map<string, WarmImage>();
const limit = 24;
const listeners = new Set<() => void>();
let selection: { id: HeroId; child: boolean } | undefined;
let generation = 0;
export interface ResourceProgress {
  completed: number;
  total: number;
  failed: number;
}

/** Fetch and decode during character selection, without starting a renderer. */
export function warmImage(url: string): Promise<boolean> {
  url = optimizedAsset(url);
  const existing = images.get(url);
  if (existing) return existing.promise;
  if (typeof Image === 'undefined') return Promise.resolve(false);
  const image = new Image();
  image.decoding = 'async';
  image.fetchPriority = 'low';
  let resolve!: (ready: boolean) => void;
  const promise = new Promise<boolean>((complete) => {
    resolve = complete;
  });
  let settled = false;
  const finish = (ready: boolean) => {
    if (settled) return;
    settled = true;
    clearTimeout(timeout);
    image.onload = null;
    image.onerror = null;
    if (!ready && images.get(url) === entry) images.delete(url);
    entry.ready = ready;
    resolve(ready);
    if (ready) listeners.forEach((listener) => listener());
  };
  const entry: WarmImage = {
    image,
    ready: false,
    promise,
    cancel: () => {
      if (settled) return;
      finish(false);
      image.src = '';
    },
  };
  const timeout = setTimeout(() => entry.cancel(), 15000);
  images.set(url, entry);
  if (images.size > limit) {
    const oldestReady = [...images].find(([, cached]) => cached.ready)?.[0];
    if (oldestReady) images.delete(oldestReady);
  }
  image.onerror = () => finish(false);
  image.onload = async () => {
    try {
      await image.decode();
      finish(true);
    } catch {
      finish(false);
    }
  };
  image.src = url;
  return promise;
}

export function warmedImage(url: string) {
  const entry = images.get(optimizedAsset(url));
  return entry?.ready ? entry.image : undefined;
}

export function clearStartupWarmCache() {
  generation++;
  images.forEach((entry) => entry.cancel());
  images.clear();
  selection = undefined;
}

export function subscribeStartupImages(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function readyStartupTextures() {
  if (!selection) return [];
  return villageStartupImages(selection.id, selection.child).flatMap((entry) => {
    const image = warmedImage(entry.url);
    return image ? [{ key: entry.key, image }] : [];
  });
}

/** Bound simultaneous decoding so mobile never opens a whole atlas library at once. */
export async function warmImages(
  urls: readonly string[],
  report?: (progress: ResourceProgress) => void,
) {
  const unique = [...new Set(urls.map(optimizedAsset))];
  const epoch = generation;
  let next = 0,
    completed = 0,
    failed = 0;
  report?.({ completed, total: unique.length, failed });
  const worker = async () => {
    while (next < unique.length && epoch === generation) {
      const ready = await warmImage(unique[next++]);
      completed++;
      if (!ready) failed++;
      report?.({ completed, total: unique.length, failed });
    }
  };
  await Promise.all(Array.from({ length: Math.min(3, unique.length) }, worker));
  return { completed, total: unique.length, failed };
}

export function warmVillageStartup(
  id: HeroId,
  child: boolean,
  report?: (progress: ResourceProgress) => void,
) {
  selection = { id, child };
  listeners.forEach((listener) => listener());
  return warmImages(
    villageStartupImages(id, child).map((entry) => entry.url),
    report,
  );
}
