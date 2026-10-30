// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it } from 'vitest';
import { StatusEffects, ArenaStatusEffects } from './StatusEffects';
import { activeStatusEffects } from '../game/systems/statusEffects';
import { ArenaEngine } from '../game/systems/arena';
import { buildDuelist } from '../game/systems/duel';
import { newPlayer } from '../store/gameStore';
import { playerStats } from '../game/systems/progression';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
it('shows true remaining shield time, skill source and depletion without inventing healing buffs', () => {
  const host = document.createElement('div'),
    root = createRoot(host);
  const state = {
    alive: true,
    shield: 850,
    shieldMs: 5300,
    shieldDuration: 6000,
    shieldSkill: 'ly_mo_uyen_3' as const,
    invulnerableMs: 0,
    rootMs: 0,
  };
  try {
    act(() => root.render(<StatusEffects effects={activeStatusEffects(state)} />));
    const icon = host.querySelector('[data-effect-id="shield"]')!;
    expect(icon.getAttribute('data-remaining-ms')).toBe('5300');
    expect(icon.textContent).toContain('6s');
    expect(icon.getAttribute('aria-label')).toContain('850');
    expect(host.querySelector('image')?.getAttribute('href')).toContain('buff-icons-v1');
    act(() =>
      root.render(<StatusEffects effects={activeStatusEffects({ ...state, shieldMs: 300 })} />),
    );
    expect(host.querySelector('.status-effect-time')?.textContent).toBe('0.3s');
    act(() =>
      root.render(<StatusEffects effects={activeStatusEffects({ ...state, shield: 0 })} />),
    );
    expect(host.querySelector('.status-effects')).toBeNull();
    expect(activeStatusEffects({ ...state, alive: false })).toEqual([]);
  } finally {
    act(() => root.unmount());
  }
});
it('reads arena status deadlines from the same elapsed clock and removes them exactly at expiry', () => {
  const host = document.createElement('div'),
    root = createRoot(host);
  const p = newPlayer(),
    a = buildDuelist(p, playerStats(p), 'Luyện Khí', 'a');
  const engine = new ArenaEngine('status', a, { ...a, userId: 'b' });
  const fighter = {
    ...engine.state.fighters[0],
    shield: 100,
    shieldUntil: 7000,
    rootUntil: 2000,
    weakenUntil: 6000,
    slowUntil: 4000,
    invulnUntil: 1500,
  };
  try {
    act(() => root.render(<ArenaStatusEffects fighter={fighter} elapsed={1000} />));
    expect(host.querySelectorAll('[data-effect-id]')).toHaveLength(5);
    expect(host.querySelector('[data-effect-id="root"]')?.getAttribute('data-remaining-ms')).toBe(
      '1000',
    );
    act(() => root.render(<ArenaStatusEffects fighter={fighter} elapsed={2000} />));
    expect(host.querySelectorAll('[data-effect-id]')).toHaveLength(3);
    act(() => root.render(<ArenaStatusEffects fighter={fighter} elapsed={7000} />));
    expect(host.querySelector('.status-effects')).toBeNull();
  } finally {
    act(() => root.unmount());
  }
});
