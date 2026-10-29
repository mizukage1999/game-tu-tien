import { afterEach, describe, it, expect, vi } from 'vitest';
import { SharedWorld } from './SharedWorld';
import type { WorldEvent, WorldMonsterState } from '../../net/worldProtocol';
import type { WorldScene } from '../scenes/WorldScene';
import type { WorldChannel } from '../../net/worldChannel';
import { gameStore } from '../../store/gameStore';

function pair() {
  const stats = {
    atk: 80,
    def: 5,
    hp: 1000,
    maxHp: 1000,
    mp: 400,
    maxMp: 400,
    level: 15,
    critRate: 0,
    critMul: 1.5,
    loadout: ['basic', 'wang_lam_1', 'wang_lam_2', 'wang_lam_3'],
    skills: {},
  };
  const actor = (key: string, x: number) => ({
    key,
    userId: key,
    name: key,
    heroId: 'wang_lam' as const,
    sex: 'male' as const,
    x,
    y: 200,
    dx: 1,
    dy: 0,
    dir: 'right' as const,
    moving: false,
    realm: 'Trúc Cơ',
    updatedAt: 0,
    child: false,
    pkMode: 'peace' as const,
    sect: 'dai_thua_vien',
    combat: { ...stats, loadout: stats.loadout as Parameters<SharedWorld['attack']>[0][] },
  });
  const actors = [actor('a', 200), actor('b', 240)];
  let authority = 'a';
  const listeners = new Map<string, Set<(e: WorldEvent, key: string) => void>>();
  const channel = (key: string) =>
    ({
      selfKey: key,
      get authority() {
        return authority;
      },
      connected: true,
      onEvent(fn: (e: WorldEvent, key: string) => void) {
        const set = new Set([fn]);
        listeners.set(key, set);
        return () => listeners.delete(key);
      },
      send(e: WorldEvent) {
        for (const set of listeners.values()) for (const fn of set) fn(e, key);
      },
    }) as unknown as WorldChannel;
  const makeWorld = () => {
    const w = {
      map: {
        id: 'linh_thu_lam',
        width: 30,
        height: 30,
        blocked: Array.from({ length: 30 }, () => Array(30).fill(false)),
      },
      player: {
        networkPose: () => actors[0],
        facing: { x: 1, y: 0 },
        x: 200,
        y: 200,
        takeHit: vi.fn(() => true),
        rootMs: 0,
        grantShield: vi.fn(),
      },
      vfx: { combatSkill: vi.fn() },
      time: { delayedCall: (ms: number, fn: () => void) => setTimeout(fn, ms) },
      remotes: new Map(),
      rewardMonster: vi.fn(),
      damageText: { show: vi.fn() },
      showSpeech: vi.fn(),
      partyRunSnapshot: () => null,
      applyPartyRunSnapshot: vi.fn(),
      monsters: [] as unknown[],
      shared: null as SharedWorld | null,
    };
    const m = {
      netId: 'm:0',
      type: 'linh_thu',
      x: 270,
      y: 200,
      hp: 180,
      alive: true,
      generation: 0,
      respawnAt: 0,
      lastAttacker: '',
      playerContribution: false,
      rootTimer: 0,
      slowTimer: 0,
      def: { hp: 180, def: 0, level: 10, exp: 100, loot: [] },
      damageTaken: (n: number) => n,
      distanceTo: (p: { x: number; y: number }) => Math.hypot(m.x - p.x, m.y - p.y),
      networkState: (): WorldMonsterState => ({
        id: m.netId,
        type: 'linh_thu',
        x: m.x,
        y: m.y,
        homeX: 270,
        homeY: 200,
        hp: m.hp,
        alive: m.alive,
        flip: false,
        anim: m.alive ? 'idle' : 'die',
        root: 0,
        slow: 0,
        generation: 0,
        respawnAt: 0,
      }),
      applyNetwork(s: WorldMonsterState) {
        m.x = s.x;
        m.y = s.y;
        m.hp = s.hp;
        m.alive = s.alive;
      },
      hit(amount: number) {
        m.playerContribution = true;
        m.hp = Math.max(0, m.hp - amount);
        if (!m.hp) {
          m.alive = false;
          w.shared!.killed(m as never);
        }
      },
    };
    w.monsters = [m];
    return { w, m };
  };
  const aw = makeWorld(),
    bw = makeWorld(),
    a = new SharedWorld(aw.w as unknown as WorldScene, channel('a')),
    b = new SharedWorld(bw.w as unknown as WorldScene, channel('b'));
  aw.w.shared = a;
  bw.w.shared = b;
  vi.spyOn(a, 'self').mockImplementation(() => actors[0]);
  vi.spyOn(b, 'self').mockImplementation(() => actors[1]);
  a.roster = [actors[1]];
  b.roster = [actors[0]];
  return {
    a,
    b,
    aw,
    bw,
    actors,
    elect: (id: string) => {
      authority = id;
    },
    listeners,
  };
}
afterEach(() => vi.useRealTimers());
describe('two clients in a shared combat map', () => {
  it('gives both clients a binding target at the victim position without damaging it',()=>{
    vi.useFakeTimers();
    const {a,b,aw,bw,actors}=pair();
    actors[1].combat.loadout=['basic','dinh_than_thuat'];
    b.attack('dinh_than_thuat');
    const pickA=aw.w.vfx.combatSkill.mock.calls[0][5] as ()=>{x:number;y:number;duration:number};
    const pickB=bw.w.vfx.combatSkill.mock.calls[0][5] as ()=>{x:number;y:number;duration:number};
    expect(pickA()).toMatchObject({x:270,y:200,duration:1000});expect(pickB()).toMatchObject({x:270,y:200,duration:1000});
    vi.advanceTimersByTime(400);
    expect(aw.m.hp).toBe(180);expect(aw.m.rootTimer).toBe(1000);
    a.destroy();b.destroy();
  });
  it('applies the same two-realm damage reduction on the elected authority and its remote snapshot', () => {
    vi.useFakeTimers();
    const random = vi.spyOn(Math, 'random').mockReturnValue(.5);
    const hit = (level: number) => {
      const { a, b, aw, bw, actors } = pair();
      actors[0].combat.level = level;
      aw.m.def.level = bw.m.def.level = 85;
      aw.m.hp = aw.m.def.hp = bw.m.hp = bw.m.def.hp = 2000;
      a.attack('basic');
      vi.advanceTimersByTime(1);
      const amount = 2000 - aw.m.hp;
      a.tick(150);
      expect(bw.m.hp).toBe(aw.m.hp);
      a.destroy(); b.destroy();
      return amount;
    };
    try { expect(hit(65)).toBe(hit(85) / 2); } finally { random.mockRestore(); }
  });
  it('shows a new school spell on both clients and resolves damage only at its authored impact', () => {
    vi.useFakeTimers();
    const { a, b, aw, bw, actors } = pair();
    actors[1].combat.level = 40;
    actors[1].combat.loadout = ['basic', 'wang_lam_7'];
    b.attack('wang_lam_7');
    expect(aw.w.vfx.combatSkill).toHaveBeenCalledWith('wang_lam_7', expect.anything(), { x: 1, y: 0 }, 390, 'wang_lam');
    expect(bw.w.vfx.combatSkill).toHaveBeenCalled();
    vi.advanceTimersByTime(449);
    expect(aw.m.hp).toBe(180);
    vi.advanceTimersByTime(1);
    a.tick(150);
    expect(aw.m.hp).toBeLessThan(180);
    expect(bw.m.hp).toBe(aw.m.hp);
    a.destroy(); b.destroy();
  });
  it('rejects a forged advanced loadout below its required level on every peer', () => {
    vi.useFakeTimers();
    const { a, b, aw, bw, actors } = pair();
    actors[1].combat.loadout = ['basic', 'wang_lam_10'];
    b.attack('wang_lam_10');
    vi.advanceTimersByTime(1200);
    expect(aw.w.vfx.combatSkill).not.toHaveBeenCalled();
    expect(bw.w.vfx.combatSkill).not.toHaveBeenCalled();
    expect(aw.m.hp).toBe(180);
    a.destroy(); b.destroy();
  });
  it('replicates an attack, HP loss and death; rewards only the remote killer once', () => {
    vi.useFakeTimers();
    const { a, b, aw, bw } = pair();
    b.attack('basic');
    vi.advanceTimersByTime(1);
    a.tick(150);
    expect(aw.m.hp).toBeLessThan(180);
    expect(bw.m.hp).toBe(aw.m.hp);
    expect(aw.w.vfx.combatSkill).toHaveBeenCalled();
    expect(bw.w.vfx.combatSkill).toHaveBeenCalled();
    vi.advanceTimersByTime(600);
    b.attack('wang_lam_1');
    vi.advanceTimersByTime(450);
    a.tick(150);
    expect(aw.m.alive).toBe(false);
    expect(bw.m.alive).toBe(false);
    expect(aw.w.rewardMonster).not.toHaveBeenCalled();
    expect(bw.w.rewardMonster).toHaveBeenCalledOnce();
    a.killed(aw.m as never);
    expect(bw.w.rewardMonster).toHaveBeenCalledOnce();
  });
  it('keeps the last shared state when the next peer takes authority', () => {
    const { a, b, aw, bw, elect } = pair();
    aw.m.hp = 65;
    a.tick(150);
    expect(bw.m.hp).toBe(65);
    elect('b');
    bw.m.hp = 40;
    b.tick(150);
    expect(aw.m.hp).toBe(40);
    expect(b.authority).toBe(true);
  });
  it('applies field PK only with an allowed attacker mode, and routes damage to that target', () => {
    vi.useFakeTimers();
    const { a, aw, bw, actors } = pair();
    a.attack('basic');
    vi.advanceTimersByTime(1);
    expect(bw.w.player.takeHit).not.toHaveBeenCalled();
    (actors[0] as { pkMode: string }).pkMode = 'all';
    vi.advanceTimersByTime(600);
    a.attack('basic');
    vi.advanceTimersByTime(1);
    expect(bw.w.player.takeHit).toHaveBeenCalledOnce();
    expect(aw.w.player.takeHit).not.toHaveBeenCalled();
  });
  it('drops replayed cast packets instead of applying damage twice', () => {
    vi.useFakeTimers();
    const { a, aw, listeners } = pair();
    const hit = vi.spyOn(aw.m, 'hit');
    const event: WorldEvent = {
      t: 'cast',
      seq: 42,
      skill: 'basic',
      x: 240,
      y: 200,
      dx: 1,
      dy: 0,
      combo: 1,
    };
    for (let n = 0; n < 2; n++) for (const fn of listeners.get('a')!) fn(event, 'b');
    vi.advanceTimersByTime(1);
    expect(hit).toHaveBeenCalledOnce();
    a.destroy();
  });
  it('credits two active fighters instead of awarding only the last hit, with no idle spectator reward', () => {
    vi.useFakeTimers();
    const { a, b, aw, bw } = pair();
    a.attack('basic'); vi.advanceTimersByTime(1);
    b.attack('wang_lam_1'); vi.advanceTimersByTime(500);
    expect(aw.m.alive).toBe(false);
    expect(aw.w.rewardMonster).toHaveBeenCalledOnce();
    expect(bw.w.rewardMonster).toHaveBeenCalledOnce();
    const awardA = aw.w.rewardMonster.mock.calls[0][1], awardB = bw.w.rewardMonster.mock.calls[0][1];
    expect(awardA.to).toBe('a'); expect(awardB.to).toBe('b');
    expect(awardA.exp + awardB.exp).toBeGreaterThan(0);
    a.killed(aw.m as never);
    expect(aw.w.rewardMonster).toHaveBeenCalledOnce();
    a.destroy(); b.destroy();
  });
  it('synchronizes the dungeon phase and only allows active members to collect the clear, without per-kill farming', () => {
    vi.useFakeTimers();
    const { a, b, aw, bw, actors } = pair();
    Object.assign(aw.w, { cooperativeRun: {id:'room'}, partyWaiting:false });
    Object.assign(bw.w, { cooperativeRun: {id:'room'}, partyWaiting:false });
    for (const actor of actors) Object.assign(actor, { pkMode: 'all' });
    expect(a.opponent(500)).toBeUndefined();
    aw.m.hp = aw.m.def.hp = 10000;
    for (let i=0; i<3; i++) { a.attack('basic'); b.attack('basic'); vi.advanceTimersByTime(600); }
    expect(aw.w.player.takeHit).not.toHaveBeenCalled();
    expect(bw.w.player.takeHit).not.toHaveBeenCalled();
    expect(a.activePartyMembers().sort()).toEqual(['a','b']);
    Object.assign(aw.w, {partyRunSnapshot: () => ({room:'room',waiting:false,run:{id:'tier_30_de',phase:'boss',wave:2,timeLeft:180000,elapsed:20000,introLeft:0,nextIn:null}})});
    a.tick(150);
    expect(bw.w.applyPartyRunSnapshot).toHaveBeenCalledWith(expect.objectContaining({room:'room',eligible:['a','b'],run:expect.objectContaining({phase:'boss'})}));
    aw.m.hp = 1; a.attack('basic'); vi.advanceTimersByTime(1);
    expect(aw.w.rewardMonster).not.toHaveBeenCalled();
    expect(bw.w.rewardMonster).not.toHaveBeenCalled();
    a.destroy(); b.destroy();
  });
});
// Importing the real store exercises the same definitions used by both clients.
void gameStore;
