/** In-memory sliding window: at most `limit` failed attempts per key within `windowMs`. */
export class LoginThrottle {
  private readonly failures = new Map<string, number[]>();

  constructor(
    private readonly limit = 5,
    private readonly windowMs = 15 * 60_000,
  ) {}

  private recent(key: string, now: number): number[] {
    const list = (this.failures.get(key) ?? []).filter((t) => now - t < this.windowMs);
    this.failures.set(key, list);
    return list;
  }

  isBlocked(key: string, now = Date.now()): boolean {
    return this.recent(key, now).length >= this.limit;
  }

  recordFailure(key: string, now = Date.now()): void {
    this.recent(key, now).push(now);
  }

  reset(key: string): void {
    this.failures.delete(key);
  }
}
