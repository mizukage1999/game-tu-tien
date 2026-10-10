import { useEffect, useState } from 'react';
import { PhaserGame } from './game/PhaserGame';
import { Hud } from './ui/Hud';
import { CreateCharacter } from './ui/CreateCharacter';
import { loadGame } from './game/systems/save';
import { usePhoneLayout, usePortrait, useTryLockLandscape } from './ui/TouchPlay';

export function App() {
  const phone = usePhoneLayout();
  const portrait = usePortrait();
  const turned = phone && portrait;
  const [ready, setReady] = useState(() => loadGame() !== null);
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
  }, [turned, ready]);
  return (
    <div className={`app${turned ? ' turned' : ''}`}>
      {ready ? (
        <>
          <PhaserGame />
          <Hud />
        </>
      ) : (
        <CreateCharacter onDone={() => setReady(true)} />
      )}
    </div>
  );
}
