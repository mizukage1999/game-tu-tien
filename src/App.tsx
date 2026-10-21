import { useEffect, useState } from 'react';
import { PhaserGame } from './game/PhaserGame';
import { Hud } from './ui/Hud';
import { CreateCharacter } from './ui/CreateCharacter';
import { loadGame } from './game/systems/save';
import { AuthScreen } from './ui/AuthScreen';
import { onlineEnabled } from './net/config';
import { useAccount } from './net/session';
import { startSocial } from './net/socialBridge';
import { usePhoneLayout, usePortrait, useTryLockLandscape } from './ui/TouchPlay';

export function App() {
  const phone = usePhoneLayout();
  const portrait = usePortrait();
  const turned = phone && portrait;
  const account = useAccount();
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
  // Online builds require a session first; offline builds never show this screen.
  const needsLogin = onlineEnabled && !account.user;
  // The social channel outlives individual maps, so it lives here rather than in the scene.
  useEffect(() => {
    if (needsLogin || !ready || !onlineEnabled) return;
    return startSocial();
  }, [needsLogin, ready, account.user?.id]);

  return (
    <div className={`app${turned ? ' turned' : ''}`}>
      {needsLogin ? (
        account.booting ? null : <AuthScreen />
      ) : ready ? (
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

export default App;
