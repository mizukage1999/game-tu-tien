import Phaser from 'phaser';
import type { WorldScene } from '../scenes/WorldScene';
import { findPath } from '../systems/path';
import { iso } from '../art/iso';
import { TILE } from '../art/tiles';
import type { Vec2 } from '../types';

/** Neutral itinerant AI; cultivation is used internally and never printed on its label. */
export class Wanderer {
  private art: Phaser.GameObjects.Image;
  private label: Phaser.GameObjects.Text;
  private route: Vec2[] = [];
  private think = 0;
  private attack = 0;
  constructor(
    private world: WorldScene,
    public pos: Vec2,
    public name: string,
    private cultivation: number,
    variant: number,
  ) {
    const at = iso(pos.x, pos.y);
    this.art = world.add
      .image(at.x, at.y, `wanderer-${variant}`)
      .setOrigin(0.5, 1)
      .setDisplaySize(116, 116);
    this.label = world.add
      .text(at.x, at.y - 110, `${name}\nTán Tu`, {
        fontFamily: 'Segoe UI',
        fontSize: '10px',
        align: 'center',
        color: '#c8dbbb',
        stroke: '#1b3028',
        strokeThickness: 2,
      })
      .setOrigin(0.5, 1)
      .setResolution(2)
      .setDepth(88000);
    this.art.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      if (Math.hypot(pos.x - world.player.x, pos.y - world.player.y) < 150)
        world.game.events.emit('wanderer-talk', name);
    });
  }
  update(dt: number) {
    this.think -= dt;
    this.attack -= dt;
    const target = this.world.nearestMonster(this.pos, 450);
    if (target && target.distanceTo(this.pos) < 75) {
      this.route = [];
      if (this.attack <= 0) {
        target.hit(
          Math.max(2, 8 + this.cultivation * 3 - target.def.def),
          false,
          this.pos,
          'wanderer',
        );
        this.attack = 1600;
      }
    } else if (this.think <= 0) {
      this.think = 1800 + Math.random() * 1400;
      const sx = Math.floor(this.pos.x / TILE),
        sy = Math.floor(this.pos.y / TILE);
      const gx = target
        ? Math.floor(target.x / TILE)
        : Math.max(1, Math.min(this.world.map.width - 2, sx + Math.floor(Math.random() * 13) - 6));
      const gy = target
        ? Math.floor(target.y / TILE)
        : Math.max(1, Math.min(this.world.map.height - 2, sy + Math.floor(Math.random() * 13) - 6));
      const path = findPath(this.world.map.blocked, sx, sy, gx, gy, target ? 1 : 0);
      this.route = path.reached
        ? [
            { x: (sx + 0.5) * TILE, y: (sy + 0.5) * TILE },
            ...path.tiles.map((t) => ({ x: (t.x + 0.5) * TILE, y: (t.y + 0.5) * TILE })),
          ]
        : [];
    }
    const goal = this.route[0];
    if (goal) {
      const dx = goal.x - this.pos.x,
        dy = goal.y - this.pos.y,
        d = Math.hypot(dx, dy),
        step = Math.min(d, (82 * dt) / 1000);
      if (d < 2) this.route.shift();
      else {
        this.pos.x += (dx / d) * step;
        this.pos.y += (dy / d) * step;
        this.art.setFlipX(dx < 0);
      }
    }
    const at = iso(this.pos.x, this.pos.y);
    this.art.setPosition(at.x, at.y).setDepth(at.y);
    this.label.setPosition(at.x, at.y - 110);
    this.label.setVisible(
      !Phaser.Geom.Intersects.RectangleToRectangle(
        this.label.getBounds(),
        this.world.player.nameplateBounds,
      ),
    );
  }
}
