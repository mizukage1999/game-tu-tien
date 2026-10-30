// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it } from 'vitest';
import { HeroArenaEffect } from './HeroArenaEffect';
import type { ArenaEffect } from '../../game/systems/arena';
import { spellCell } from '../../data/heroSpellArt';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
it('plays the advanced spell impact and fills its directed hit area without shrinking into a tiny square', () => {
  const host = document.createElement('div'), root = createRoot(host);
  const effect: ArenaEffect = { id: 1, owner: 'a', x: 200, y: 200, dx: 0, dy: -1,
    range: 360, arc: 0, kind: 'line', ready: 1000, expires: 1820, damage: 100,
    resolved: false, skill: 'hong_lien_6' };
  try {
    act(() => root.render(<HeroArenaEffect effect={effect} elapsed={700} heroId="hong_lien" />));
    expect(host.querySelector('svg')?.getAttribute('viewBox')).toBe(spellCell('hong_lien_6', 0).join(' '));
    act(() => root.render(<HeroArenaEffect effect={effect} elapsed={1000} heroId="hong_lien" />));
    const sprite = host.querySelector<SVGElement>('svg')!;
    expect(sprite.getAttribute('viewBox')).toBe(spellCell('hong_lien_6', 3).join(' '));
    expect(sprite.getAttribute('preserveAspectRatio')).toBe('none');
    expect(sprite.style.transform).toContain('rotate(-1.5707963267948966rad)');
    expect(host.querySelector('image')?.getAttribute('href')).toMatch(/\/skills-schools-v2-hong_lien\.[a-f0-9]{12}\.webp$/);
    expect(host.querySelector('.duel-effect')).toBeNull();
  } finally { act(() => root.unmount()); }
});
