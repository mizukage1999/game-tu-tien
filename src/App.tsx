import { useEffect, useState } from 'react';
import { PhaserGame } from './game/PhaserGame';
import { Hud } from './ui/Hud';
import { CreateCharacter } from './ui/CreateCharacter';
import { loadGame } from './game/systems/save';
import { AuthScreen } from './ui/AuthScreen';
import { onlineEnabled } from './net/config';
import { getAccountState, setAccountState, useAccount } from './net/session';
import { startSocial } from './net/socialBridge';
import { usePhoneLayout, usePortrait, useTryLockLandscape } from './ui/TouchPlay';
import { refreshPremium, resetPremium } from './net/premium';
import { gameStore } from './store/gameStore';
import { StartScreen } from './ui/EntryScreen';
import { usePerformanceTier } from './store/performanceStore';
import { MobileViewport } from './ui/MobileViewport';
import { bootStorage, consumeBootRetry } from './game/systems/gameBoot';
import { refreshMail, resetMail } from './net/gameMail';
import { maintenanceBlocks, useServerControl, watchServerControl } from './net/serverControl';
import { detachCloudSync } from './net/cloudSave';
import { disableSaving } from './game/systems/save';
import './ui/server-control.css';

export function App() {
  const performanceTier = usePerformanceTier();
  const phone = usePhoneLayout();
  const portrait = usePortrait();
  const account = useAccount();
  const control = useServerControl();
  const needsLogin = onlineEnabled && !account.user;
  const turned = phone && portrait && !needsLogin;
  const accountId = account.user?.id;
  const [ready, setReady] = useState(() => loadGame() !== null);
  const [entered, setEntered] = useState(() => consumeBootRetry(bootStorage()));
  useTryLockLandscape(phone);
  useEffect(() => {
    if (!accountId) return;
    return watchServerControl(
      () => gameStore.getState().mapId,
      () => {
        detachCloudSync();
        disableSaving();
        setAccountState({
          user: null,
          booting: false,
          status: 'idle',
          error: 'Phiên chơi đã dừng theo thông báo server.',
        });
      },
    );
  }, [accountId]);
  useEffect(() => {
    resetMail();
    if (!accountId) return resetMail;
    void refreshMail();
    const refresh = () => {
      if (document.visibilityState === 'visible') void refreshMail();
    };
    const timer = window.setInterval(refresh, 30000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
      resetMail();
    };
  }, [accountId]);
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
      {control.blocked || maintenanceBlocks(control) ? (
        <div className="server-gate">
          <section>
            <h1>{control.blocked ? 'Tài khoản đang bị khóa' : 'Máy chủ đang bảo trì'}</h1>
            <p>
              {control.blocked
                ? 'Vui lòng liên hệ quản trị viên.'
                : control.message || 'Vui lòng quay lại sau.'}
            </p>
            <button className="btn gold" onClick={() => location.reload()}>
              Thử kết nối lại
            </button>
            <a href="/admin/">Quản trị</a>
          </section>
        </div>
      ) : needsLogin ? (
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
        <CreateCharacter
          onDone={() => {
            setReady(true);
            setEntered(true);
          }}
        />
      )}
    </div>
  );
}

export default App;
