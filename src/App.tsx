import { useEffect } from 'react';
import { PhaserGame } from './game/PhaserGame';
import { Hud } from './ui/Hud';
import { usePhoneLayout, usePortrait, useTryLockLandscape } from './ui/TouchPlay';

export function App() {
  const phone = usePhoneLayout();
  const portrait = usePortrait();
  const turned = phone && portrait;
  useTryLockLandscape(phone);
  useEffect(() => {
    const kick = () => window.dispatchEvent(new Event('resize'));
    kick();
    const id = requestAnimationFrame(kick);
    visualViewport?.addEventListener('resize', kick);
    return () => {
      cancelAnimationFrame(id);
      visualViewport?.removeEventListener('resize', kick);
    };
  }, [turned]);
  return (
    <div className={`app${turned ? ' turned' : ''}`}>
      <PhaserGame />
      <Hud />
    </div>
  );
}
