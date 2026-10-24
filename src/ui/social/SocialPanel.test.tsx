// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SocialPanel } from './SocialPanel';
import { socialStore } from '../../store/socialStore';
import { gameStore, newPlayer } from '../../store/gameStore';
import { inviteToParty, removeFriend, respondInvite } from '../../net/socialBridge';

vi.mock('../../net/socialBridge', () => ({
  challengeDuel: vi.fn(),
  inviteToParty: vi.fn(),
  leaveParty: vi.fn(),
  removeFriend: vi.fn(),
  respondInvite: vi.fn(),
}));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let host: HTMLDivElement, root: Root;
let previousSocial: ReturnType<typeof socialStore.getState>;
let previousGame: ReturnType<typeof gameStore.getState>;
function button(text: string) {
  return [...host.querySelectorAll<HTMLButtonElement>('button')].find(
    (b) => b.textContent === text,
  )!;
}
beforeEach(() => {
  previousSocial = socialStore.getState();
  previousGame = gameStore.getState();
  host = document.createElement('div');
  root = createRoot(host);
  vi.clearAllMocks();
  gameStore.setState({
    player: { ...newPlayer(), admitted: true },
    status: 'alive',
    dungeon: null,
    tribulation: null,
  });
  socialStore.setState({
    connected: true,
    partyId: null,
    partyLeaderId: null,
    duel: null,
    friends: [
      { userId: 'wan', name: 'Lý Mộ Uyển' },
      { userId: 'lin', name: 'Vương Lâm' },
    ],
    roster: [
      {
        userId: 'wan',
        name: 'Lý Mộ Uyển',
        sex: 'female',
        level: 32,
        realm: 'Kết Đan',
        mapId: 'vuong_gia_thon',
        party: null,
        key: 'wan',
        updatedAt: Date.now(),
      },
    ],
    invites: [
      {
        id: 'invite-1',
        from: { userId: 'new', name: 'Thanh Nhi' },
        kind: 'friend',
        createdAt: Date.now(),
      },
    ],
  });
  act(() => root.render(<SocialPanel />));
});
afterEach(() => {
  act(() => root.unmount());
  socialStore.setState(previousSocial);
  gameStore.setState(previousGame);
});

describe('friends and invitations', () => {
  it('searches Vietnamese names without accents, filters presence and blocks offline actions', () => {
    expect(host.querySelector('[aria-current="page"]')?.textContent).toContain('Bạn bè');
    expect(host.querySelectorAll('[data-friend]')).toHaveLength(2);
    expect(host.querySelector('.correspondence-profile-facts')?.textContent).toContain(
      'Vương Gia Thôn',
    );
    act(() => button('Mời tổ đội').click());
    expect(inviteToParty).toHaveBeenCalledWith('wan');
    const input = host.querySelector<HTMLInputElement>('input')!;
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
        input,
        'vuong lam',
      );
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(host.querySelectorAll('[data-friend]')).toHaveLength(1);
    expect(host.querySelector('[data-friend]')?.getAttribute('data-friend')).toBe('lin');
    expect(button('Mời tổ đội').disabled).toBe(true);
    expect(host.querySelector('.correspondence-profile-facts')?.textContent).not.toContain('Lv.32');
    act(() => host.querySelector<HTMLButtonElement>('[aria-label="Xóa tìm kiếm"]')!.click());
    const select = host.querySelector<HTMLSelectElement>('select')!;
    act(() => {
      select.value = 'online';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(host.querySelectorAll('[data-friend]')).toHaveLength(1);
    expect(host.querySelector('[data-friend]')?.getAttribute('data-friend')).toBe('wan');
    act(() => socialStore.setState({ connected: false }));
    expect(button('Mời tổ đội').disabled).toBe(true);
    expect(host.querySelectorAll('[data-friend]')).toHaveLength(2);
    expect(host.querySelector('.correspondence-profile-facts')?.textContent).not.toContain('Lv.32');
  });

  it('routes invitation responses and friend removal to the existing real actions', () => {
    act(() =>
      [...host.querySelectorAll<HTMLButtonElement>('nav button')]
        .find((b) => b.textContent?.startsWith('Lời mời'))!
        .click(),
    );
    expect(host.querySelectorAll('.correspondence-invite-card')).toHaveLength(1);
    act(() => button('Đồng ý').click());
    expect(respondInvite).toHaveBeenCalledWith(expect.objectContaining({ id: 'invite-1' }), true);
    act(() => socialStore.setState({ connected: false }));
    expect(button('Đồng ý').disabled).toBe(true);
    act(() => button('Từ chối').click());
    expect(respondInvite).toHaveBeenCalledWith(expect.objectContaining({ id: 'invite-1' }), false);
    act(() =>
      [...host.querySelectorAll<HTMLButtonElement>('nav button')]
        .find((b) => b.textContent?.startsWith('Bạn bè'))!
        .click(),
    );
    act(() => button('Xóa bạn').click());
    expect(removeFriend).not.toHaveBeenCalled();
    act(() => button('Xác nhận xóa').click());
    expect(removeFriend).toHaveBeenCalledWith('wan');
  });
});
