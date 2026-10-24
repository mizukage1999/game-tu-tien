const previews = new Map<string, HTMLCanvasElement>();
const listeners = new Set<() => void>();

export const getMapPreview = (id: string) => previews.get(id) ?? null;
export function subscribeMapPreviews(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Small snapshots, capped at six maps rather than retaining every full ground. */
export function setMapPreview(id: string, canvas: HTMLCanvasElement) {
  previews.delete(id); previews.set(id, canvas);
  while (previews.size > 6) previews.delete(previews.keys().next().value!);
  listeners.forEach(listener => listener());
}
