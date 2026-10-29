// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it } from 'vitest';
import { PaintedArenaEffect } from './PaintedArenaEffect';
import { ARENA_W, type ArenaEffect } from '../../game/systems/arena';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const base: ArenaEffect = {
  id: 1,
  owner: 'a',
  x: 160,
  y: 200,
  dx: 1,
  dy: 0,
  range: 270,
  arc: 0,
  kind: 'line',
  ready: 400,
  expires: 1400,
  damage: 0,
  resolved: false,
  skill: 'dinh_than_thuat',
};
it('binds the target after windup and does not latch onto a late arrival after a miss', () => {
  const host = document.createElement('div'),
    root = createRoot(host);
  try {
    act(() =>
      root.render(<PaintedArenaEffect effect={base} elapsed={200} target={{ x: 300, y: 200 }} />),
    );
    expect(host.querySelector<SVGElement>('svg')!.style.left).toBe(`${(160 / ARENA_W) * 100}%`);
    act(() =>
      root.render(<PaintedArenaEffect effect={base} elapsed={600} target={{ x: 300, y: 200 }} />),
    );
    expect(host.querySelector<SVGElement>('svg')!.style.left).toBe(`${(300 / ARENA_W) * 100}%`);
    const miss = { ...base, id: 2 };
    act(() =>
      root.render(
        <PaintedArenaEffect key={2} effect={miss} elapsed={600} target={{ x: 300, y: 400 }} />,
      ),
    );
    const endpoint = host.querySelector<SVGElement>('svg')!.style.left;
    act(() =>
      root.render(
        <PaintedArenaEffect key={2} effect={miss} elapsed={700} target={{ x: 300, y: 200 }} />,
      ),
    );
    expect(host.querySelector<SVGElement>('svg')!.style.left).toBe(endpoint);
  } finally {
    act(() => root.unmount());
  }
});
it('uses the new impact frame and correct facing instead of a geometric range circle', () => {
  const host = document.createElement('div'),
    root = createRoot(host);
  try {
    const effect = { ...base, skill: 'tram_la_quyet' as const, dy: -1, dx: 0, expires: 1000 };
    act(() =>
      root.render(<PaintedArenaEffect effect={effect} elapsed={400} target={{ x: 160, y: 50 }} />),
    );
    const image = host.querySelector<SVGElement>('.wang-effect-frame')!;
    expect(image.dataset.wangFrame).toBe('12');
    expect(image.style.transform).toContain('rotate(-1.5707963267948966rad)');
    expect(image.getAttribute('viewBox')).toBe('0 512 256 256');
    expect(host.querySelector('image')?.getAttribute('href')).toContain('wang-tram-la-v2');
    expect(host.querySelector('.duel-effect')).toBeNull();
    act(() =>
      root.render(
        <PaintedArenaEffect
          effect={{ ...base, skill: 'dao_hoa_hoang_tuyen', expires: 4500 }}
          elapsed={1500}
          target={{ x: 300, y: 200 }}
        />,
      ),
    );
    expect(host.querySelector<SVGElement>('.wang-effect-frame')!.style.zIndex).toBe('3');
    expect(host.querySelector('image')?.getAttribute('href')).toContain('wang-hoang-tuyen-v3');
    expect(host.querySelector<SVGElement>('.wang-effect-frame')!.style.transform).not.toContain(
      'rotate',
    );
  } finally {
    act(() => root.unmount());
  }
});
