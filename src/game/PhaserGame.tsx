import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { PreloadScene } from './scenes/PreloadScene';
import { WorldScene } from './scenes/WorldScene';
import { gameStore } from '../store/gameStore';
import { socialStore } from '../store/socialStore';
import { screenToTurnedGame } from '../ui/TouchPlay';
import { startupDensity } from './systems/display';
import {
  beginGameBoot,
  bootStorage,
  finishGameBoot,
  requestCanvasRecovery,
} from './systems/gameBoot';
import { performanceStore, sampleFrame } from '../store/performanceStore';
import { settingsStore, useSettings } from '../store/settingsStore';
import { LoadingScreen } from '../ui/LoadingScreen';

let game: Phaser.Game | null = null;

/**
 * Phaser sizes the canvas from getBoundingClientRect. A CSS-rotated parent reports
 * the portrait screen (the axis-aligned box), so the bitmap only covered half the
 * landscape stage and the rest stayed black. Measure the pre-transform layout
 * instead, and map taps through the same 90° turn.
 */
function fitTurnedCanvas(game: Phaser.Game) {
  const scale = game.scale;
  const parent = scale.parent as HTMLElement | null;
  if (!parent) return;

  const originalBounds = scale.getParentBounds.bind(scale);
  scale.getParentBounds = () => {
    if (!parent.closest('.app.turned') || parent.clientWidth < 2 || parent.clientHeight < 2) {
      return originalBounds();
    }
    const w = Math.round(parent.clientWidth);
    const h = Math.round(parent.clientHeight);
    const changed = scale.parentSize.width !== w || scale.parentSize.height !== h;
    if (changed) scale.parentSize.setSize(w, h);
    return changed;
  };

  const input = game.input;
  const originalTransform = input.transformPointer.bind(input);
  input.transformPointer = (pointer, pageX, pageY, wasMove) => {
    if (!parent.closest('.app.turned')) {
      originalTransform(pointer, pageX, pageY, wasMove);
      return;
    }
    const b = scale.canvasBounds;
    const point = screenToTurnedGame(pageX, pageY, b, scale.width, scale.height);
    const p0 = pointer.position;
    const p1 = pointer.prevPosition;
    p1.x = p0.x;
    p1.y = p0.y;
    const a = pointer.smoothFactor;
    if (!wasMove || a === 0) {
      p0.x = point.x;
      p0.y = point.y;
    } else {
      p0.x = point.x * a + p1.x * (1 - a);
      p0.y = point.y * a + p1.y * (1 - a);
    }
  };

  const apply = () => {
    if (!scale.parent) return;
    const w = Math.max(1, parent.clientWidth);
    const h = Math.max(1, parent.clientHeight);
    const gl = (game.renderer as Phaser.Renderer.WebGL.WebGLRenderer | null)?.gl;
    const maxEdge =
      gl && !gl.isContextLost()
        ? Math.min(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE), gl.getParameter(gl.MAX_TEXTURE_SIZE))
        : undefined;
    const density = startupDensity(
      w,
      h,
      window.devicePixelRatio,
      settingsStore.getState().preferences.quality,
      {
        mobile: window.matchMedia('(pointer: coarse)').matches,
        memory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
        mode: game.registry.get('boot-mode') ?? 0,
        maxEdge,
      },
    );
    const width = Math.round(w * density);
    const height = Math.round(h * density);
    if (
      scale.width === width &&
      scale.height === height &&
      game.registry.get('render-density') === density
    )
      return;
    game.registry.set('render-density', density);
    scale.resize(width, height);
    // NONE mode writes canvas CSS dimensions in setZoom. Apply it after the
    // buffer resize so turning a phone at density 1 cannot retain the old size.
    scale.setZoom(1 / density);
  };
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(apply);
  const stopPreferences = settingsStore.subscribe((next, prev) => {
    if (next.preferences.quality !== prev.preferences.quality) apply();
  });
  observer?.observe(parent);
  window.addEventListener('resize', apply);
  apply();
  game.events.once(Phaser.Core.Events.READY, apply);
  const raf = requestAnimationFrame(apply);
  return () => {
    observer?.disconnect();
    stopPreferences();
    window.removeEventListener('resize', apply);
    cancelAnimationFrame(raf);
  };
}

export function saveNow() {
  const world = game?.scene.getScene('World') as WorldScene | undefined;
  if (world?.scene.isActive() && world.player?.active) world.save();
}

export function PhaserGame() {
  const brightness = useSettings((s) => s.preferences.brightness);
  const host = useRef<HTMLDivElement>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [destination, setDestination] = useState({ mapId: gameStore.getState().mapId, mapName: '', phase: 'game' as 'game' | 'map' });

  useEffect(() => {
    if (!host.current) return;
    const storage = bootStorage(),
      mode = beginGameBoot(storage);
    const mobile = window.matchMedia('(pointer: coarse)').matches;
    let stable: ReturnType<typeof setTimeout> | undefined;
    let stalled: ReturnType<typeof setTimeout> | undefined;
    let alive = true;
    let enteredWorld = false;
    const failed = (message: string) => {
      if (!alive) return;
      clearTimeout(stable);
      clearTimeout(stalled);
      setLoading(true);
      setError(message);
    };
    const lost = (event: Event) => {
      event.preventDefault();
      failed('Thiết bị đã ngắt đồ họa. Hãy thử lại với cấu hình nhẹ.');
    };
    try {
      game = new Phaser.Game({
        type: mode === 2 ? Phaser.CANVAS : Phaser.AUTO,
        parent: host.current,
        backgroundColor: '#18202e',
        scale: {
          mode: Phaser.Scale.NONE,
          width: host.current.clientWidth,
          height: host.current.clientHeight,
        },
        physics: { default: 'arcade', arcade: { debug: false } },
        // Linear texture filtering keeps painted sprites smooth. MSAA adds large
        // framebuffer attachments on HiDPI phones but does not sharpen bitmap art.
        render: { antialias: true, antialiasGL: false, roundPixels: false, batchSize: 2048 },
        // No game object uses pre-FX. Its default framebuffer pool costs tens of MB.
        disablePreFX: true,
        disablePostFX: mobile || mode > 0,
        loader: { maxParallelDownloads: mobile ? 3 : 6, imageLoadType: 'HTMLImageElement' },
        input: { activePointers: 3 },
        fps: { target: 60, smoothStep: true },
        audio: { noAudio: true },
        scene: [PreloadScene, WorldScene],
        callbacks: {
          preBoot: (g) => g.registry.set('boot-mode', mode),
          postBoot: (g) => g.canvas.addEventListener('webglcontextlost', lost),
        },
      });
    } catch (cause) {
      console.error('[game] renderer startup failed', cause);
      failed('Không khởi tạo được đồ họa. Hãy thử lại với cấu hình nhẹ.');
      return () => {
        alive = false;
      };
    }
    const current = game;
    const watchLoading = () => {
      clearTimeout(stalled);
      stalled = setTimeout(
        () => failed('Tải game đang bị gián đoạn. Kiểm tra kết nối rồi thử lại.'),
        45_000,
      );
    };
    watchLoading();
    const updateProgress = (progress: number) => setLoadingProgress(Math.round(progress * 100));
    const assetsReady = () => {
      enteredWorld = true;
      clearTimeout(stalled);
      clearTimeout(stable);
      setError('');
      setLoading(false);
      stable = setTimeout(() => finishGameBoot(storage), 10_000);
    };
    const assetsLoading = (target?: { mapId?: string; mapName?: string }) => {
      setDestination({ mapId: target?.mapId ?? gameStore.getState().mapId, mapName: target?.mapName ?? '', phase: enteredWorld ? 'map' : 'game' });
      clearTimeout(stable);
      setError('');
      setLoadingProgress(0);
      setLoading(true);
      watchLoading();
    };
    const assetError = () =>
      failed('Không chuẩn bị được dữ liệu bản đồ. Hãy thử lại với cấu hình nhẹ.');
    const frame = (_time: number, delta: number) => sampleFrame(delta);
    game.events.on(Phaser.Core.Events.STEP, frame);
    game.events.on('assets-progress', updateProgress);
    game.events.on('assets-ready', assetsReady);
    game.events.on('assets-loading', assetsLoading);
    game.events.on('assets-error', assetError);
    if (game.scene.isActive('World')) assetsReady();
    const stopFitting = fitTurnedCanvas(game);
    if (import.meta.env.DEV)
      Object.assign(window, {
        __game: game,
        __store: gameStore,
        __social: socialStore,
        __performance: performanceStore,
      });
    const onUnload = () => saveNow();
    window.addEventListener('beforeunload', onUnload);
    return () => {
      alive = false;
      clearTimeout(stable);
      clearTimeout(stalled);
      finishGameBoot(storage);
      window.removeEventListener('beforeunload', onUnload);
      stopFitting?.();
      current.canvas?.removeEventListener('webglcontextlost', lost);
      current.events.off('assets-progress', updateProgress);
      current.events.off('assets-ready', assetsReady);
      current.events.off('assets-loading', assetsLoading);
      current.events.off('assets-error', assetError);
      current.events.off(Phaser.Core.Events.STEP, frame);
      current.destroy(true);
      if (game === current) game = null;
    };
  }, []);

  return (
    <>
      <div
        ref={host}
        className="game-host"
        style={{ filter: brightness === 100 ? undefined : `brightness(${brightness / 100})` }}
      />
      {loading && (
        <LoadingScreen progress={loadingProgress} {...destination} error={error} onRetry={() => {
                saveNow();
                requestCanvasRecovery(bootStorage());
                window.location.reload();
              }} />
      )}
    </>
  );
}
