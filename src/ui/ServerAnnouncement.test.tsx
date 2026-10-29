// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { ServerAnnouncement } from './ServerAnnouncement';
import { serverControlStore, maintenanceBlocks } from '../net/serverControl';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
it('announces maintenance over the game, counts down, and disappears when maintenance is cancelled', () => {
  vi.useFakeTimers();
  const previous = serverControlStore.getState(),
    host = document.createElement('div'),
    root = createRoot(host);
  try {
    serverControlStore.setState({ maintenance: false, maintenance_at: null });
    act(() => root.render(<ServerAnnouncement />));
    act(() => vi.advanceTimersByTime(90000));
    const deadline = new Date(Date.now() + 60000).toISOString();
    act(() =>
      serverControlStore.setState({
        maintenance: true,
        maintenance_at: deadline,
        admin: false,
        message: 'Nâng cấp máy chủ',
      }),
    );
    expect(host.querySelector('[role=status]')?.getAttribute('aria-label')).toContain(
      'Nâng cấp máy chủ',
    );
    expect(host.querySelector('.server-announcement-countdown')?.textContent).toBe('60s');
    expect(maintenanceBlocks(serverControlStore.getState())).toBe(false);
    act(() => vi.advanceTimersByTime(15000));
    expect(host.querySelector('.server-announcement-countdown')?.textContent).toBe('45s');
    act(() => vi.advanceTimersByTime(45000));
    expect(maintenanceBlocks(serverControlStore.getState())).toBe(true);
    act(() => serverControlStore.setState({ maintenance: false, maintenance_at: null }));
    expect(host.childElementCount).toBe(0);
  } finally {
    act(() => root.unmount());
    serverControlStore.setState(previous);
    vi.useRealTimers();
  }
});
