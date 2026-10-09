import type { Rng, Vec2 } from '../types';

export type AIState = 'idle' | 'wander' | 'chase' | 'attack' | 'return';

export interface AIParams {
  speed: number;
  aggroRadius: number;
  attackRange: number;
  attackInterval: number;
  leashRadius: number;
}

export interface MonsterBrain {
  state: AIState;
  home: Vec2;
  stateTime: number;
  attackCooldown: number;
  wanderTarget: Vec2 | null;
  provoked: boolean;
}

export interface AIInput {
  pos: Vec2;
  /** Null when the player cannot be targeted (downed, other map...). */
  player: Vec2 | null;
  dt: number;
  rng?: Rng;
}

export interface AIOutput {
  velocity: Vec2;
  attack: boolean;
}

const WANDER_RADIUS = 90;

export function createBrain(home: Vec2): MonsterBrain {
  return {
    state: 'idle',
    home: { ...home },
    stateTime: 0,
    attackCooldown: 0,
    wanderTarget: null,
    provoked: false,
  };
}

function setState(brain: MonsterBrain, state: AIState) {
  if (brain.state !== state) {
    brain.state = state;
    brain.stateTime = 0;
  }
}

function toward(from: Vec2, to: Vec2, speed: number): Vec2 {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const d = Math.hypot(dx, dy);
  if (d < 1) return { x: 0, y: 0 };
  return { x: (dx / d) * speed, y: (dy / d) * speed };
}

/** Called when the monster is hit: it starts chasing even if the player is outside aggro range. */
export function provoke(brain: MonsterBrain) {
  if (brain.state === 'return') return;
  brain.provoked = true;
  if (brain.state !== 'attack') setState(brain, 'chase');
}

export function stepMonsterAI(brain: MonsterBrain, p: AIParams, input: AIInput): AIOutput {
  const { pos, player, dt, rng = Math.random } = input;
  brain.stateTime += dt;
  brain.attackCooldown = Math.max(0, brain.attackCooldown - dt);
  const still: AIOutput = { velocity: { x: 0, y: 0 }, attack: false };

  const homeDist = Math.hypot(pos.x - brain.home.x, pos.y - brain.home.y);
  const playerDist = player ? Math.hypot(player.x - pos.x, player.y - pos.y) : Infinity;

  if (brain.state !== 'return' && (homeDist > p.leashRadius || (!player && isHostile(brain)))) {
    brain.provoked = false;
    setState(brain, 'return');
  }

  switch (brain.state) {
    case 'idle':
    case 'wander': {
      if (player && playerDist <= p.aggroRadius) {
        setState(brain, 'chase');
        return still;
      }
      if (brain.state === 'idle') {
        if (brain.stateTime > 1500 + rng() * 2500) {
          const a = rng() * Math.PI * 2;
          const r = rng() * WANDER_RADIUS;
          brain.wanderTarget = {
            x: brain.home.x + Math.cos(a) * r,
            y: brain.home.y + Math.sin(a) * r,
          };
          setState(brain, 'wander');
        }
        return still;
      }
      const target = brain.wanderTarget ?? brain.home;
      if (Math.hypot(target.x - pos.x, target.y - pos.y) < 6 || brain.stateTime > 4000) {
        setState(brain, 'idle');
        return still;
      }
      return { velocity: toward(pos, target, p.speed * 0.4), attack: false };
    }
    case 'chase': {
      if (!player) return still;
      if (!brain.provoked && playerDist > p.aggroRadius * 1.8) {
        setState(brain, 'return');
        return still;
      }
      if (playerDist <= p.attackRange) {
        setState(brain, 'attack');
        return still;
      }
      return { velocity: toward(pos, player, p.speed), attack: false };
    }
    case 'attack': {
      if (!player) return still;
      if (playerDist > p.attackRange * 1.25) {
        setState(brain, 'chase');
        return { velocity: toward(pos, player, p.speed), attack: false };
      }
      if (brain.attackCooldown <= 0) {
        brain.attackCooldown = p.attackInterval;
        return { velocity: { x: 0, y: 0 }, attack: true };
      }
      return still;
    }
    case 'return': {
      if (homeDist < 8) {
        setState(brain, 'idle');
        return still;
      }
      return { velocity: toward(pos, brain.home, p.speed * 1.3), attack: false };
    }
  }
}

export function isHostile(brain: MonsterBrain): boolean {
  return brain.state === 'chase' || brain.state === 'attack';
}
