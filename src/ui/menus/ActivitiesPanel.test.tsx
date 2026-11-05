// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { ActivitiesPanel } from './ActivitiesPanel';
import { gameStore } from '../../store/gameStore';
vi.mock('../../net/worldActivities', async () => {
  const { createStore } = await import('zustand/vanilla');
  return {
    activityNow: () => 0,
    activityAction: vi.fn(),
    activityStore: createStore(() => ({ error: '', synced: false })),
  };
});
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
it('offers only treasure and ruins without exposing the retired race', () => {
  const previous = gameStore.getState(),
    host = document.createElement('div'),
    root = createRoot(host);
  try {
    act(() => root.render(<ActivitiesPanel />));
    const tabs = host.querySelectorAll<HTMLButtonElement>('.activity-tabs button');
    expect([...tabs].map((b) => b.dataset.activity)).toEqual(['treasure', 'ruins']);
    expect(host.textContent).not.toContain('Ngự Kiếm Vượt Thiên Quan');
    act(() => tabs[1].click());
    expect(host.querySelector('.activity-ruins')).not.toBeNull();
    expect(tabs[1].getAttribute('aria-pressed')).toBe('true');
  } finally {
    act(() => root.unmount());
    gameStore.setState(previous);
  }
});
