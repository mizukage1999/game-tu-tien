import Phaser from 'phaser';
import { animKey, CHARACTERS, RIGS, type RigDef } from '../art/generate';
import type { Dir } from '../types';

interface PlayOptions {
  onHit?: () => void;
  onComplete?: () => void;
  /** Blocks further `play` calls (except forced ones) until the animation completes. */
  lock?: boolean;
  force?: boolean;
}

/** Chooses animation by state + facing, mirrors side views and fires gameplay events on the hit frame. */
export class AnimationController {
  readonly rig: RigDef;
  private current: { anim: string; opts: PlayOptions; hitFired: boolean } | null = null;
  private lockedFlag = false;

  constructor(
    private sprite: Phaser.GameObjects.Sprite,
    private art: string,
  ) {
    this.rig = RIGS[CHARACTERS[art].rig];
    sprite.setOrigin(0.5, this.rig.originY);
    sprite.on(Phaser.Animations.Events.ANIMATION_UPDATE, this.onUpdate, this);
    sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, this.onComplete, this);
  }

  get locked() {
    return this.lockedFlag;
  }

  get currentAnim() {
    return this.current?.anim ?? null;
  }

  private resolve(anim: string, dir: Dir): { key: string; flip: boolean | null } {
    const dirs = this.rig.anims[anim]?.dirs ?? this.rig.dirs;
    const horizontal = dir === 'left' || dir === 'right';
    if (dirs.includes(dir)) return { key: animKey(this.art, anim, dir), flip: false };
    if (dirs.includes('side') && horizontal) return { key: animKey(this.art, anim, 'side'), flip: dir === 'left' };
    if (dirs.includes('side')) return { key: animKey(this.art, anim, 'side'), flip: null };
    return { key: animKey(this.art, anim, dirs[0]), flip: false };
  }

  play(anim: string, dir: Dir, opts: PlayOptions = {}) {
    if (this.lockedFlag && !opts.force) return false;
    const { key, flip } = this.resolve(anim, dir);
    if (!this.sprite.scene.anims.exists(key)) return false;
    if (flip !== null) this.sprite.setFlipX(flip);
    const same = this.sprite.anims.currentAnim?.key === key && this.sprite.anims.isPlaying;
    const def = this.rig.anims[anim];
    if (same && def?.repeat === -1 && !opts.force) return true;
    this.current = { anim, opts, hitFired: false };
    this.lockedFlag = !!opts.lock;
    this.sprite.anims.play(key, false);
    return true;
  }

  unlock() {
    this.lockedFlag = false;
  }

  private onUpdate(_anim: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) {
    const cur = this.current;
    if (!cur || cur.hitFired || !cur.opts.onHit) return;
    const hitFrame = this.rig.anims[cur.anim]?.hitFrame;
    if (hitFrame === undefined) return;
    if (frame.index - 1 >= hitFrame) {
      cur.hitFired = true;
      cur.opts.onHit();
    }
  }

  private onComplete() {
    const cur = this.current;
    if (!cur) return;
    if (cur.opts.onHit && !cur.hitFired) {
      cur.hitFired = true;
      cur.opts.onHit();
    }
    if (cur.opts.lock) this.lockedFlag = false;
    const done = cur.opts.onComplete;
    this.current = null;
    done?.();
  }
}
