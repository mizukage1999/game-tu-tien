// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { SkillPreview } from './SkillPreview';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
it('uses a small glyph until the player explicitly plays the full Wang effect', async () => {
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn(() => 1),
  );
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.stubGlobal(
    'Image',
    class {
      decoding = '';
      src = '';
      decode() {
        return Promise.resolve();
      }
    },
  );
  const host = document.createElement('div'),
    root = createRoot(host);
  try {
    act(() => root.render(<SkillPreview id="hoa_ma_chi" />));
    expect(host.querySelector('[data-wang-frame]')).toBeNull();
    expect(host.querySelector('image')?.getAttribute('href')).toMatch(/menu-skill-hoa_ma_chi\./);
    await act(async () => host.querySelector<HTMLButtonElement>('.cult-preview-play')!.click());
    expect(host.querySelector('[data-wang-frame]')).not.toBeNull();
    expect(host.querySelector('[data-wang-frame] image')?.getAttribute('href')).toContain(
      'wang-hoa-ma-chi-v2',
    );
  } finally {
    act(() => root.unmount());
    vi.unstubAllGlobals();
  }
});
