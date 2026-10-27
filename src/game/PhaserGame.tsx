import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { PreloadScene } from './scenes/PreloadScene';
import { WorldScene } from './scenes/WorldScene';
import { gameStore } from '../store/gameStore';
import { socialStore } from '../store/socialStore';
import { screenToTurnedGame } from '../ui/TouchPlay';
import { adaptiveDensity } from './systems/display';
import { performanceStore, sampleFrame } from '../store/performanceStore';
import { settingsStore, useSettings } from '../store/settingsStore';

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
    const density = adaptiveDensity(w, h, window.devicePixelRatio, settingsStore.getState().preferences.quality, performanceStore.getState().tier);
    const width = Math.round(w * density);
    const height = Math.round(h * density);
    if (scale.width === width && scale.height === height && game.registry.get('render-density') === density) return;
    game.registry.set('render-density', density);
    scale.resize(width, height);
    // NONE mode writes canvas CSS dimensions in setZoom. Apply it after the
    // buffer resize so turning a phone at density 1 cannot retain the old size.
    scale.setZoom(1 / density);
  };
  const observer = new ResizeObserver(apply);
  const stopPreferences = settingsStore.subscribe((next, prev) => {
    if (next.preferences.quality !== prev.preferences.quality) apply();
  });
  const stopPerformance = performanceStore.subscribe(apply);
  observer.observe(parent);
  window.addEventListener('resize', apply);
  apply();
  game.events.once(Phaser.Core.Events.READY, apply);
  const raf = requestAnimationFrame(apply);
  return () => {
    observer.disconnect();
    stopPreferences();
    stopPerformance();
    window.removeEventListener('resize', apply);
    cancelAnimationFrame(raf);
  };
}

export function saveNow() {
  const world = game?.scene.getScene('World') as WorldScene | undefined;
  if (world?.scene.isActive()) world.save();
}

export function PhaserGame() {
  const brightness = useSettings((s) => s.preferences.brightness);
  const host = useRef<HTMLDivElement>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!host.current) return;
    game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host.current,
      backgroundColor: '#18202e',
      scale: { mode: Phaser.Scale.NONE, width: host.current.clientWidth, height: host.current.clientHeight },
      physics: { default: 'arcade', arcade: { debug: false } },
      render: { antialias: true, roundPixels: false },
      input: { activePointers: 3 },
      fps: { target: 60, smoothStep: true },
      audio: { noAudio: true },
      scene: [PreloadScene, WorldScene],
    });
    const updateProgress = (progress: number) => setLoadingProgress(Math.round(progress * 100));
    const assetsReady = () => setLoading(false);
    const assetsLoading = () => { setLoadingProgress(0); setLoading(true); };
    const frame = (_time: number, delta: number) => sampleFrame(delta);
    game.events.on(Phaser.Core.Events.STEP, frame);
    game.events.on('assets-progress', updateProgress);
    game.events.on('assets-ready', assetsReady);
    game.events.on('assets-loading', assetsLoading);
    if (game.scene.isActive('World')) assetsReady();
    const stopFitting = fitTurnedCanvas(game);
    if (import.meta.env.DEV) Object.assign(window, { __game: game, __store: gameStore, __social: socialStore, __performance: performanceStore });
    const onUnload = () => saveNow();
    window.addEventListener('beforeunload', onUnload);
    return () => {
      window.removeEventListener('beforeunload', onUnload);
      stopFitting?.();
      game?.events.off('assets-progress', updateProgress);
      game?.events.off('assets-ready', assetsReady);
      game?.events.off('assets-loading', assetsLoading);
      game?.events.off(Phaser.Core.Events.STEP, frame);
      game?.destroy(true);
      game = null;
    };
  }, []);

  return (
    <>
      <div ref={host} className="game-host" style={{ filter: brightness === 100 ? undefined : `brightness(${brightness / 100})` }} />
      {loading && (
        <div className="loading-overlay" role="status" aria-live="polite">
          <img src="/assets/ui/ui-loading-orb.png" alt="" className="loading-orb" />
          <div className="loading-track">
            <span style={{ width: `${loadingProgress}%` }} />
          </div>
          <span>Đang tải... {loadingProgress}%</span>
        </div>
      )}
    </>
  );
}
