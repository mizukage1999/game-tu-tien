export interface LeaseResult {
  data: unknown;
  error: { message: string } | null;
}
export interface LeaseBackend {
  claim(instance: string): PromiseLike<LeaseResult>;
  check(instance: string): PromiseLike<LeaseResult>;
  watch(changed: () => void): () => void;
}

/** The database chooses the winner; neither device clocks nor map presence do. */
export class SessionLease {
  active = false;
  private stopped = false;
  private checking = false;
  private timer: ReturnType<typeof setInterval> | undefined;
  private unwatch: (() => void) | undefined;
  constructor(
    readonly instance: string,
    private backend: LeaseBackend,
    private replaced: () => void,
  ) {}

  async start() {
    const result = await this.backend.claim(this.instance);
    if (this.stopped) return false;
    if (result.error || result.data !== true)
      throw new Error(result.error?.message ?? 'Không xác nhận được phiên chơi.');
    this.active = true;
    this.unwatch = this.backend.watch(() => void this.verify());
    this.timer = setInterval(() => void this.verify(), 1500);
    // Catch a takeover that occurred between claim and subscription.
    await this.verify();
    return this.active;
  }

  async verify() {
    if (this.stopped || !this.active || this.checking) return;
    this.checking = true;
    try {
      const result = await this.backend.check(this.instance);
      if (this.stopped) return;
      // A lost connection is not evidence that another session has signed in.
      if (!result.error && result.data === false) {
        this.stop();
        this.replaced();
      }
    } catch {
      /* Retry on the next heartbeat or foreground event. */
    } finally {
      this.checking = false;
    }
  }

  stop() {
    this.stopped = true;
    this.active = false;
    clearInterval(this.timer);
    this.unwatch?.();
    this.unwatch = undefined;
  }
}
