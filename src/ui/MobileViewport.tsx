import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { isTypingTarget } from '../game/systems/typing';
import { usePhoneLayout, usePortrait } from './TouchPlay';
import './runtime-ui.css';

export function MobileViewport() {
  const phone = usePhoneLayout(),
    portrait = usePortrait();
  const [typing, setTyping] = useState(false),
    [hidden, setHidden] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    let request = 0;
    const update = () => {
      cancelAnimationFrame(request);
      request = requestAnimationFrame(() => {
        const view = window.visualViewport;
        root.style.setProperty('--visual-height', `${view?.height ?? window.innerHeight}px`);
        root.style.setProperty('--visual-top', `${view?.offsetTop ?? 0}px`);
        const focused = isTypingTarget(document.activeElement);
        setTyping(focused);
        root.classList.toggle(
          'keyboard-open',
          focused && window.innerHeight - (view?.height ?? window.innerHeight) > 80,
        );
      });
    };
    const focus = () => {
      setHidden(false);
      update();
    };
    document.addEventListener('focusin', focus);
    document.addEventListener('focusout', update);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    update();
    return () => {
      cancelAnimationFrame(request);
      document.removeEventListener('focusin', focus);
      document.removeEventListener('focusout', update);
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      root.classList.remove('keyboard-open');
      root.style.removeProperty('--visual-height');
      root.style.removeProperty('--visual-top');
    };
  }, []);
  if (!phone || !portrait || !typing || hidden) return null;
  const orientation = screen.orientation as
    (ScreenOrientation & { lock?: (type: string) => Promise<void> }) | undefined;
  const landscape = async () => {
    const input = document.activeElement as HTMLElement | null;
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen)
        await document.documentElement.requestFullscreen();
      await orientation?.lock?.('landscape');
    } catch {
      /* The device may require the user to physically rotate it. */
    }
    input?.focus({ preventScroll: true });
  };
  return createPortal(
    <div className="landscape-keyboard-hint" role="status">
      <span>↻ Xoay điện thoại ngang và tắt khóa xoay để dùng bàn phím ngang.</span>
      {orientation?.lock && <button onClick={() => void landscape()}>Chơi ngang</button>}
      <button aria-label="Ẩn gợi ý xoay màn hình" onClick={() => setHidden(true)}>
        ×
      </button>
    </div>,
    document.body,
  );
}
