import { describe, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import { AnimationController } from './AnimationController';

vi.mock('phaser', () => ({
  default: {
    Animations: { Events: { ANIMATION_UPDATE: 'update', ANIMATION_COMPLETE: 'complete' } },
  },
}));
vi.mock('../art/generate', () => ({
  CHARACTERS: { hero: { rig: 'eight' }, npc: { rig: 'old' } },
  RIGS: {
    eight: {
      originY: 0.9375,
      dirs: ['down', 'up-right'],
      anims: { attack_1: { hitFrame: 1, repeat: 0 }, idle: { repeat: -1 } },
    },
    old: { originY: 1, dirs: ['down', 'side'], anims: { idle: { repeat: -1 } } },
  },
  animKey: (art: string, anim: string, dir: string) => `${art}:${anim}:${dir}`,
}));

function fixture(art = 'hero') {
  const handlers: Record<string, (...args: unknown[]) => void> = {};
  const sprite = {
    setOrigin: vi.fn(),
    setFlipX: vi.fn(),
    on: vi.fn((event: string, handler: (...args: unknown[]) => void, context: unknown) => {
      handlers[event] = handler.bind(context);
    }),
    scene: { anims: { exists: () => true } },
    anims: { currentAnim: null, isPlaying: false, play: vi.fn() },
  };
  const controller = new AnimationController(sprite as unknown as Phaser.GameObjects.Sprite, art);
  return {
    controller,
    sprite,
    emit: (event: string, ...args: unknown[]) => handlers[event](...args),
  };
}

describe('authored hero animation events', () => {
  it('selects the authored diagonal and deals damage exactly once at its impact frame', () => {
    const { controller, sprite, emit } = fixture();
    const hit = vi.fn(),
      done = vi.fn();
    controller.play('attack_1', 'up-right', { onHit: hit, onComplete: done, lock: true });
    expect(sprite.anims.play).toHaveBeenCalledWith('hero:attack_1:up-right', false);
    expect(controller.play('idle', 'down')).toBe(false);
    emit('update', {}, { index: 1 });
    expect(hit).not.toHaveBeenCalled();
    emit('update', {}, { index: 2 });
    emit('update', {}, { index: 3 });
    emit('complete');
    expect(hit).toHaveBeenCalledTimes(1);
    expect(done).toHaveBeenCalledTimes(1);
    expect(controller.locked).toBe(false);
  });
  it('still delivers the impact if a slow frame skips animation updates', () => {
    const { controller, emit } = fixture();
    const hit = vi.fn();
    controller.play('attack_1', 'down', { onHit: hit, lock: true });
    emit('complete');
    expect(hit).toHaveBeenCalledTimes(1);
    expect(controller.locked).toBe(false);
  });
  it('maps diagonal movement to a mirrored side pose on legacy child and NPC rigs', () => {
    const { controller, sprite } = fixture('npc');
    controller.play('idle', 'up-left');
    expect(sprite.anims.play).toHaveBeenCalledWith('npc:idle:side', false);
    expect(sprite.setFlipX).toHaveBeenCalledWith(true);
  });
});
