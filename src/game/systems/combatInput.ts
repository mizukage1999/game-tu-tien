import type { SkillId } from '../../data';

export const INPUT_BUFFER_MS = 180;

/** A single recent intent, never a backlog of attacks after the player stops tapping. */
export class CombatInputBuffer {
  private pending: { skill: SkillId; remaining: number } | null = null;
  push(skill: SkillId) {
    this.pending = { skill, remaining: INPUT_BUFFER_MS };
  }
  tick(dt: number) {
    if (!this.pending) return;
    this.pending.remaining -= Math.max(0, dt);
    if (this.pending.remaining <= 0) this.clear();
  }
  peek() {
    return this.pending?.skill ?? null;
  }
  take() {
    const skill = this.peek();
    this.clear();
    return skill;
  }
  clear() {
    this.pending = null;
  }
}
