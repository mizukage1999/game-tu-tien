import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { PreloadScene } from './scenes/PreloadScene';
import { WorldScene } from './scenes/WorldScene';
import { gameStore } from '../store/gameStore';

let game: Phaser.Game | null = null;

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
