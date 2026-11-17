import { describe, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import { AnimationController } from './AnimationController';
import { HERO_ACTIONS, setHeroAnimationDefinition } from '../art/heroActionSpec';

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
      anims: {
        attack_1: { hitFrame: 1, repeat: 0 },
        idle: { repeat: -1 },
        run: { frames: 8, repeat: -1 },
        downed: { frames: 8, repeat: 0 },
      },
    },
    old: { originY: 1, dirs: ['down', 'side'], anims: { idle: { repeat: -1 } } },
  },
  animKey: (art: string, anim: string, dir: string) => `${art}:${anim}:${dir}`,
}));

function fixture(art = 'hero') {
  const registered = new Map<string, { key: string }>();
  const handlers: Record<string, (...args: unknown[]) => void> = {};
  const sprite = {
    setOrigin: vi.fn(),
    setFlipX: vi.fn(),
    on: vi.fn((event: string, handler: (...args: unknown[]) => void, context: unknown) => {
      handlers[event] = handler.bind(context);
    }),
    scene: { anims: { exists: () => true, get: (key: string) => registered.get(key) } },
    anims: {
      currentAnim: null as { key: string } | null,
      currentFrame: { index: 5 },
      isPlaying: false,
      play: vi.fn(),
    },
  };
  const controller = new AnimationController(sprite as unknown as Phaser.GameObjects.Sprite, art);
  return {
    controller,
    sprite,
    install: (key: string) => {
      const animation = { key };
      registered.set(key, animation);
      setHeroAnimationDefinition(animation, HERO_ACTIONS.attack_1);
    },
    emit: (event: string, ...args: unknown[]) => handlers[event](...args),
  };
}

describe('authored hero animation events', () => {
  it('finishes an old attack at its old hit frame when the new art arrives mid-swing', () => {
    const { controller, sprite, emit, install } = fixture(),
      hit = vi.fn();
    controller.play('attack_1', 'down', { lock: true, onHit: hit });
    install('hero:attack_1:down:authored');
    emit('update', {}, { index: 2 });
    emit('complete');
    expect(hit).toHaveBeenCalledTimes(1);
    hit.mockClear();
    controller.play('attack_1', 'down', { lock: true, force: true, onHit: hit });
    expect(sprite.anims.play).toHaveBeenLastCalledWith('hero:attack_1:down:authored', false);
    emit('update', {}, { index: 2 });
    expect(hit).not.toHaveBeenCalled();
    emit('update', {}, { index: 4 });
    emit('complete');
    expect(hit).toHaveBeenCalledTimes(1);
  });
  it('plays a death once and holds its last pose across repeated presence updates', () => {
    const { controller, sprite, emit } = fixture();
    controller.play('downed', 'down');
    sprite.anims.currentAnim = { key: 'hero:downed:down' };
    sprite.anims.isPlaying = true;
    controller.play('downed', 'down');
    expect(sprite.anims.play).toHaveBeenCalledTimes(1);
    sprite.anims.isPlaying = false;
    emit('complete');
    controller.play('downed', 'down');
    expect(sprite.anims.play).toHaveBeenCalledTimes(1);
    controller.play('idle', 'down');
    controller.play('downed', 'down', { force: true });
    expect(sprite.anims.play).toHaveBeenCalledTimes(3);
  });
  it('keeps the running phase when turning and does not restart on repeated movement updates', () => {
    const { controller, sprite } = fixture();
    controller.play('run', 'down');
    sprite.anims.isPlaying = true;
    sprite.anims.currentAnim = { key: 'hero:run:down' };
    controller.play('run', 'up-right');
    expect(sprite.anims.play).toHaveBeenLastCalledWith(
      { key: 'hero:run:up-right', startFrame: 4 },
      false,
    );
    sprite.anims.currentAnim = { key: 'hero:run:up-right' };
    sprite.anims.play.mockClear();
    controller.play('run', 'up-right');
    expect(sprite.anims.play).not.toHaveBeenCalled();
    controller.play('idle', 'up-right');
    expect(sprite.anims.play).toHaveBeenCalledWith('hero:idle:up-right', false);
  });
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
