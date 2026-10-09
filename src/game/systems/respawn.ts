export const DOWNED_DURATION_MS = 2500;
export const REVIVE_INVULN_MS = 1500;

export type LifeStatus = 'alive' | 'downed';

export interface LifeState {
  status: LifeStatus;
  downedTimer: number;
  invulnTimer: number;
}

export function createLife(): LifeState {
  return { status: 'alive', downedTimer: 0, invulnTimer: 0 };
}

export function knockDown(life: LifeState) {
  life.status = 'downed';
  life.downedTimer = DOWNED_DURATION_MS;
  life.invulnTimer = 0;
}

export function grantInvuln(life: LifeState, ms: number) {
  life.invulnTimer = Math.max(life.invulnTimer, ms);
}

/** Advances timers. Returns true on the tick where the character revives. */
export function tickLife(life: LifeState, dt: number): boolean {
  life.invulnTimer = Math.max(0, life.invulnTimer - dt);
  if (life.status !== 'downed') return false;
  life.downedTimer -= dt;
  if (life.downedTimer > 0) return false;
  life.status = 'alive';
  life.downedTimer = 0;
  life.invulnTimer = REVIVE_INVULN_MS;
  return true;
}

export function canAct(life: LifeState): boolean {
  return life.status === 'alive';
}

export function canBeHit(life: LifeState): boolean {
  return life.status === 'alive' && life.invulnTimer <= 0;
}
