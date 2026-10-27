import { useEffect, useState } from 'react';
import { virtualInput } from '../game/EventBus';
import { isTypingTarget } from '../game/systems/typing';

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
  const [portrait, setPortrait] = useState(() => window.matchMedia(PORTRAIT_QUERY).matches);
  useEffect(() => {
    const query = window.matchMedia(PORTRAIT_QUERY);
    let width = document.documentElement.clientWidth || window.innerWidth;
    const sync = () => {
      const nextWidth = document.documentElement.clientWidth || window.innerWidth;
      // A software keyboard changes viewport height, not the device orientation.
      if (isTypingTarget(document.activeElement) && Math.abs(nextWidth - width) < 40) return;
      width = nextWidth; setPortrait(query.matches);
    };
    const focus = () => { width = document.documentElement.clientWidth || window.innerWidth; };
    const blur = () => { setTimeout(sync, 0); };
    query.addEventListener('change', sync); window.addEventListener('resize', sync);
    document.addEventListener('focusin', focus); document.addEventListener('focusout', blur);
    return () => { query.removeEventListener('change', sync); window.removeEventListener('resize', sync); document.removeEventListener('focusin', focus); document.removeEventListener('focusout', blur); };
  }, []);
  return portrait;
}

/**
 * Screen drag mapped into game directions.
 * `turned` is the portrait phone case: the page is rotated 90° clockwise, so a finger
 * moving down the phone is "right" in the game.
 */
/**
 * Page point → game pixels while `.app` is rotated 90° clockwise.
 * Layout +x runs down the phone; layout +y runs from the right edge toward the left.
 */
export function screenToTurnedGame(
  pageX: number,
  pageY: number,
  bounds: { x: number; y: number; width: number; height: number },
  gameWidth: number,
  gameHeight: number,
) {
  const x = bounds.height > 0 ? ((pageY - bounds.y) * gameWidth) / bounds.height : 0;
  const y = bounds.width > 0 ? ((bounds.x + bounds.width - pageX) * gameHeight) / bounds.width : 0;
  return { x, y };
}

export function swipeVector(dx: number, dy: number, turned: boolean) {
  const lx = turned ? dy : dx;
  const ly = turned ? -dx : dy;
  const dist = Math.hypot(lx, ly);
  if (dist < 0.12 * SWIPE_RADIUS) return { x: 0, y: 0 };
  const cap = Math.min(dist, SWIPE_RADIUS);
  return { x: (lx / dist) * (cap / SWIPE_RADIUS), y: (ly / dist) * (cap / SWIPE_RADIUS) };
}

/** Drag on the world to walk. Buttons and panels keep their own touches. */
export function SwipeMove({ active, turned }: { active: boolean; turned: boolean }) {
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
      !!target.closest('button, a, input, textarea, [role="dialog"], .inspect-backdrop, .chat-screen, .duel-screen, .panel-glass, .panel-ornate, .menu-backdrop, .minimap, .skill-bar, .exp-bar, .rotate-hint, .chat-log');

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
      const v = swipeVector(e.clientX - originX, e.clientY - originY, turned);
      virtualInput.x = v.x;
      virtualInput.y = v.y;
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
  }, [active, turned]);

  return null;
}

/** Best effort only: CSS can rotate the game but cannot rotate the OS keyboard. */
export function useTryLockLandscape(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const orientation = screen.orientation as (ScreenOrientation & { lock?: (type: string) => Promise<void> }) | undefined;
    const lock = () => { void orientation?.lock?.('landscape').catch(() => undefined); };
    lock(); document.addEventListener('fullscreenchange', lock);
    return () => document.removeEventListener('fullscreenchange', lock);
  }, [active]);
}
