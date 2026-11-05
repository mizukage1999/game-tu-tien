// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { BossHuntPanel } from './BossHuntPanel';
import { loadBossCatalog } from '../../data/bossCatalog';
vi.mock('../../data/bossCatalog', async (original) => ({
  ...(await original<object>()),
  cachedBossCatalog: () => null,
  loadBossCatalog: vi.fn(),
}));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
it('mounts a responsive hunt window before cold catalog work finishes and can close immediately', async () => {
  let finish!: (entries: []) => void;
  vi.mocked(loadBossCatalog).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  const host = document.createElement('div'),
    root = createRoot(host);
  act(() => root.render(<BossHuntPanel />));
  expect(host.querySelector('[aria-busy=true]')?.textContent).toContain('Đang dò');
  expect(host.querySelector('[data-boss]')).toBeNull();
  act(() => root.unmount());
  await act(async () => finish([]));
  expect(host.childElementCount).toBe(0);
});
