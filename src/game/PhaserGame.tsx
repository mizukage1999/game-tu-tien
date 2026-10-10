import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { PreloadScene } from './scenes/PreloadScene';
import { WorldScene } from './scenes/WorldScene';
import { gameStore } from '../store/gameStore';
import { screenToTurnedGame } from '../ui/TouchPlay';

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
    if (parent.closest('.app.turned') && parent.clientWidth >= 2 && parent.clientHeight >= 2) {
      scale.parentSize.setSize(Math.round(parent.clientWidth), Math.round(parent.clientHeight));
    }
    scale.refresh();
  };
  apply();
  game.events.once(Phaser.Core.Events.READY, apply);
  requestAnimationFrame(apply);
}

export function saveNow() {
  const world = game?.scene.getScene('World') as WorldScene | undefined;
  if (world?.scene.isActive()) world.save();
}

export function PhaserGame() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!host.current) return;
    game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host.current,
      backgroundColor: '#18202e',
      scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
      physics: { default: 'arcade', arcade: { debug: false } },
      render: { antialias: true, roundPixels: false },
      input: { activePointers: 3 },
      scene: [PreloadScene, WorldScene],
    });
    fitTurnedCanvas(game);
    if (import.meta.env.DEV) Object.assign(window, { __game: game, __store: gameStore });
    const onUnload = () => saveNow();
    window.addEventListener('beforeunload', onUnload);
    return () => {
      window.removeEventListener('beforeunload', onUnload);
      game?.destroy(true);
      game = null;
    };
  }, []);

  return <div ref={host} className="game-host" />;
}
