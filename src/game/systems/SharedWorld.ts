import type { WorldScene } from '../scenes/WorldScene';
import type { Monster } from '../entities/Monster';
import type { WorldChannel } from '../../net/worldChannel';
import type { RemotePlayerState } from '../../net/presence';
import { mayPk, worldSkillHit, type CombatStats, type WorldEvent } from '../../net/worldProtocol';
import { gameStore } from '../../store/gameStore';
import { getAccountState } from '../../net/session';
import { heroFor } from '../../data/heroes';
import { heroSpell } from '../../data/heroSkills';
import { effectiveSkill, skillLoadout } from './skills';
import { computeDamage, realmIndexAtLevel, realmDamageMultiplier } from './combat';
import { adventure } from './adventure';
import { isChildhood } from './origin';
import { gridLineClear } from './gridNavigation';
import { TILE } from '../art/tiles';
import { iso, isoVector } from '../art/iso';
import { heroDirection } from '../art/heroDirections';
import { chatStore } from '../../store/chatStore';
import { socialStore } from '../../store/socialStore';
import { contributionAwards, recordContribution, type Contribution } from './contribution';
import { monsterDrops } from './loot';
import { killExp } from './scale';

type Cast = Extract<WorldEvent, { t: 'cast' }>;
type Actor = RemotePlayerState & { combat: CombatStats };
/** One elected peer simulates a public map; all other peers render its monster snapshots. */
export class SharedWorld {
  roster: RemotePlayerState[] = [];
  private seq = 0;
  private nextMonster = 0;
  private lastSnapshot = 0;
  private snapshotOwner = '';
  private snapshotSeq = -1;
  private seen = new Map<string, number>();
  private rewards = new Set<string>();
  private cooldowns = new Map<string, number>();
  private contributions = new Map<string, Contribution[]>();
  private activity = new Map<string, { count: number; first: number; last: number }>();
  private stop: () => void;
  constructor(
    private world: WorldScene,
    readonly channel: WorldChannel,
  ) {
    for (const m of world.monsters) m.netId = `m:${this.nextMonster++}`;
    this.stop = channel.onEvent((event, from) => this.receive(event, from));
  }
  get authority() {
    return this.channel.authority === this.channel.selfKey;
  }
  self(): Actor {
    const s = gameStore.getState(),
      p = s.player,
      stats = s.stats,
      v = this.world.player.networkPose();
    return {
      ...v,
      key: this.channel.selfKey,
      userId: getAccountState().user?.id ?? 'me',
      name: p.name,
      sex: p.sex ?? 'female',
      heroId: p.heroId,
      realm: v.realm ?? '',
      updatedAt: Date.now(),
      pkMode: p.pkMode ?? 'peace',
      sect: adventure(p).boundSect,
      child: isChildhood(p),
      party: socialStore.getState().partyId ?? undefined,
      combat: {
        atk: stats.atk,
        def: stats.def,
        maxHp: stats.maxHp,
        hp: p.hp,
        maxMp: stats.maxMp,
        mp: p.mp,
        critRate: stats.critRate,
        critMul: stats.critMul,
        level: p.level,
        loadout: skillLoadout(p),
        skills: p.skills ?? {},
      },
    };
  }
  actor(key: string): Actor | undefined {
    if (key === this.channel.selfKey) return this.self();
    const p = this.roster.find((p) => p.key === key);
    return p?.combat ? (p as Actor) : undefined;
  }
  actors() {
    return [this.self(), ...(this.roster.filter((p) => p.combat) as Actor[])];
  }
  opponent(range: number) {
    if (this.world.cooperativeRun) return undefined;
    const self = this.self();
    return this.actors()
      .filter(
        (p) =>
          p.key !== self.key &&
          p.combat.hp > 0 &&
          mayPk(
            { mode: self.pkMode, sect: self.sect, child: self.child, mapId: this.world.map.id },
            p,
          ) &&
          Math.hypot(p.x - self.x, p.y - self.y) <= range,
      )
      .sort(
        (a, b) => Math.hypot(a.x - self.x, a.y - self.y) - Math.hypot(b.x - self.x, b.y - self.y),
      )[0];
  }
  target(m: Monster) {
    const p = this.actors()
      .filter((p) => p.combat.hp > 0 && !p.child)
      .sort((a, b) => m.distanceTo(a) - m.distanceTo(b))[0];
    m.targetKey = p?.key ?? '';
    return p ?? null;
  }
  tick(dt: number) {
    this.lastSnapshot += dt;
    if (!this.authority || this.lastSnapshot < 150) return;
    this.lastSnapshot = 0;
    for (const m of this.world.monsters) if (!m.netId) m.netId = `m:${this.nextMonster++}`;
    this.channel.send({
      t: 'monsters',
      seq: ++this.seq,
      monsters: this.world.monsters.map((m) => m.networkState()),
    });
    const run = this.world.partyRunSnapshot();
    if (run)
      this.channel.send({
        t: 'dungeon-run',
        seq: ++this.seq,
        ...run,
        eligible: this.activePartyMembers(),
      });
  }
  attack(skill: Cast['skill'], combo = 1) {
    const p = this.world.player,
      f = p.facing;
    this.channel.send({
      t: 'cast',
      seq: ++this.seq,
      skill,
      x: p.x,
      y: p.y,
      dx: f.x,
      dy: f.y,
      combo,
    });
  }
  auxiliary(m: Monster, amount: number) {
    this.channel.send({ t: 'aux-hit', seq: ++this.seq, id: m.netId, amount });
  }
  killed(m: Monster) {
    if (this.world.cooperativeRun) return;
    if (this.authority && m.playerContribution && m.lastAttacker) {
      const key = `${m.netId}:${m.generation}`;
      const awards = contributionAwards(
        this.contributions.get(key) ?? [],
        this.actors().map((a) => ({ ...a, alive: a.combat.hp > 0 })),
        { x: m.x, y: m.y, hp: m.def.hp },
        killExp(m.def),
        monsterDrops(m.def, !!this.world.map.arena),
      );
      this.contributions.delete(key);
      this.channel.send({
        t: 'kill',
        id: m.netId,
        generation: m.generation,
        killer: m.lastAttacker,
        awards,
      });
    }
  }
  private credit(m: Monster, key: string, damage: number) {
    const id = `${m.netId}:${m.generation}`;
    if (this.contributions.size > 512)
      this.contributions.delete(this.contributions.keys().next().value!);
    this.contributions.set(
      id,
      recordContribution(
        this.contributions.get(id) ?? [],
        key,
        m.damageTaken(damage),
        m.hp,
        Date.now(),
      ),
    );
  }
  registerMonster(m: Monster) {
    if (this.authority && !m.netId) m.netId = `m:${this.nextMonster++}`;
  }
  private once(key: string, seq: number) {
    const last = this.seen.get(key) ?? -1;
    if (seq <= last) return false;
    this.seen.set(key, seq);
    return true;
  }
  private receive(e: WorldEvent, from: string) {
    const w = this.world;
    if (e.t === 'dungeon-run') {
      if (
        from !== this.channel.authority ||
        from === this.channel.selfKey ||
        !this.once(`run:${from}`, e.seq)
      )
        return;
      w.applyPartyRunSnapshot(e);
      return;
    }
    if (e.t === 'support') {
      if (
        from !== this.channel.authority ||
        !this.once(`support:${from}`, e.seq) ||
        e.to !== this.channel.selfKey
      )
        return;
      if (e.kind === 'heal') gameStore.getState().restore(e.amount, 0);
      else w.player.grantShield(e.amount, e.duration);
      return;
    }
    if (e.t === 'monsters') {
      if (from === this.channel.selfKey || from !== this.channel.authority) return;
      if (this.snapshotOwner !== from) {
        this.snapshotOwner = from;
        this.snapshotSeq = -1;
      }
      if (e.seq <= this.snapshotSeq) return;
      this.snapshotSeq = e.seq;
      for (const state of e.monsters) {
        if (state.x > w.map.width * TILE || state.y > w.map.height * TILE) continue;
        let m = w.monsters.find((m) => m.netId === state.id);
        if (!m && state.type !== 'wanderer')
          m = w.addSharedMonster(state.type, state.homeX, state.homeY, state.id);
        if (m) m.applyNetwork(state);
      }
      return;
    }
    if (e.t === 'cast') {
      if (w.cooperativeRun && w.partyWaiting) return;
      if (!this.once(`cast:${from}`, e.seq)) return;
      const actor = this.actor(from);
      if (
        !actor ||
        actor.combat.hp <= 0 ||
        actor.child ||
        Math.hypot(e.x - actor.x, e.y - actor.y) > 220
      )
        return;
      const sk = effectiveSkill(e.skill, actor.combat.skills[e.skill] ?? 1);
      const spell = heroSpell(e.skill);
      if (e.skill !== 'than_phap' && !actor.combat.loadout.includes(e.skill)) return;
      if (sk.hero && (sk.hero !== heroFor(actor).id || actor.combat.level < (sk.unlockLevel ?? 1)))
        return;
      const cdKey = `${from}:${e.skill}`,
        now = Date.now();
      if ((this.cooldowns.get(cdKey) ?? 0) > now) return;
      this.cooldowns.set(cdKey, now + Math.max(100, sk.cooldownMs - 120));
      w.vfx.combatSkill(e.skill, e, { x: e.dx, y: e.dy }, sk.range, heroFor(actor).id);
      const screen = isoVector(e.dx, e.dy),
        dir = heroDirection(screen.x, screen.y);
      if (from !== this.channel.selfKey)
        for (const remote of w.remotes.values())
          if (remote.userId === actor.userId) remote.cast(e.skill, dir);
      if (from === this.channel.selfKey) {
        if (sk.kind === 'heal')
          gameStore
            .getState()
            .restore(Math.round(actor.combat.maxHp * (spell?.healFraction ?? 0.24)), 0);
        if (sk.kind === 'shield')
          w.player.grantShield(
            Math.round(actor.combat.maxHp * (spell?.shieldFraction ?? 0.35)),
            spell?.shieldMs ?? 6000,
          );
      }
      if (this.authority && (sk.kind === 'heal' || sk.kind === 'shield')) {
        const allies = this.actors().filter(
          (p) =>
            p.key !== actor.key &&
            p.party &&
            p.party === actor.party &&
            p.combat.hp > 0 &&
            Math.hypot(p.x - actor.x, p.y - actor.y) < 260,
        );
        for (const ally of allies) {
          const amount = Math.round(
            actor.combat.maxHp *
              (sk.kind === 'heal'
                ? (spell?.healFraction ?? 0.24)
                : (spell?.shieldFraction ?? 0.35)),
          );
          this.channel.send({
            t: 'support',
            seq: ++this.seq,
            to: ally.key,
            kind: sk.kind,
            amount,
            duration: spell?.shieldMs ?? 6000,
          });
          if (
            (sk.kind === 'heal' && ally.combat.hp < ally.combat.maxHp) ||
            (sk.kind === 'shield' && w.monsters.some((m) => m.alive && m.distanceTo(ally) < 450))
          )
            this.noteActivity(actor.key);
        }
      }
      if (!this.authority || e.skill === 'than_phap' || sk.kind === 'heal' || sk.kind === 'shield')
        return;
      if (e.skill === 'dao_hoa_hoang_tuyen')
        for (let i = 1; i <= 8; i++) w.time.delayedCall(i * 500, () => this.resolve(e, actor));
      else
        w.time.delayedCall(e.skill === 'basic' ? 0 : (spell?.windupMs ?? 400), () =>
          this.resolve(e, actor),
        );
      return;
    }
    if (e.t === 'aux-hit') {
      if (!this.authority || !this.once(`aux:${from}`, e.seq)) return;
      const actor = this.actor(from),
        m = w.monsters.find((m) => m.netId === e.id),
        key = `aux:${from}`,
        now = Date.now();
      if (
        !actor ||
        !m ||
        actor.child ||
        actor.combat.hp <= 0 ||
        m.distanceTo(actor) > 250 ||
        (this.cooldowns.get(key) ?? 0) > now
      )
        return;
      this.cooldowns.set(key, now + 600);
      m.lastAttacker = from;
      const amount = Math.max(
        1,
        Math.round(
          Math.min(e.amount, actor.combat.atk * 1.5) *
            realmDamageMultiplier(
              realmIndexAtLevel(actor.combat.level),
              realmIndexAtLevel(m.def.level),
            ),
        ),
      );
      this.credit(m, from, amount);
      this.noteActivity(from);
      m.hit(amount, false, actor);
      return;
    }
    if (e.t === 'kill') {
      if (from !== this.channel.authority) return;
      const key = `${e.id}:${e.generation}`;
      if (this.rewards.has(key)) return;
      this.rewards.add(key);
      if (this.rewards.size > 2048) this.rewards.delete(this.rewards.values().next().value!);
      const m = w.monsters.find((m) => m.netId === e.id);
      const award = e.awards?.find((a) => a.to === this.channel.selfKey);
      if (m && (award || (e.awards === undefined && e.killer === this.channel.selfKey))) {
        m.playerContribution = true;
        w.rewardMonster(m, award);
      }
      return;
    }
    if (e.t === 'damage') {
      if (from !== this.channel.authority || !this.once(`damage:${from}`, e.seq)) return;
      if (e.to === this.channel.selfKey) {
        if (w.player.takeHit(e.amount, e.crit, e))
          w.player.rootMs = Math.max(w.player.rootMs, e.rootMs);
      } else {
        const target = this.actor(e.to);
        if (target)
          w.damageText.show(
            target.x,
            target.y - 80,
            `-${Math.round(e.amount)}`,
            e.crit ? 'crit' : 'player',
          );
      }
      return;
    }
    if (e.t === 'monster-attack') {
      if (from !== this.channel.authority) return;
      const m = w.monsters.find((m) => m.netId === e.id);
      m?.showNetworkAttack();
      if (e.radius > 0) {
        const at = iso(e.x, e.y),
          g = w.add.graphics().setDepth(at.y - 4);
        g.lineStyle(2, 0xff6b50, 0.85).strokeEllipse(at.x, at.y, e.radius * 2, e.radius * 1.3);
        w.time.delayedCall(e.windup, () => {
          g.destroy();
          w.vfx.frostNova(e, e.radius);
        });
      }
      return;
    }
    if (e.t === 'near-chat') {
      const actor = this.actor(from);
      if (
        !actor ||
        Math.hypot(actor.x - e.x, actor.y - e.y) > 220 ||
        Math.hypot(w.player.x - e.x, w.player.y - e.y) > 600
      )
        return;
      if (
        !chatStore.getState().add({
          id: e.id,
          kind: 'near',
          from: actor.userId,
          name: actor.name,
          text: e.text,
          at: Date.now(),
        })
      )
        return;
      gameStore.getState().addLog(`${actor.name}: ${e.text}`, 'near');
      if (from === this.channel.selfKey) w.showSpeech(e.text);
      else
        for (const remote of w.remotes.values())
          if (remote.userId === actor.userId) remote.speech(e.text);
    }
  }
  private resolve(e: Cast, actor: Actor) {
    if (!this.authority || !this.actor(actor.key)) return;
    const sk = effectiveSkill(e.skill, actor.combat.skills[e.skill] ?? 1),
      f = { x: e.dx, y: e.dy };
    let monsters = this.world.monsters.filter(
      (m) =>
        m.alive &&
        worldSkillHit(e.skill, sk, e, f, m, e.combo) &&
        gridLineClear(this.world.map.blocked, TILE, e, m, 0, 0),
    );
    if (e.skill === 'dinh_than_thuat')
      monsters = monsters.sort((a, b) => a.distanceTo(e) - b.distanceTo(e)).slice(0, 1);
    const root = heroSpell(e.skill)?.rootMs ?? (e.skill === 'dinh_than_thuat' ? 1000 : 0);
    const multiplier =
      sk.multiplier * (e.skill === 'basic' && e.combo === 3 ? (sk.active?.finisherMul ?? 1.5) : 1);
    if (monsters.length && (multiplier > 0 || root > 0)) this.noteActivity(actor.key);
    for (const m of monsters) {
      m.lastAttacker = actor.key;
      if (multiplier > 0) {
        const hit = computeDamage({
          atk: actor.combat.atk,
          def: m.def.def,
          multiplier,
          critRate: actor.combat.critRate,
          critMul: actor.combat.critMul,
          attackerRealm: realmIndexAtLevel(actor.combat.level),
          defenderRealm: realmIndexAtLevel(m.def.level),
        });
        this.credit(m, actor.key, hit.amount);
        m.hit(hit.amount, hit.crit, e);
      }
      if (root) m.rootTimer = m.def.boss ? Math.min(350, root) : root;
      if (e.skill === 'han_bang_tran' || e.skill === 'phong_nhan') m.slowTimer = 2000;
    }
    if (this.world.cooperativeRun) return;
    for (const target of this.actors()) {
      if (
        target.key === actor.key ||
        target.combat.hp <= 0 ||
        !mayPk(
          { mode: actor.pkMode, sect: actor.sect, child: actor.child, mapId: this.world.map.id },
          target,
        ) ||
        !worldSkillHit(e.skill, sk, e, f, target, e.combo) ||
        !gridLineClear(this.world.map.blocked, TILE, e, target, 0, 0)
      )
        continue;
      const hit = computeDamage({
        atk: actor.combat.atk,
        def: target.combat.def,
        multiplier,
        critRate: actor.combat.critRate,
        critMul: actor.combat.critMul,
        attackerRealm: realmIndexAtLevel(actor.combat.level),
        defenderRealm: realmIndexAtLevel(target.combat.level),
      });
      this.damage(target.key, multiplier ? hit.amount : 0, hit.crit, e, root);
    }
  }
  damage(to: string, amount: number, crit: boolean, from: { x: number; y: number }, rootMs = 0) {
    this.channel.send({
      t: 'damage',
      seq: ++this.seq,
      to,
      amount,
      crit,
      x: from.x,
      y: from.y,
      rootMs,
    });
  }
  monsterAttack(m: Monster) {
    if (this.authority)
      this.channel.send({
        t: 'monster-attack',
        id: m.netId,
        to: m.attackTargetKey || m.targetKey,
        radius: 0,
        windup: m.def.attackWindup,
        x: m.x,
        y: m.y,
      });
  }
  monsterHit(m: Monster) {
    if (!this.authority || !m.alive || m.rootTimer > 0) return;
    const target = this.actor(m.attackTargetKey || m.targetKey);
    if (
      !target ||
      target.combat.hp <= 0 ||
      m.distanceTo(target) > m.def.attackRange * 1.35 ||
      !gridLineClear(this.world.map.blocked, TILE, m, target, 0, 0)
    )
      return;
    const hit = computeDamage({
      atk: m.def.atk,
      def: target.combat.def,
      multiplier: 1,
      critRate: 0.08,
      critMul: 1.6,
      attackerRealm: realmIndexAtLevel(m.def.level),
      defenderRealm: realmIndexAtLevel(target.combat.level),
    });
    this.damage(target.key, hit.amount, hit.crit, m);
  }
  slam(m: Monster, radius: number, windup: number, mul: number) {
    if (!this.authority) return;
    const target = this.actor(m.targetKey),
      aimed = ['storm', 'celestial'].includes(m.def.boss?.pattern ?? '');
    const center = aimed && target ? { x: target.x, y: target.y } : { x: m.x, y: m.y };
    this.channel.send({
      t: 'monster-attack',
      id: m.netId,
      to: m.targetKey || this.channel.selfKey,
      radius,
      windup,
      ...center,
    });
    this.world.time.delayedCall(windup, () => {
      if (!m.alive || !this.authority) return;
      for (const p of this.actors())
        if (p.combat.hp > 0 && Math.hypot(p.x - center.x, (p.y - center.y) / 0.65) <= radius + 12) {
          const hit = computeDamage({
            atk: m.def.atk,
            def: p.combat.def,
            multiplier: mul,
            critRate: 0,
            critMul: 1,
            attackerRealm: realmIndexAtLevel(m.def.level),
            defenderRealm: realmIndexAtLevel(p.combat.level),
          });
          this.damage(p.key, hit.amount, false, center);
        }
    });
  }
  chat(text: string) {
    const p = this.world.player;
    this.channel.send({ t: 'near-chat', id: crypto.randomUUID(), text, x: p.x, y: p.y });
  }
  private noteActivity(key: string) {
    if (!this.world.cooperativeRun) return;
    const now = Date.now(),
      old = this.activity.get(key);
    this.activity.set(key, { count: (old?.count ?? 0) + 1, first: old?.first ?? now, last: now });
  }
  activePartyMembers() {
    return this.actors()
      .filter((a) => {
        const work = this.activity.get(a.key);
        return work && work.count >= 3 && work.last - work.first >= 1000;
      })
      .map((a) => a.userId);
  }
  destroy() {
    this.stop();
    this.roster = [];
    this.seen.clear();
    this.cooldowns.clear();
    this.contributions.clear();
    this.rewards.clear();
    this.activity.clear();
  }
}
