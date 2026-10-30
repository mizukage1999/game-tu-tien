import Phaser from 'phaser';
import type { WorldScene } from '../scenes/WorldScene';
import type { Monster } from '../entities/Monster';
import { TILE } from '../art/tiles';
import { iso, isoVector } from '../art/iso';
import { seeded } from '../art/canvas';
import {
  activityPlan,
  activityMonster,
  ruinRooms,
  ACTIVITY_ART,
  type ActivityPlan,
} from './worldActivities';
import { activityAction, activityNow, activityStore } from '../../net/worldActivities';
import { gameStore } from '../../store/gameStore';
import { worldInputBlocked } from './inputFocus';
import { EventBus } from '../EventBus';
import type { MapDef } from '../maps/MapBuilder';

export function treasureSpot(map: MapDef, seed: number) {
  const queue = [{ x: map.playerSpawn[0], y: map.playerSpawn[1] }],
    seen = new Set<string>();
  for (let n = 0; n < queue.length; n++) {
    const p = queue[n];
    for (const [dx, dy] of [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ]) {
      const x = p.x + dx,
        y = p.y + dy,
        key = `${x},${y}`;
      if (
        x < 2 ||
        y < 2 ||
        x >= map.width - 2 ||
        y >= map.height - 2 ||
        map.blocked[y]?.[x] ||
        seen.has(key)
      )
        continue;
      seen.add(key);
      queue.push({ x, y });
    }
  }
  const candidates = queue.filter(
    (p) => Math.hypot(p.x - map.playerSpawn[0], p.y - map.playerSpawn[1]) > 7,
  );
  return candidates[Math.floor(seeded(seed)() * candidates.length)] ?? queue[0];
}
const artRequests = new WeakMap<Phaser.Scene, Promise<boolean>>();
function registerArtFrames(scene: Phaser.Scene) {
  const texture = scene.textures.get('world-activities'),
    source = texture.getSourceImage() as HTMLImageElement,
    width = source.width / 8,
    height = source.height / 6;
  for (let i = 0; i < 48; i++)
    if (!texture.has(String(i)))
      texture.add(i, 0, (i % 8) * width, Math.floor(i / 8) * height, width, height);
}
function ensureArt(scene: Phaser.Scene) {
  if (scene.textures.exists('world-activities')) {
    registerArtFrames(scene);
    return Promise.resolve(true);
  }
  const pending = artRequests.get(scene);
  if (pending) return pending;
  const request = new Promise<boolean>((resolve) => {
    const complete = () => {
      scene.load.off('loaderror', failed);
      if (!scene.textures.exists('world-activities')) {
        resolve(false);
        return;
      }
      registerArtFrames(scene);
      resolve(true);
    };
    const failed = (file: Phaser.Loader.File) => {
      if (file.key === 'world-activities') {
        scene.load.off('filecomplete-image-world-activities', complete);
        scene.load.off('loaderror', failed);
        artRequests.delete(scene);
        resolve(false);
      }
    };
    scene.load.once('filecomplete-image-world-activities', complete);
    scene.load.on('loaderror', failed);
    scene.load.image('world-activities', ACTIVITY_ART);
    if (!scene.load.isLoading()) scene.load.start();
  });
  artRequests.set(scene, request);
  return request;
}
export class WorldActivity {
  private plan: ActivityPlan | null = null;
  private loading = false;
  private disposed = false;
  private point = { x: 0, y: 0 };
  private marker?: Phaser.GameObjects.Image;
  private label?: Phaser.GameObjects.Text;
  private monster?: Monster;
  private monsterArt?: Phaser.GameObjects.Image;
  private seals = new Set<string>();
  private chests = new Set<string>();
  private capture: { x: number; y: number; damageAt: number; started: number } | null = null;
  private busy = false;
  private visuals: Phaser.GameObjects.GameObject[] = [];
  private born = 0;
  private lastDirection = 0;
  private nextRetry = 0;
  private gates: Phaser.GameObjects.Image[] = [];
  private trapHits = new Map<number, number>();
  private traps: { x: number; y: number; art: Phaser.GameObjects.Image }[] = [];
  constructor(private world: WorldScene) {}
  update() {
    const w = this.world;
    if (!activityStore.getState().synced || this.disposed) return;
    const ruins = w.map.id.startsWith('activity_ruins_'),
      plan = activityPlan(ruins ? 'ruins' : 'treasure', activityNow());
    if (ruins && (!plan.open || w.map.id !== plan.mapId)) {
      this.exit();
      return;
    }
    if (!ruins && (!plan.open || plan.mapId !== w.map.id)) {
      this.clear();
      return;
    }
    if (!this.plan && !this.loading && w.time.now >= this.nextRetry) {
      this.loading = true;
      void ensureArt(w).then((ok) => {
        this.loading = false;
        if (!ok) this.nextRetry = w.time.now + 15000;
        if (ok && !this.disposed) {
          this.plan = plan;
          this.build();
        }
      });
      return;
    }
    if (!this.plan) return;
    this.gates.forEach((g) => g.setFrame(8 + (Math.floor(w.time.now / 110) % 8)));
    if (!ruins && activityStore.getState().winner) {
      this.marker?.setFrame(41).disableInteractive();
      this.label?.setText('Dị Bảo đã có chủ · hẹn đợt kế tiếp');
      this.monsterArt?.setVisible(false);
      if (!w.shared || w.shared.authority) this.monster?.vanish();
      this.capture = null;
      return;
    }
    if (!ruins && !this.monster) {
      this.monster = w.monsters.find((m) => m.netId === `activity:${plan.seed}`);
      if (!this.monster && (!w.shared || w.shared.authority))
        this.monster = w.addSharedMonster(
          activityMonster(plan.level, 'treasure'),
          this.point.x,
          this.point.y,
          `activity:${plan.seed}`,
        );
    }
    const m = this.monster;
    if (m) {
      if (!this.monsterArt) {
        this.monsterArt = w.add
          .image(0, 0, 'world-activities', ruins ? 24 : 16)
          .setOrigin(0.5, 0.9)
          .setDisplaySize(ruins ? 160 : 140, ruins ? 160 : 140);
        this.visuals.push(this.monsterArt);
      }
      m.art.setVisible(false);
      const v = (m.body as Phaser.Physics.Arcade.Body).velocity,
        screen = isoVector(v.x, v.y);
      const direction =
        Math.hypot(v.x, v.y) > 2
          ? (Math.round((Math.atan2(screen.y, screen.x) - Math.PI / 2) / (Math.PI / 4)) + 8) % 8
          : this.lastDirection;
      this.lastDirection = direction;
      const spot = iso(m.x, m.y);
      this.monsterArt
        .setPosition(spot.x, spot.y)
        .setDepth(spot.y + 0.5)
        .setFrame((ruins ? 24 : 16) + direction)
        .setVisible(m.alive);
      if (m.sealed) {
        m.rootTimer = 1000;
        m.setVelocity(0, 0);
      }
    }
    if (this.marker && !ruins) {
      const age = w.time.now - this.born;
      this.marker.setFrame(age < 800 ? Math.floor(age / 100) : 40);
    }
    if (this.capture) {
      const p = w.player,
        c = this.capture;
      if (
        worldInputBlocked() ||
        p.ctrl.locked ||
        p.life.status !== 'alive' ||
        p.lastDamageAt > c.damageAt ||
        Math.hypot(p.x - c.x, p.y - c.y) > 24
      ) {
        this.capture = null;
        void activityAction('treasure', 'cancel', plan.seed);
        gameStore.getState().toast('Đoạt bảo bị gián đoạn.', 'warn');
      } else {
        this.label?.setText(
          `Đang đoạt bảo · ${Math.max(0, Math.ceil((5000 - (w.time.now - c.started)) / 1000))}s`,
        );
        if (w.time.now - c.started >= 5000 && !this.busy) {
          this.capture = null;
          void this.claim('claim');
        }
      }
    } else if (this.label && !ruins)
      this.label.setText(
        m?.alive ? 'Thiên Giáng Dị Bảo · hạ thú thủ bảo' : 'Thiên Giáng Dị Bảo · chạm để đoạt',
      );
    if (ruins) {
      const phase = w.time.now % 4000,
        cycle = Math.floor(w.time.now / 4000);
      for (const [i, t] of this.traps.entries()) {
        t.art.setAlpha(phase < 800 ? 0.4 + 0.4 * Math.sin(phase / 90) : phase < 1150 ? 1 : 0.35);
        if (
          phase >= 800 &&
          phase < 1150 &&
          this.trapHits.get(i) !== cycle &&
          Math.hypot(w.player.x - t.x, w.player.y - t.y) < 48 &&
          w.player.life.status === 'alive'
        ) {
          this.trapHits.set(i, cycle);
          w.player.takeHit(Math.round(gameStore.getState().stats.maxHp * 0.12), false, t);
        }
      }
    }
  }
  private build() {
    const w = this.world,
      p = this.plan!;
    this.born = w.time.now;
    if (p.kind === 'treasure') {
      void activityAction('treasure', 'start', p.seed);
      const tile = treasureSpot(w.map, p.seed);
      this.point = { x: (tile.x + 0.5) * TILE, y: (tile.y + 0.5) * TILE };
      const at = iso(this.point.x, this.point.y);
      this.marker = w.add
        .image(at.x, at.y, 'world-activities', 0)
        .setDisplaySize(132, 132)
        .setOrigin(0.5, 0.85)
        .setDepth(at.y + 1)
        .setInteractive({ useHandCursor: true });
      this.marker.on('pointerdown', () => void this.interact('activity_reward'));
      this.label = w.add
        .text(at.x, at.y + 16, 'Thiên Giáng Dị Bảo', {
          fontSize: '12px',
          color: '#ffdb8b',
          stroke: '#121820',
          strokeThickness: 3,
          resolution: 2,
        })
        .setOrigin(0.5)
        .setDepth(at.y + 2);
      this.visuals.push(this.marker, this.label);
      gameStore.getState().toast(`Dị Bảo giáng tại ${w.map.name} (${tile.x}, ${tile.y}).`, 'quest');
    } else {
      this.monster = w.monsters.find((m) => m.type.startsWith('activity_ruins_'));
      if (this.monster) this.monster.sealed = this.seals.size < 2;
      const r = ruinRooms(p.seed);
      for (const [i, n] of r.traps.entries()) {
        const tile = r.center(n),
          x = (tile.x + 0.5) * TILE,
          y = (tile.y + 0.5) * TILE,
          at = iso(x, y);
        const art = w.add
          .image(at.x, at.y, 'world-activities', 32 + (i % 4))
          .setDisplaySize(85, 85)
          .setOrigin(0.5, 0.8)
          .setDepth(at.y - 0.4);
        this.traps.push({ x, y, art });
        this.visuals.push(art);
      }
      for (const point of w.map.points ?? []) {
        const at = iso((point.x + 0.5) * TILE, (point.y + 0.5) * TILE),
          frame =
            point.id === 'activity_exit' ? 12 : point.id.startsWith('activity_seal') ? 37 : 40;
        const art = w.add
          .image(at.x, at.y, 'world-activities', frame)
          .setOrigin(0.5, 0.85)
          .setDisplaySize(92, 92)
          .setDepth(at.y + 1)
          .setInteractive({ useHandCursor: true });
        art.on('pointerdown', () => void this.interact(point.id));
        if (point.id === 'activity_exit') this.gates.push(art);
        this.visuals.push(art);
      }
    }
  }
  async interact(id: string) {
    const w = this.world,
      s = gameStore.getState(),
      plan = this.plan;
    if (!plan || this.busy || worldInputBlocked() || s.status !== 'alive') return;
    const target =
      plan.kind === 'treasure'
        ? this.point
        : (() => {
            const point = w.map.points?.find((p) => p.id === id);
            return point ? { x: (point.x + 0.5) * TILE, y: (point.y + 0.5) * TILE } : null;
          })();
    if (!target || Math.hypot(w.player.x - target.x, w.player.y - target.y) > 110) {
      s.toast('Đến gần bảo vật hoặc cơ quan để tương tác.', 'info');
      return;
    }
    if (id === 'activity_exit') {
      this.exit();
      return;
    }
    if (id.startsWith('activity_seal')) {
      this.seals.add(id);
      if (this.monster && this.seals.size >= 2) {
        this.monster.sealed = false;
        this.monster.rootTimer = 0;
      }
      s.toast(
        `Đã phá ${this.seals.size}/2 phong ấn. ${this.seals.size >= 2 ? 'Cổ thú đã thức tỉnh!' : ''}`,
        'quest',
      );
      return;
    }
    if (id.startsWith('activity_cache')) {
      if (this.chests.has(id)) {
        s.toast('Rương này đã được mở trong đợt hiện tại.', 'info');
        return;
      }
      if (await this.claim(id.endsWith('0') ? 'cache0' : 'cache1')) this.chests.add(id);
      return;
    }
    if (this.monster?.alive || !this.monster?.playerContribution) {
      s.toast('Cần hạ thủ vệ và đóng góp chiến đấu trước.', 'warn');
      return;
    }
    if (plan.kind === 'ruins') {
      await this.claim('claim');
      return;
    }
    if (this.capture) return;
    this.busy = true;
    const ready = await activityAction('treasure', 'capture', plan.seed);
    this.busy = false;
    if (ready && !this.disposed && activityNow() < plan.end) {
      s.setAuto(false);
      w.cancelQuestNav();
      w.player.setRoute([]);
      w.player.setVelocity(0, 0);
      this.capture = {
        x: w.player.x,
        y: w.player.y,
        damageAt: w.player.lastDamageAt,
        started: w.time.now,
      };
    } else s.toast(activityStore.getState().error || 'Chưa thể đoạt bảo.', 'warn');
  }
  private async claim(action: string) {
    this.busy = true;
    const result = await activityAction(this.plan!.kind, action, this.plan!.seed);
    this.busy = false;
    if (!this.disposed)
      gameStore
        .getState()
        .toast(
          result?.mail ? 'Phần thưởng đã gửi qua Thư.' : activityStore.getState().error,
          'quest',
        );
    return !!result?.mail;
  }
  private exit() {
    if (this.disposed) return;
    this.disposed = true;
    EventBus.emit('cmd:activityExit');
  }
  private clear() {
    if (this.capture && this.plan) void activityAction(this.plan.kind, 'cancel', this.plan.seed);
    if (this.plan?.kind === 'treasure' && (!this.world.shared || this.world.shared.authority))
      this.monster?.vanish();
    this.monster = undefined;
    this.visuals.forEach((v) => v.destroy());
    this.visuals = [];
    this.gates = [];
    this.marker = undefined;
    this.label = undefined;
    this.monsterArt = undefined;
    this.plan = null;
    this.capture = null;
  }
  destroy() {
    this.disposed = true;
    this.clear();
  }
}
