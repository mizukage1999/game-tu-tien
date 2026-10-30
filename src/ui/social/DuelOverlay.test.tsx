// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { it, expect, vi } from 'vitest';
import { DuelOverlay } from './DuelOverlay';
import { socialStore } from '../../store/socialStore';
import { newPlayer } from '../../store/gameStore';
import { buildDuelist } from '../../game/systems/duel';
import { playerStats } from '../../game/systems/progression';
import { ArenaEngine } from '../../game/systems/arena';
import { closeArena, readyArena, sendArenaInput } from '../../net/socialBridge';
vi.mock('../../net/socialBridge', () => ({
  closeArena: vi.fn(),
  readyArena: vi.fn(),
  sendArenaInput: vi.fn(),
}));
vi.mock('../../game/art/icons', () => ({ skillSpriteUrl: () => '/skill.png' }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
it('retries a ready message lost before the host opens the arena, then stops once acknowledged', () => {
  vi.useFakeTimers();
  vi.mocked(readyArena).mockClear();
  const root = createRoot(document.createElement('div'));
  const previous = socialStore.getState();
  const p = {...newPlayer(),level:99},
    a = buildDuelist(p, playerStats(p), 'Luyện Khí', 'a'),
    b = { ...a, userId: 'b' };
  const engine = new ArenaEngine('ready-retry', a, b);
  socialStore.setState({
    duel: { nonce: 'ready-retry', snapshot: engine.snapshot(), a, b, aIsMe: false, localId: 'b', practice: false },
  });
  try {
    act(() => root.render(<DuelOverlay />));
    expect(readyArena).toHaveBeenCalledOnce();
    act(() => vi.advanceTimersByTime(1200));
    expect(readyArena).toHaveBeenCalledTimes(3);
    engine.start();
    act(() => socialStore.setState((s) => ({ duel: { ...s.duel!, snapshot: engine.snapshot() } })));
    act(() => vi.advanceTimersByTime(1200));
    expect(readyArena).toHaveBeenCalledTimes(3);
  } finally {
    act(() => root.unmount());
    socialStore.setState(previous);
    vi.useRealTimers();
  }
});

it('continues toward a left mouse click after release and cancels the target on blur', () => {
  vi.useFakeTimers(); vi.mocked(sendArenaInput).mockClear();
  const host = document.createElement('div'), root = createRoot(host), previous = socialStore.getState();
  const p = newPlayer(), a = buildDuelist(p, playerStats(p), 'Luyện Khí', 'a'), b = { ...a, userId: 'b' };
  const engine = new ArenaEngine('mouse-route', a, b); engine.start(); engine.step(3100);
  socialStore.setState({ duel: { nonce: 'mouse-route', snapshot: engine.snapshot(), a, b, aIsMe: true, localId: 'a', practice: true } });
  try {
    act(() => root.render(<DuelOverlay />));
    const stage = host.querySelector<HTMLElement>('.duel-stage')!;
    stage.getBoundingClientRect = () => new DOMRect(0, 0, 720, 400);
    const down = new MouseEvent('pointerdown', { bubbles: true, clientX: 600, clientY: 200, button: 0 });
    Object.defineProperty(down, 'pointerType', { value: 'mouse' });
    act(() => stage.dispatchEvent(down));
    act(() => stage.dispatchEvent(new MouseEvent('pointerup', { bubbles: true })));
    act(() => vi.advanceTimersByTime(160));
    expect(vi.mocked(sendArenaInput).mock.lastCall?.[0].x).toBeGreaterThan(0);
    act(() => window.dispatchEvent(new Event('blur')));
    act(() => vi.advanceTimersByTime(80));
    expect(vi.mocked(sendArenaInput).mock.lastCall?.[0]).toMatchObject({ x: 0, y: 0 });
  } finally { act(() => root.unmount()); socialStore.setState(previous); vi.useRealTimers(); }
});
it('lets the result return button receive a tap instead of capturing it as arena movement', () => {
  const host = document.createElement('div'),
    root = createRoot(host),
    previous = socialStore.getState();
  const p = newPlayer(),
    a = buildDuelist(p, playerStats(p), 'Luyện Khí', 'a'),
    b = { ...a, userId: 'b' };
  a.loadout=['basic','ly_mo_uyen_1','ly_mo_uyen_2','ly_mo_uyen_3','ly_mo_uyen_4','ly_mo_uyen_5','ly_mo_uyen_6'];
  b.loadout=[...a.loadout];
  const e = new ArenaEngine('return', a, b);
  e.forfeit('b');
  socialStore.setState({
    duel: {
      nonce: 'return',
      snapshot: e.snapshot(),
      a,
      b,
      aIsMe: true,
      localId: 'a',
      practice: true,
    },
  });
  try {
    act(() => root.render(<DuelOverlay />));
    const stage = host.querySelector<HTMLElement>('.duel-stage')!,
      capture = vi.fn();
    stage.setPointerCapture = capture;
    const button = host.querySelector<HTMLButtonElement>('.duel-finish button')!;
    act(() => button.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true })));
    expect(capture).not.toHaveBeenCalled();
    act(() => button.click());
    expect(closeArena).toHaveBeenCalledOnce();
    expect(host.querySelectorAll('.duel-abilities button')).toHaveLength(8);
    expect(host.querySelector('.duel-leave')).not.toBeNull();
  } finally {
    act(() => root.unmount());
    socialStore.setState(previous);
  }
});
