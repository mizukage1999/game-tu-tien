import { useEffect, useState } from 'react';
import { virtualInput } from '../game/EventBus';

const PHONE_QUERY = '(hover: none) and (pointer: coarse), (hover: none) and (max-width: 900px)';
const PORTRAIT_QUERY = '(orientation: portrait)';
const SWIPE_RADIUS = 64;

function useMedia(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const sync = () => setMatches(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [query]);
  return matches;
}

export function usePhoneLayout() {
  return useMedia(PHONE_QUERY);
}

export function usePortrait() {
  return useMedia(PORTRAIT_QUERY);
}

/** Drag on the world to walk. Buttons and panels keep their own touches. */
export function SwipeMove({ active }: { active: boolean }) {
  useEffect(() => {
    if (!active) {
      virtualInput.x = 0;
      virtualInput.y = 0;
      return;
    }
    let id: number | null = null;
    let originX = 0;
    let originY = 0;

    const blocked = (target: EventTarget | null) =>
      target instanceof Element &&
      !!target.closest('button, a, input, textarea, .panel-glass, .panel-ornate, .menu-backdrop, .minimap, .skill-bar, .exp-bar, .rotate-hint, .chat-log');

    const stop = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = null;
      virtualInput.x = 0;
      virtualInput.y = 0;
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' || id !== null || blocked(e.target)) return;
      id = e.pointerId;
      originX = e.clientX;
      originY = e.clientY;
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      let dx = e.clientX - originX;
      let dy = e.clientY - originY;
      const dist = Math.hypot(dx, dy);
      if (dist > SWIPE_RADIUS) {
        dx = (dx / dist) * SWIPE_RADIUS;
        dy = (dy / dist) * SWIPE_RADIUS;
      }
      const mag = Math.min(1, dist / SWIPE_RADIUS);
      virtualInput.x = mag < 0.12 ? 0 : dx / SWIPE_RADIUS;
      virtualInput.y = mag < 0.12 ? 0 : dy / SWIPE_RADIUS;
    };

    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    return () => {
      virtualInput.x = 0;
      virtualInput.y = 0;
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };
  }, [active]);

  return null;
}

/** Ask a phone in portrait to turn sideways. Lock is best-effort; browsers often refuse it. */
export function RotateHint({ active }: { active: boolean }) {
  useEffect(() => {
    if (!active) return;
    const orientation = screen.orientation as ScreenOrientation & { lock?: (type: string) => Promise<void> };
    orientation.lock?.('landscape').catch(() => undefined);
  }, [active]);

  if (!active) return null;
  return (
    <div className="rotate-hint">
      <div className="rotate-glyph" />
      <p>Hãy xoay ngang điện thoại để chơi</p>
    </div>
  );
}
