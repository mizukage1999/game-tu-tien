import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { gameStore, newPlayer } from '../store/gameStore';
import { socialStore } from '../store/socialStore';
import { getAccountState, setAccountState } from './session';
import { EventBus } from '../game/EventBus';
import {
  attachPartyDungeonTransport,
  cancelPartyDungeon,
  completePartyDungeon,
  offerPartyDungeon,
  partyDungeonStore,
  readyPartyDungeon,
  receivePartyDungeon,
  startPartyDungeon,
} from './partyDungeon';
import type { PartyDungeonPacket } from '../game/systems/partyDungeon';

const gameBefore = gameStore.getState(),
  socialBefore = socialStore.getState(),
  accountBefore = getAccountState();
const send = vi.fn<(to: string, packet: PartyDungeonPacket) => void>();
let off: () => void;
const profile = (userId: string) => ({
  key: userId,
  userId,
  name: userId,
  sex: 'male' as const,
  level: 30,
  realm: 'Kim Đan',
  mapId: 'dai_thua_vien',
  party: 'team',
  updatedAt: Date.now(),
});
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-28T12:00:00Z'));
  setAccountState({ user: { id: 'leader' } as never });
  socialStore.setState({
    connected: true,
    partyId: 'team',
    partyLeaderId: 'leader',
    roster: [profile('member')],
    duel: null,
  });
  gameStore.setState({
    player: { ...newPlayer(), admitted: true },
    mapId: 'dai_thua_vien',
    status: 'alive',
    tribulation: null,
    dungeon: null,
    rewardPending: false,
    menu: null,
  });
  completePartyDungeon();
  send.mockClear();
  off = attachPartyDungeonTransport(send);
});
afterEach(() => {
  off();
  completePartyDungeon();
  gameStore.setState(gameBefore);
  socialStore.setState(socialBefore);
  setAccountState(accountBefore);
  vi.useRealTimers();
});

it('requires every participant to confirm, launches once, and ignores strangers or replays', () => {
  const enter = vi.fn(),
    unsubscribe = EventBus.on('cmd:enterPartyDungeon', enter);
  offerPartyDungeon('tier_30_de');
  const live = partyDungeonStore.getState().ticket!;
  expect(send).toHaveBeenCalledWith('member', { kind: 'offer', ticket: live });
  startPartyDungeon();
  expect(enter).not.toHaveBeenCalled();
  receivePartyDungeon('stranger', { kind: 'ready', id: live.id });
  startPartyDungeon();
  expect(enter).not.toHaveBeenCalled();
  receivePartyDungeon('member', { kind: 'ready', id: live.id });
  startPartyDungeon();
  startPartyDungeon();
  expect(enter).toHaveBeenCalledOnce();
  expect(enter).toHaveBeenCalledWith(live);
  expect(send).toHaveBeenCalledWith('member', { kind: 'start', id: live.id });
  unsubscribe();
});

it('does not force an unready invitee into combat or accept an expired/nonleader offer', () => {
  const enter = vi.fn(),
    unsubscribe = EventBus.on('cmd:enterPartyDungeon', enter);
  setAccountState({ user: { id: 'member' } as never });
  socialStore.setState({ roster: [profile('leader')] });
  const ticket = {
    id: 'room',
    party: 'team',
    leader: 'leader',
    dungeon: 'tier_30_de',
    members: [
      { userId: 'leader', name: 'Leader' },
      { userId: 'member', name: 'Member' },
    ],
    expires: Date.now() + 45000,
  };
  receivePartyDungeon('stranger', { kind: 'offer', ticket });
  expect(partyDungeonStore.getState().ticket).toBeNull();
  receivePartyDungeon('leader', { kind: 'offer', ticket: { ...ticket, expires: Date.now() - 1 } });
  expect(partyDungeonStore.getState().ticket).toBeNull();
  receivePartyDungeon('leader', { kind: 'offer', ticket });
  receivePartyDungeon('leader', { kind: 'start', id: 'room' });
  expect(enter).not.toHaveBeenCalled();
  readyPartyDungeon();
  expect(send).toHaveBeenCalledWith('leader', { kind: 'ready', id: 'room' });
  receivePartyDungeon('leader', { kind: 'start', id: 'room' });
  expect(enter).toHaveBeenCalledOnce();
  receivePartyDungeon('leader', { kind: 'start', id: 'room' });
  expect(enter).toHaveBeenCalledOnce();
  unsubscribe();
});

it('allows a member to cancel the whole ready check without charging an attempt', () => {
  offerPartyDungeon('tier_30_de');
  const id = partyDungeonStore.getState().ticket!.id;
  receivePartyDungeon('member', { kind: 'cancel', id });
  expect(partyDungeonStore.getState().phase).toBe('idle');
  expect(gameStore.getState().player.dungeons).toBeUndefined();
  offerPartyDungeon('tier_30_de');
  cancelPartyDungeon();
  expect(send.mock.calls.some(([, p]) => p.kind === 'cancel')).toBe(true);
});
