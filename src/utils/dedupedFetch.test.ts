import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createDedupedFetcher } from './dedupedFetch.ts';

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('createDedupedFetcher', () => {
  it('shares one in-flight request between concurrent callers', async () => {
    let calls = 0;
    const d = deferred<number>();
    const f = createDedupedFetcher(() => {
      calls++;
      return d.promise;
    });
    const a = f.run();
    const b = f.run();
    d.resolve(7);
    assert.deepEqual(await Promise.all([a, b]), [7, 7]);
    assert.equal(calls, 1);
  });

  it('serves the cache within the TTL and refetches after it', async () => {
    let t = 0;
    let calls = 0;
    const f = createDedupedFetcher(async () => ++calls, 30_000, () => t);
    assert.equal(await f.run(), 1);
    t = 29_999;
    assert.equal(await f.run(), 1);
    t = 30_000;
    assert.equal(await f.run(), 2);
  });

  it('force bypasses cache and in-flight; newest load wins the cache', async () => {
    let calls = 0;
    const first = deferred<string>();
    const f = createDedupedFetcher(() => {
      calls++;
      return calls === 1 ? first.promise : Promise.resolve('fresh');
    });
    const slow = f.run();
    assert.equal(await f.run({ force: true }), 'fresh');
    first.resolve('stale');
    assert.equal(await slow, 'stale');
    assert.equal(await f.run(), 'fresh');
    assert.equal(calls, 2);
  });

  it('does not cache failures and invalidate() drops the cache', async () => {
    let calls = 0;
    const f = createDedupedFetcher(async () => {
      calls++;
      if (calls === 1) throw new Error('boom');
      return calls;
    });
    await assert.rejects(f.run(), /boom/);
    assert.equal(await f.run(), 2);
    assert.equal(await f.run(), 2);
    f.invalidate();
    assert.equal(await f.run(), 3);
  });
});
