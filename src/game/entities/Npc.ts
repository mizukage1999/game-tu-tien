import Phaser from 'phaser';
import { NPCS, QUESTS, type NpcDef } from '../../data';
import { AnimationController } from '../anim/AnimationController';
import { iso } from '../art/iso';
import { NPC_SPRITES } from '../systems/npcArt';
import { availableQuests, turnInQuests, type QuestLog } from '../systems/quest';
import type { WorldScene } from '../scenes/WorldScene';
import { visibleVerticalBounds } from '../art/visibleBounds';

const npcBounds = new Map<string, {top:number;bottom:number}>();

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
    const art = NPC_SPRITES[npcId]?.texture;
    const useAtlasArt = !!art && world.textures.exists(art);
    super(world, x, y, useAtlasArt ? art : def.art);
    this.def = def;
    this.map = { x, y };
    world.add.existing(this);
    const spot = iso(x, y);
    this.setPosition(spot.x, spot.y);
    if (useAtlasArt) {
      let bounds = npcBounds.get(art);
      if (!bounds) {
        const canvas = document.createElement('canvas');
        canvas.width = this.width; canvas.height = this.height;
        const ctx = canvas.getContext('2d', {willReadFrequently:true})!;
        const frame = this.frame;
        ctx.drawImage(frame.source.image as CanvasImageSource,frame.cutX,frame.cutY,frame.cutWidth,frame.cutHeight,0,0,this.width,this.height);
        bounds = visibleVerticalBounds(ctx.getImageData(0,0,this.width,this.height).data,this.width,this.height);
        npcBounds.set(art,bounds);
      }
      this.setOrigin(0.5, (bounds.bottom + 1) / this.height).setScale(118 / (bounds.bottom - bounds.top + 1));
    } else {
      const ctrl = new AnimationController(this, def.art);
      ctrl.play('idle', 'down');
      this.anims.setProgress(Math.random());
    }
    this.setDepth(spot.y);
    const labelY = spot.y - (useAtlasArt ? 128 : Math.max(104, this.displayHeight + 12));
    const markerY = labelY - 34;

    this.shadow = world.add.image(spot.x, spot.y - 2, 'shadow').setDepth(-100);
    // Set resolution at construction: Canvas uses the source pixel ratio,
    // which Phaser does not update when setResolution is called afterwards.
    this.label = world.add
      .text(spot.x, labelY, `${def.name}\n《${def.title}》`, {
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#ffe9a8',
        align: 'center',
        stroke: '#2a1a05',
        strokeThickness: 3,
        resolution: 2,
      })
      .setOrigin(0.5, 1)
      .setDepth(90000);
    this.marker = world.add
      .text(spot.x, markerY, '', {
        fontFamily: 'Georgia, serif',
        fontSize: '26px',
        fontStyle: 'bold',
        color: '#ffd84a',
        stroke: '#4a2a00',
        strokeThickness: 4,
        resolution: 2,
      })
      .setOrigin(0.5, 1)
      .setDepth(90001);
    world.tweens.add({ targets: this.marker, y: markerY - 6, yoyo: true, repeat: -1, duration: 600, ease: 'Sine.InOut' });
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
