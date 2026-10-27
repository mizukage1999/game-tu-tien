/** Let React unmount the arena and release its composited layers before the map draws. */
export function deferArenaReturn(resume: () => void) {
  let cancelled = false;
  let frame = requestAnimationFrame(() => {
    frame = requestAnimationFrame(() => {
      if (!cancelled) resume();
    });
  });
  return () => {
    cancelled = true;
    cancelAnimationFrame(frame);
  };
}
