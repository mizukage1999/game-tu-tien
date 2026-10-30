import type { SkillId } from '../../data';

export type StatusEffectId = 'shield' | 'invulnerable' | 'root' | 'weaken' | 'slow';
export interface ActiveStatusEffect {
  id: StatusEffectId;
  remainingMs: number;
  durationMs?: number;
  strength?: number;
  source?: SkillId;
}
export function activeStatusEffects(state: {
  alive: boolean;
  shield: number;
  shieldMs: number;
  shieldDuration?: number;
  shieldSkill?: SkillId;
  invulnerableMs: number;
  rootMs: number;
  weakenMs?: number;
  slowMs?: number;
}): ActiveStatusEffect[] {
  if (!state.alive) return [];
  const effects: ActiveStatusEffect[] = [];
  if (state.shield > 0 && state.shieldMs > 0)
    effects.push({
      id: 'shield',
      remainingMs: state.shieldMs,
      durationMs: state.shieldDuration,
      strength: state.shield,
      source: state.shieldSkill,
    });
  if (state.invulnerableMs > 0)
    effects.push({ id: 'invulnerable', remainingMs: state.invulnerableMs });
  if (state.rootMs > 0) effects.push({ id: 'root', remainingMs: state.rootMs });
  if ((state.weakenMs ?? 0) > 0) effects.push({ id: 'weaken', remainingMs: state.weakenMs! });
  if ((state.slowMs ?? 0) > 0) effects.push({ id: 'slow', remainingMs: state.slowMs! });
  return effects;
}
