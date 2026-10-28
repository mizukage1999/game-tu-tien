import Phaser from 'phaser';
import { COMPANIONS, lifeProgress, companionStats } from '../systems/life';
import { gameStore } from '../../store/gameStore';
import type { WorldScene } from '../scenes/WorldScene';
import { iso } from '../art/iso';
import { findPath } from '../systems/path';
import { isChildhood } from '../systems/origin';
import type { Vec2 } from '../types';
import type { Monster } from './Monster';

export class Companion {
  private art: Phaser.GameObjects.Image;
  private label: Phaser.GameObjects.Text;
  private pos: Vec2;
  private route: Vec2[] = [];
  private think = 0;
  private attack = 0;
  private active = '';
  private skillTimer = 0;
  constructor(private world: WorldScene) {
    this.pos = { x: world.player.x, y: world.player.y };
    this.art = world.add.image(0, 0, 'fx_dot').setOrigin(0.5, 1).setVisible(false);
    this.label = world.add
      .text(0, 0, '', { fontSize: '9px', color: '#badbc4', stroke: '#173629', strokeThickness: 2, resolution: 2 })
      .setOrigin(0.5, 1)
      .setDepth(87000)
      .setVisible(false);
  }
  update(dt: number) {
    const p = gameStore.getState().player,
      l = lifeProgress(p),
      index = COMPANIONS.findIndex((c) => c.id === l.companion),
      own = l.companion && l.companions[l.companion];
    const show = index >= 0 && !!own && !isChildhood(p);
    this.art.setVisible(show);
    this.label.setVisible(show);
    if (!show) return;
    if (this.active !== l.companion) {
      this.active = l.companion!;
      this.art.setTexture(`companion-${index}`).setDisplaySize(78, 78);
      this.label.setText(COMPANIONS[index].name);
    }
    this.think -= dt;
    this.attack -= dt;
    this.skillTimer-=dt;
    const hero = this.world.player;
    if (Math.hypot(this.pos.x - hero.x, this.pos.y - hero.y) > 900) {
      this.pos = { x: hero.x, y: hero.y };
      this.route = [];
    }
    if (this.think <= 0) {
      this.think = 650;
      const sx = Math.floor(this.pos.x / 48),
        sy = Math.floor(this.pos.y / 48),
        gx = Math.floor(hero.x / 48),
        gy = Math.floor(hero.y / 48);
      const path = findPath(this.world.map.blocked, sx, sy, gx, gy, 1);
      this.route = path.reached
        ? (path.tiles.length ? [{x:(sx+.5)*48,y:(sy+.5)*48},...path.tiles.map((t) => ({ x: (t.x + 0.5) * 48, y: (t.y + 0.5) * 48 }))] : [])
        : [];
    }
    const goal = this.route[0];
    if (goal) {
      const dx = goal.x - this.pos.x,
        dy = goal.y - this.pos.y,
        d = Math.hypot(dx, dy);
      if (d < 3) this.route.shift();
      else {
        const step = Math.min(d, (220 * dt) / 1000);
        this.pos.x += (dx / d) * step;
        this.pos.y += (dy / d) * step;
        this.art.setFlipX(dx < 0);
      }
    }
    const at = iso(this.pos.x, this.pos.y);
    this.art.setPosition(at.x, at.y).setDepth(at.y - 0.1);
    this.label.setPosition(at.x, at.y - 75);
    this.label.setVisible(
      !Phaser.Geom.Intersects.RectangleToRectangle(this.label.getBounds(), hero.nameplateBounds),
    );
    const target = this.world.target;
    const evolution=p.adventure?.evolution[l.companion!]??0;
    if(this.skillTimer<=0&&gameStore.getState().status==='alive'&&!l.retreat){
      const strength=1+evolution*.5,store=gameStore.getState();
      if(l.companion==='white_crane'&&p.hp<store.stats.maxHp*.85){store.restore(Math.round(store.stats.maxHp*.12*strength),20);this.world.vfx.ascend(hero);this.skillTimer=12000;}
      else if(l.companion==='jade_deer'&&this.world.time.now-hero.lastDamageAt<4000){hero.grantShield(Math.round(store.stats.maxHp*.12*strength),5000);this.skillTimer=12000;}
      else if(target?.alive&&target.distanceTo(this.pos)<240){
        const power=companionStats(p).atk*(l.companion==='gold_tiger'?3:2)*strength;
        if(l.companion==='red_fox')for(const m of this.world.monsters.filter(m=>m.alive&&m.distanceTo(target)<125))this.hit(m,Math.round(power));
        else this.hit(target,Math.round(power));
        if(l.companion==='snow_fox'||l.companion==='shadow_wolf')target.slowTimer=Math.max(target.slowTimer,1800+evolution*500);
        this.skillTimer=8000;
      }
    }
    if (
      target?.alive &&
      target.distanceTo(this.pos) < 170 &&
      this.attack <= 0 &&
      gameStore.getState().status === 'alive' &&
      !l.retreat
    ) {
      this.hit(target,Math.max(1, companionStats(p).atk - target.def.def / 2));
      this.attack = 1700;
    }
  }
  private hit(target:Monster,amount:number){
    if(this.world.shared){this.world.shared.auxiliary(target,amount);return;}
    target.hit(amount,false,this.pos);
  }
}
