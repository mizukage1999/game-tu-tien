import Phaser from 'phaser';
import type { WorldScene } from '../scenes/WorldScene';
import { AnimationController } from '../anim/AnimationController';
import { playerArt } from '../systems/character';
import { stepToward, type RemotePlayerState } from '../../net/presence';
import { socialStore } from '../../store/socialStore';
import type { Vec2 } from '../types';

const PARTY_COLOR = '#7dffa8';
const STRANGER_COLOR = '#cfe9ff';

/**
 * Another human in the same map. Purely cosmetic: no physics body, no health, no
 * collision, and its position is interpolated because updates arrive ~10 times a
 * second while the game draws at 60.
 */
export class RemotePlayer {
  private sprite: Phaser.GameObjects.Sprite;
  private ctrl: AnimationController;
  private shadow: Phaser.GameObjects.Image;
  private label: Phaser.GameObjects.Text;
  private state: RemotePlayerState;
  private target: Vec2;
  private tintTween?: Phaser.Tweens.Tween;

  constructor(
    world: WorldScene,
    state: RemotePlayerState,
  ) {
    this.state = state;
    this.target = { x: state.x, y: state.y };
    const art = playerArt(state.sex);
    this.sprite = world.add.sprite(state.x, state.y, art);
    this.ctrl = new AnimationController(this.sprite, art);
    this.shadow = world.add.image(state.x, state.y - 2, 'shadow').setDepth(-100);
    this.label = world.add
      .text(state.x, state.y - 84, state.name, {
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: STRANGER_COLOR,
        stroke: '#1a2240',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setDepth(90000);
    this.ctrl.play('idle', state.dir);
    // Clicking a body opens their card. The label is also clickable so a
    // crowded spawn still lets you pick someone.
    this.sprite.setInteractive({ useHandCursor: true });
    this.label.setInteractive({ useHandCursor: true });
    const open = () => socialStore.getState().openCard(state.userId);
    this.sprite.on('pointerdown', open);
    this.label.on('pointerdown', open);
    this.applyPartyStyle();
    // Party membership changes without a new presence entry, so re-check often.
    socialStore.subscribe(() => this.applyPartyStyle());
  }

  apply(next: RemotePlayerState) {
    this.state = next;
    this.target.x = next.x;
    this.target.y = next.y;
    if (next.name && next.name !== this.label.text) this.label.setText(next.name);
    this.applyPartyStyle();
  }

  update(dt: number) {
    const p = stepToward({ x: this.sprite.x, y: this.sprite.y }, this.target, dt);
    this.sprite.setPosition(p.x, p.y);
    this.sprite.setDepth(p.y);
    this.shadow.setPosition(p.x, p.y - 2);
    this.label.setPosition(p.x, p.y - 84);
    this.ctrl.play(this.state.moving ? 'run' : 'idle', this.state.dir);
  }

  /** Party members get a green name and a soft glow so you can spot them in a crowd. */
  private applyPartyStyle() {
    const { partyId } = socialStore.getState();
    const mine = !!partyId && this.state.party === partyId;
    const color = mine ? PARTY_COLOR : STRANGER_COLOR;
    if (this.label.style.color !== color) this.label.setColor(color);
    if (mine && !this.tintTween) {
      this.tintTween = this.sprite.scene.tweens.add({
        targets: this.sprite,
        alpha: { from: 0.92, to: 1 },
        duration: 700,
        yoyo: true,
        repeat: -1,
      });
    } else if (!mine && this.tintTween) {
      this.tintTween.stop();
      this.tintTween = undefined;
      this.sprite.setAlpha(1);
    }
  }

  destroy() {
    this.tintTween?.stop();
    this.label.destroy();
    this.shadow.destroy();
    this.sprite.destroy();
  }
}
