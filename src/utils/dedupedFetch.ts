export const DEFAULT_FETCH_TTL_MS = 30_000;

export interface DedupedFetcher<T> {
  /**
   * Returns the in-flight request if there is one, the cached value if it is younger than
   * the TTL, otherwise starts a new load. `force` always starts a fresh load (explicit
   * refresh after a mutation); the newest load wins if several overlap.
   */
  run(opts?: { force?: boolean }): Promise<T>;
  /** Drop the cached value so the next run() refetches (e.g. on logout). */
  invalidate(): void;
}

/**
 * In-flight-promise dedup + staleness TTL. `load` should throw on failure: failures are
 * never cached and propagate to every waiter.
 */
export function createDedupedFetcher<T>(
  load: () => Promise<T>,
  ttlMs: number = DEFAULT_FETCH_TTL_MS,
  now: () => number = Date.now,
): DedupedFetcher<T> {
  let inflight: Promise<T> | null = null;
  let cached: { value: T; at: number } | null = null;
  let generation = 0;

  const start = (): Promise<T> => {
    const myGen = ++generation;
    const p = load().then(
      (value) => {
        // A newer load (or an invalidate) superseded this one: do not cache stale data.
        if (myGen === generation) cached = { value, at: now() };
        return value;
      },
    );
    inflight = p;
    const clear = () => {
      if (inflight === p) inflight = null;
    };
    p.then(clear, clear);
    return p;
  };

  return {
    run(opts) {
      if (!opts?.force) {
        if (inflight) return inflight;
        if (cached && now() - cached.at < ttlMs) return Promise.resolve(cached.value);
      }
      return start();
    },
    invalidate() {
      generation++;
      cached = null;
      inflight = null;
    },
  };
}
