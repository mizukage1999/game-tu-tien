import { expect, it, vi } from 'vitest';
import { WANG_EFFECT_ART } from '../../data/wangSkills';
import { buildWangSheet, wangSheetUrl } from './wangEffects';

it('never PNG-encodes a full combat atlas while preparing it for the renderer', () => {
  const canvases: {
    width: number;
    height: number;
    getContext: () => { drawImage: ReturnType<typeof vi.fn> };
    toDataURL: ReturnType<typeof vi.fn>;
  }[] = [];
  vi.stubGlobal('document', {
    createElement: () => {
      const canvas = {
        width: 0,
        height: 0,
        getContext: () => ({ drawImage: vi.fn() }),
        toDataURL: vi.fn(() => 'data:image/png;base64,preview'),
      };
      canvases.push(canvas);
      return canvas;
    },
  });
  try {
    const art = WANG_EFFECT_ART.tram_la_quyet;
    buildWangSheet(art, { width: 1536, height: 1024 } as HTMLImageElement);
    expect(canvases[0].width).toBeGreaterThan(500);
    expect(canvases[0].toDataURL).not.toHaveBeenCalled();
    expect(wangSheetUrl(art)).toBe('data:image/png;base64,preview');
    wangSheetUrl(art);
    expect(canvases[0].toDataURL).toHaveBeenCalledTimes(1);
  } finally {
    vi.unstubAllGlobals();
  }
});
