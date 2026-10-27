import Phaser from 'phaser';
import { gameStore } from '../../store/gameStore';
import { getMap } from '../maps';
import { finishMapAssets, queueMapAssets } from '../art/runtimeAssets';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }
  preload() {
    const s = gameStore.getState(),
      map = getMap(s.mapId);
    const destination = map.arena ? (s.dungeonReturn?.mapId ?? 'dai_thua_vien') : map.id;
    queueMapAssets(this, destination);
    this.load.on(Phaser.Loader.Events.PROGRESS, (progress: number) =>
      this.game.events.emit('assets-progress', progress * 0.9),
    );
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) =>
      console.warn('[assets] fallback: ' + file.key),
    );
  }
  create() {
    this.game.events.emit('assets-progress', 0.92);
    // Paint the progress overlay before preparing the character library.
    this.time.delayedCall(0, () => {
      try {
        finishMapAssets(this);
        const s = gameStore.getState(),
          map = getMap(s.mapId);
        this.scene.start('World', {
          mapId: map.arena ? (s.dungeonReturn?.mapId ?? 'dai_thua_vien') : map.id,
          pos: map.arena ? (s.dungeonReturn?.pos ?? null) : s.spawnPos,
        });
      } catch (error) {
        console.error('[game] asset preparation failed', error);
        this.game.events.emit('assets-error');
      }
    });
  }
}
