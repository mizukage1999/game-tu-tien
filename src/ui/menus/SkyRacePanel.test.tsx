// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { SkyRacePanel } from './SkyRacePanel';
import { skyRaceAction, type SkyRacePage } from '../../net/skyRace';
import { gameStore, newPlayer } from '../../store/gameStore';
import { socialStore } from '../../store/socialStore';
vi.mock('../../net/skyRace', () => ({ skyRaceAction: vi.fn() }));
vi.mock('../SkyRaceRun', () => ({
  SkyRaceRun: ({ run }: { run: { seed: number } }) => <div data-flight-seed={run.seed} />,
}));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
it('allows practice while the online board is pending and keeps its course when a late reply arrives', async () => {
  const host = document.createElement('div'),
    root = createRoot(host),
    previous = gameStore.getState(),
    social = socialStore.getState();
  let resolve!: (page: SkyRacePage) => void;
  vi.mocked(skyRaceAction).mockReturnValue(
    new Promise((r) => {
      resolve = r;
    }),
  );
  gameStore.setState({
    player: newPlayer(),
    status: 'alive',
    dungeon: null,
    tribulation: null,
    mapId: 'vuong_gia_thon',
  });
  socialStore.setState({ duel: null });
  try {
    await act(async () => root.render(<SkyRacePanel />));
    const practice = Array.from(host.querySelectorAll('button')).find(
      (b) => b.textContent === 'Bay thử',
    )!;
    expect(practice.disabled).toBe(false);
    await act(async () => practice.click());
    const seed = host.querySelector('[data-flight-seed]')?.getAttribute('data-flight-seed');
    expect(Number(seed)).toBeGreaterThan(0);
    await act(async () =>
      resolve({ week: '2000-01-03', seed: 123, rows: [], self: null, result: null, run: null }),
    );
    expect(host.querySelector('[data-flight-seed]')?.getAttribute('data-flight-seed')).toBe(seed);
  } finally {
    act(() => root.unmount());
    gameStore.setState(previous);
    socialStore.setState(social);
  }
});
