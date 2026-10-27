// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { QuestPanel } from './QuestPanel';
import { gameStore, newPlayer } from '../store/gameStore';
import { socialStore } from '../store/socialStore';
import { leaveParty } from '../net/socialBridge';

vi.mock('../net/session', () => ({
  useAccount: () => ({ user: { id: 'self' } }),
  getAccountState: () => ({ user: { id: 'self' } }),
}));
vi.mock('../net/socialBridge', () => ({ leaveParty: vi.fn() }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let host: HTMLDivElement, root: Root;
const game = gameStore.getState(),
  social = socialStore.getState();
beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
  host = document.createElement('div');
  root = createRoot(host);
  gameStore.setState({ player: newPlayer(), quests: {} });
  socialStore.setState({ connected: true, partyId: null, roster: [], card: null });
});
afterEach(() => {
  act(() => root.unmount());
  gameStore.setState(game);
  socialStore.setState(social);
  vi.unstubAllGlobals();
});
it('renders the real party beside quests, reacts to presence updates and keeps member selection explicit', () => {
  act(() => root.render(<QuestPanel />));
  act(() => host.querySelectorAll<HTMLButtonElement>('.quest-tabs button')[1].click());
  expect(host.querySelector('.party-tracker')?.textContent).toContain('chưa có tổ đội');
  const peer = {
    key: 'peer:one',
    userId: 'peer',
    name: 'Đồng đội',
    level: 21,
    realm: 'Kim Đan Sơ Kỳ',
    mapId: 'linh_thu_lam',
    party: 'party-1',
    sex: 'male' as const,
    updatedAt: 1,
  };
  act(() =>
    socialStore.setState({
      partyId: 'party-1',
      partyLeaderId: 'self',
      roster: [peer, { ...peer, key: 'peer:two' }],
    }),
  );
  expect(host.querySelector('.party-tracker header')?.textContent).toContain('2 người');
  expect(host.querySelectorAll('.party-member')).toHaveLength(2);
  expect(host.querySelector('.party-dot')).not.toBeNull();
  act(() => host.querySelector<HTMLButtonElement>('.party-member:not(.self)')!.click());
  expect(socialStore.getState().card).toBe('peer');
  act(() => socialStore.setState({ roster: [] }));
  expect(host.querySelectorAll('.party-member')).toHaveLength(1);
  act(() => host.querySelectorAll<HTMLButtonElement>('.party-tracker footer button')[1].click());
  expect(leaveParty).toHaveBeenCalled();
  act(() => socialStore.setState({ partyId: null }));
  expect(host.querySelector('.party-tracker')?.textContent).toContain('chưa có tổ đội');
});
