export const SECT_RETURN_DELAY_MS = 550;

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
  life.downedTimer = 0;
  life.invulnTimer = 0;
}

export function grantInvuln(life: LifeState, ms: number) {
  life.invulnTimer = Math.max(life.invulnTimer, ms);
}

/** Advances invulnerability only. A map transfer creates the next living character. */
export function tickLife(life: LifeState, dt: number): boolean {
  life.invulnTimer = Math.max(0, life.invulnTimer - dt);
  return false;
}

export function canAct(life: LifeState): boolean {
  return life.status === 'alive';
}

export function canBeHit(life: LifeState): boolean {
  return life.status === 'alive' && life.invulnTimer <= 0;
}
