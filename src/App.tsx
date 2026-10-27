import { useEffect, useState } from 'react';
import { PhaserGame } from './game/PhaserGame';
import { Hud } from './ui/Hud';
import { CreateCharacter } from './ui/CreateCharacter';
import { loadGame } from './game/systems/save';
import { AuthScreen } from './ui/AuthScreen';
import { onlineEnabled } from './net/config';
import { getAccountState, useAccount } from './net/session';
import { startSocial } from './net/socialBridge';
import { usePhoneLayout, usePortrait, useTryLockLandscape } from './ui/TouchPlay';
import { refreshPremium, resetPremium } from './net/premium';
import { gameStore } from './store/gameStore';
import { StartScreen } from './ui/EntryScreen';
import { usePerformanceTier } from './store/performanceStore';
import { MobileViewport } from './ui/MobileViewport';

export function App() {
  const performanceTier = usePerformanceTier();
  const phone = usePhoneLayout();
  const portrait = usePortrait();
  const account = useAccount();
  const needsLogin = onlineEnabled && !account.user;
  const turned = phone && portrait && !needsLogin;
  const accountId = account.user?.id;
  const [ready, setReady] = useState(() => loadGame() !== null);
  const [entered, setEntered] = useState(false);
  useTryLockLandscape(phone);
  useEffect(() => {
    resetPremium();
    if (!ready) return;
    if (accountId)
      void refreshPremium().then(() => {
        if (getAccountState().user?.id === accountId) gameStore.getState().syncPremium();
      });
    else gameStore.getState().syncPremium();
  }, [accountId, ready]);
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
  // The social channel outlives individual maps, so it lives here rather than in the scene.
  useEffect(() => {
    if (needsLogin || !ready || !entered || !onlineEnabled) return;
    return startSocial();
  }, [needsLogin, ready, entered, account.user?.id]);

  return (
    <div className={`app${turned ? ' turned' : ''}`} data-performance={performanceTier}>
      <MobileViewport />
      {needsLogin ? (
        account.booting ? null : (
          <AuthScreen />
        )
      ) : ready && !entered ? (
        <StartScreen onStart={() => setEntered(true)} />
      ) : ready ? (
        <>
          <PhaserGame />
          {/* Warm sun from the north-east and cool shade below: the grade that ties the
              painted tiles together without touching the HUD. */}
          <div className="world-grade" aria-hidden="true" />
          <Hud />
        </>
      ) : (
        <CreateCharacter onDone={() => { setReady(true); setEntered(true); }} />
      )}
    </div>
  );
}

export default App;
