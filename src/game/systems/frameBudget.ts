export type PerformanceTier = 0 | 1 | 2;

/** Sustained frame timings, with hysteresis; hidden-tab gaps never lower quality. */
export class FrameBudget {
  private duration = 0;
  private samples = 0;
  private fastMs = 0;
  constructor(public tier: PerformanceTier = 0) {}
  sample(delta: number): PerformanceTier {
    if (!Number.isFinite(delta) || delta <= 0 || delta > 250) {
      this.reset();
      return this.tier;
    }
    this.duration += delta;
    this.samples++;
    if (this.duration < 2000) return this.tier;
    const average = this.duration / this.samples;
    if (average > 22) {
      this.tier = Math.min(2, this.tier + 1) as PerformanceTier;
      this.fastMs = 0;
    } else if (average < 17.5) {
      this.fastMs += this.duration;
      if (this.fastMs >= 12000) {
        this.tier = Math.max(0, this.tier - 1) as PerformanceTier;
        this.fastMs = 0;
      }
    } else this.fastMs = 0;
    this.duration = 0;
    this.samples = 0;
    return this.tier;
  }
  reset() {
    this.duration = 0;
    this.samples = 0;
    this.fastMs = 0;
  }
}
