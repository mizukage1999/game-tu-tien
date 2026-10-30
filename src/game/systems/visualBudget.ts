export function effectVisible(
  view: { x: number; y: number; width: number; height: number },
  point: { x: number; y: number },
  extent: number,
) {
  const margin = Math.max(200, extent);
  return (
    point.x + margin >= view.x &&
    point.x - margin <= view.x + view.width &&
    point.y + margin >= view.y &&
    point.y - margin <= view.y + view.height
  );
}
export const SPELL_VISUAL_LIMIT = [18, 12, 8] as const;
