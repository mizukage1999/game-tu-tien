import Phaser from 'phaser';
import { animKey, CHARACTERS, RIGS, type RigDef } from '../art/generate';
import { cardinalDirection, type HeroDirection } from '../art/heroDirections';
import { heroAnimationDefinition } from '../art/heroActionSpec';

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
  private current: {
    anim: string;
    opts: PlayOptions;
    hitFired: boolean;
    hitFrame?: number;
  } | null = null;
  private lockedFlag = false;
  private finishedKey: string | null = null;
  private disposed = false;
  private releaseActions?: () => void;

  constructor(
    private sprite: Phaser.GameObjects.Sprite,
    private art: string,
  ) {
    this.rig = RIGS[CHARACTERS[art].rig];
    sprite.setOrigin(0.5, this.rig.originY);
    sprite.on(Phaser.Animations.Events.ANIMATION_UPDATE, this.onUpdate, this);
    sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, this.onComplete, this);
    if (art.startsWith('hero-v8-') && !art.includes('-child')) {
      // Never await this on the entry/map loading path. Keep the old valid poses until ready.
      void import('../art/heroActions')
        .then(async ({ ensureHeroActions }) => {
          await new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          );
          for (let attempt = 0; attempt < 3 && !this.disposed && sprite.active; attempt++) {
            const release = await ensureHeroActions(sprite.scene, art);
            if (this.disposed) {
              release?.();
              break;
            }
            if (release) {
              this.releaseActions = release;
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        })
        .catch(() => {});
    }
  }

  get locked() {
    return this.lockedFlag;
  }

  get currentAnim() {
    return this.current?.anim ?? null;
  }

  private resolve(anim: string, dir: HeroDirection): { key: string; flip: boolean | null } {
    const dirs = this.rig.anims[anim]?.dirs ?? this.rig.dirs;
    if (dirs.includes(dir)) return { key: animKey(this.art, anim, dir), flip: false };
    const cardinal = cardinalDirection(dir);
    const horizontal = cardinal === 'left' || cardinal === 'right';
    if (dirs.includes(cardinal)) return { key: animKey(this.art, anim, cardinal), flip: false };
    if (dirs.includes('side') && horizontal)
      return { key: animKey(this.art, anim, 'side'), flip: cardinal === 'left' };
    if (dirs.includes('side')) return { key: animKey(this.art, anim, 'side'), flip: null };
    return { key: animKey(this.art, anim, dirs[0]), flip: false };
  }

  play(anim: string, dir: HeroDirection, opts: PlayOptions = {}) {
    if (this.lockedFlag && !opts.force) return false;
    const resolved = this.resolve(anim, dir);
    const key = heroAnimationDefinition(this.sprite.scene.anims.get?.(resolved.key + ':authored'))
      ? resolved.key + ':authored'
      : resolved.key;
    const flip = resolved.flip;
    if (!this.sprite.scene.anims.exists(key)) return false;
    if (flip !== null) this.sprite.setFlipX(flip);
    const registered = this.sprite.scene.anims.get?.(key);
    const same =
      this.sprite.anims.currentAnim?.key === key &&
      this.sprite.anims.isPlaying &&
      (!registered || this.sprite.anims.currentAnim === registered);
    const def = heroAnimationDefinition(registered) ?? this.rig.anims[anim];
    if (!opts.force && (same || this.finishedKey === key)) return true;
    // Turning must not restart the gait at the same planted foot on every pointer move.
    const runPhase =
      anim === 'run' && this.current?.anim === 'run' && !opts.force && this.sprite.anims.isPlaying
        ? this.sprite.anims.currentFrame?.index
        : undefined;
    this.current = { anim, opts, hitFired: false, hitFrame: def?.hitFrame };
    this.finishedKey = null;
    this.lockedFlag = !!opts.lock;
    if (runPhase !== undefined && def?.frames)
      this.sprite.anims.play({ key, startFrame: (runPhase - 1) % def.frames }, false);
    else this.sprite.anims.play(key, false);
    return true;
  }

  unlock() {
    this.lockedFlag = false;
  }
  destroy() {
    this.disposed = true;
    this.releaseActions?.();
    this.sprite.off(Phaser.Animations.Events.ANIMATION_UPDATE, this.onUpdate, this);
    this.sprite.off(Phaser.Animations.Events.ANIMATION_COMPLETE, this.onComplete, this);
  }

  private onUpdate(_anim: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) {
    const cur = this.current;
    if (!cur || cur.hitFired || !cur.opts.onHit) return;
    const hitFrame = cur.hitFrame;
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
    if (cur.anim === 'downed' || cur.anim === 'die')
      this.finishedKey = this.sprite.anims.currentAnim?.key ?? null;
    const done = cur.opts.onComplete;
    this.current = null;
    done?.();
  }
}
