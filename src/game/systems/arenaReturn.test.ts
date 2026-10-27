// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { deferArenaReturn } from './arenaReturn';
afterEach(() => vi.unstubAllGlobals());
it('waits until the arena layers have unmounted and cancels returns after a new match or shutdown', () => {
  let id = 0;
  const pending = new Map<number, FrameRequestCallback>();
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => {
    pending.set(++id, fn);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => pending.delete(id));
  const step = () => {
    const batch = [...pending.values()];
    pending.clear();
    batch.forEach((fn) => fn(0));
  };
  const resume = vi.fn();
  deferArenaReturn(resume);
  expect(resume).not.toHaveBeenCalled();
  step();
  expect(resume).not.toHaveBeenCalled();
  step();
  expect(resume).toHaveBeenCalledOnce();
  const cancel = deferArenaReturn(resume);
  step();
  cancel();
  step();
  expect(resume).toHaveBeenCalledOnce();
  expect(pending.size).toBe(0);
});
