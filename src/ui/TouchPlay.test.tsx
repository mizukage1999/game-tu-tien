// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { usePortrait } from './TouchPlay';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
it('keeps orientation while the keyboard shrinks height, but responds to a physical width change', () => {
  let matches = true;
  const listeners = new Set<() => void>();
  vi.stubGlobal('matchMedia', () => ({
    get matches() {
      return matches;
    },
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  }));
  vi.stubGlobal('innerWidth', 390);
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  function Probe() {
    const portrait = usePortrait();
    return (
      <>
        <input />
        <span>{String(portrait)}</span>
      </>
    );
  }
  try {
    act(() => root.render(<Probe />));
    act(() => host.querySelector('input')!.focus());
    act(() => {
      matches = false;
      listeners.forEach((fn) => fn());
    });
    expect(host.querySelector('span')?.textContent).toBe('true');
    act(() => {
      vi.stubGlobal('innerWidth', 844);
      window.dispatchEvent(new Event('resize'));
    });
    expect(host.querySelector('span')?.textContent).toBe('false');
  } finally {
    act(() => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  }
});
