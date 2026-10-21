import Phaser from 'phaser';
import { NPCS, QUESTS, type NpcDef } from '../../data';
import { AnimationController } from '../anim/AnimationController';
import { iso } from '../art/iso';
import { availableQuests, turnInQuests, type QuestLog } from '../systems/quest';
import type { WorldScene } from '../scenes/WorldScene';

/** Blocking is handled by the collision layer (the NPC tile is marked blocked). */
export class Npc extends Phaser.GameObjects.Sprite {
  readonly def: NpcDef;
  /** Where the NPC stands in map space; the sprite itself is drawn projected. */
  readonly map: { x: number; y: number };
  private label: Phaser.GameObjects.Text;
  private marker: Phaser.GameObjects.Text;
  private shadow: Phaser.GameObjects.Image;
  private lastLog: QuestLog | null = null;

  constructor(
    world: WorldScene,
    readonly npcId: string,
    x: number,
    y: number,
  ) {
    const def = NPCS[npcId];
    super(world, x, y, def.art);
    this.def = def;
    this.map = { x, y };
    world.add.existing(this);
    const spot = iso(x, y);
    this.setPosition(spot.x, spot.y);
    const ctrl = new AnimationController(this, def.art);
    this.setDepth(spot.y);
    ctrl.play('idle', 'down');
    this.anims.setProgress(Math.random());

    this.shadow = world.add.image(spot.x, spot.y - 2, 'shadow').setDepth(-100);
    this.label = world.add
      .text(spot.x, spot.y - 104, `${def.name}\n《${def.title}》`, {
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#ffe9a8',
        align: 'center',
        stroke: '#2a1a05',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setDepth(90000);
    this.marker = world.add
      .text(spot.x, spot.y - 138, '', {
        fontFamily: 'Georgia, serif',
        fontSize: '26px',
        fontStyle: 'bold',
        color: '#ffd84a',
        stroke: '#4a2a00',
        strokeThickness: 4,
      })
      .setOrigin(0.5, 1)
      .setDepth(90001);
    world.tweens.add({ targets: this.marker, y: spot.y - 144, yoyo: true, repeat: -1, duration: 600, ease: 'Sine.InOut' });
  }

  refreshMarker(log: QuestLog) {
    if (log === this.lastLog) return;
    this.lastLog = log;
    if (turnInQuests(log, QUESTS, this.npcId).length > 0) this.marker.setText('?').setColor('#ffd84a');
    else if (availableQuests(log, QUESTS, this.npcId).length > 0) this.marker.setText('!').setColor('#ffd84a');
    else this.marker.setText('');
  }

  destroy(fromScene?: boolean) {
    this.label?.destroy();
    this.marker?.destroy();
    this.shadow?.destroy();
    super.destroy(fromScene);
  }
}
