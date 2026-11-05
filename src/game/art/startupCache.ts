import { optimizedAsset } from '../../data/assetDelivery';
import type { HeroId } from '../../data/heroes';
import { villageStartupImages } from '../../data/startupPlan';

type WarmImage = { image: HTMLImageElement; ready: boolean; promise: Promise<boolean> };
const images = new Map<string, WarmImage>();
const limit = 24;
const listeners = new Set<() => void>();
let selection: { id: HeroId; child: boolean } | undefined;

/** Fetch and decode during character selection, without starting a renderer. */
export function warmImage(url: string): Promise<boolean> {
  url = optimizedAsset(url);
  const existing = images.get(url);
  if (existing) return existing.promise;
  if (typeof Image === 'undefined') return Promise.resolve(false);
  const image = new Image();
  image.decoding = 'async';
  image.fetchPriority = 'low';
  let finish!: (ready: boolean) => void;
  const promise = new Promise<boolean>((resolve) => {
    finish = resolve;
  });
  const entry = { image, ready: false, promise };
  images.set(url, entry);
  if (images.size > limit) images.delete(images.keys().next().value!);
  image.onerror = () => {
    if (images.get(url) === entry) images.delete(url);
    finish(false);
  };
  image.onload = async () => {
    try {
      await image.decode();
      entry.ready = true;
      finish(true);
      listeners.forEach((listener) => listener());
    } catch {
      image.onerror?.(new Event('error'));
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

export function warmVillageStartup(id: HeroId, child: boolean) {
  selection = { id, child };
  listeners.forEach((listener) => listener());
  return Promise.all(villageStartupImages(id, child).map((entry) => warmImage(entry.url)));
}
