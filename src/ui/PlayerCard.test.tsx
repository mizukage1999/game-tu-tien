// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlayerCard } from './PlayerCard';
import { socialStore } from '../store/socialStore';
import { gameStore, newPlayer } from '../store/gameStore';
import { inspectionStore } from '../store/inspectionStore';
import { buildInspection } from '../net/inspection';
import { playerStats } from '../game/systems/progression';
import { adventure } from '../game/systems/adventure';
import { ITEMS } from '../data';
import { requestInspection, inviteToParty, challengeDuel } from '../net/socialBridge';

vi.mock('../net/socialBridge', () => ({
  requestInspection: vi.fn(),
  inviteToParty: vi.fn(),
  challengeDuel: vi.fn(),
  requestFriend: vi.fn(),
  removeFriend: vi.fn(),
}));
vi.mock('../game/art/icons', () => ({ itemIconUrl: (id: string) => `/item/${id}.png` }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let host: HTMLDivElement, root: Root;
let previousSocial: ReturnType<typeof socialStore.getState>,
  previousGame: ReturnType<typeof gameStore.getState>;
const weapon = Object.keys(ITEMS).find(
  (id) => ITEMS[id].slot === 'weapon' && ITEMS[id].rarity === 'red',
)!;
const p = {
  ...newPlayer(),
  heroId: 'hong_lien' as const,
  sex: 'female' as const,
  name: 'Hồng Liên',
  admitted: true,
  level: 25,
  realmIndex: 2,
  equipment: { weapon: `${weapon}~peer` },
};
const peer = { ...p, adventure: { ...adventure(p), enhancements: { [`${weapon}~peer`]: 12 } } };
const data = buildInspection(peer, playerStats(peer), {}, 'dai_thua_vien', 'peer');
function button(label: string) {
  return [...host.querySelectorAll<HTMLButtonElement>('button')].find(
    (b) =>
      b.textContent?.trim() === label || b.querySelector('span')?.textContent?.trim() === label,
  )!;
}
beforeEach(() => {
  previousSocial = socialStore.getState();
  previousGame = gameStore.getState();
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  vi.clearAllMocks();
  gameStore.setState({ player: newPlayer() });
  socialStore.setState({
    card: 'peer',
    connected: true,
    friends: [],
    partyId: null,
    roster: [
      {
        userId: 'peer',
        key: 'peer',
        name: 'Hồng Liên',
        heroId: 'hong_lien',
        sex: 'female',
        level: 25,
        realm: data.realm,
        mapId: 'dai_thua_vien',
        party: null,
        updatedAt: Date.now(),
      },
    ],
  });
  vi.mocked(requestInspection).mockImplementation((id) => {
    inspectionStore.getState().begin(id, 'fixture');
    inspectionStore.getState().complete(id, 'fixture', data);
    return () => inspectionStore.getState().reset();
  });
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  socialStore.setState(previousSocial);
  gameStore.setState(previousGame);
  inspectionStore.getState().reset();
});
describe('painted opponent card', () => {
  it('shows peer gear and skills through actual tabs while leaving the local player untouched', () => {
    const local = gameStore.getState().player;
    act(() => root.render(<PlayerCard />));
    expect(host.querySelector('[role=dialog]')?.getAttribute('aria-label')).toContain('Hồng Liên');
    act(() => button('Trang bị').click());
    expect(host.textContent).toContain(ITEMS[weapon].name);
    expect(host.textContent).toContain('+12 / 12');
    act(() => button('Kỹ năng').click());
    expect(host.textContent).toContain('Hỏa Ma Chỉ');
    expect(host.querySelectorAll('.inspect-skill-grid .equipped')).toHaveLength(5);
    expect(gameStore.getState().player).toEqual(local);
    act(() => button('Tổng quan').click());
    act(() => button('Xem so sánh thuộc tính ⇄').click());
    expect(host.querySelector('.inspect-comparison')).not.toBeNull();
  });
  it('keeps real invitation actions and closes on Escape', () => {
    act(() => root.render(<PlayerCard />));
    act(() => button('♟ Mời tổ đội').click());
    expect(inviteToParty).toHaveBeenCalledWith('peer');
    expect(socialStore.getState().card).toBeNull();
    act(() => socialStore.getState().openCard('peer'));
    act(() => button('⚔ Thách đấu').click());
    expect(challengeDuel).toHaveBeenCalledWith('peer');
    act(() => socialStore.getState().openCard('peer'));
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(socialStore.getState().card).toBeNull();
  });
  it('renders an honest unavailable state and disables invites after the peer leaves', () => {
    vi.mocked(requestInspection).mockImplementation((id) => {
      inspectionStore.getState().begin(id, 'unavailable');
      inspectionStore.getState().fail('unavailable');
      return () => {};
    });
    socialStore.setState({ roster: [] });
    act(() => root.render(<PlayerCard />));
    expect(host.textContent).toContain('Chưa nhận được thông tin chi tiết');
    expect(button('♟ Mời tổ đội').disabled).toBe(true);
    expect(button('⚔ Thách đấu').disabled).toBe(true);
    act(() => button('Trang bị').click());
    expect(host.textContent).toContain('Trang bị sẽ hiện khi nhận được thông tin');
    expect(host.textContent).not.toContain(ITEMS[weapon].name);
  });
});
