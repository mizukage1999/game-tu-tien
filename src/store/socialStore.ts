import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { Duelist } from '../game/systems/duel';
import type { ArenaSnapshot } from '../game/systems/arena';
import type { FriendRef, SocialPresence } from '../net/social';

/** A pending invitation from another player. At most one per sender+kind is kept. */
export interface SocialInvite {
  id: string;
  kind: 'party' | 'friend' | 'duel';
  from: FriendRef;
  createdAt: number;
  /** Duel only: shared seed + the sender's stats. */
  nonce?: string;
  duelist?: Duelist;
  /** Party only: the party being joined (new id for a fresh party). */
  partyId?: string;
}

/** A finished duel. Both sides compute it independently, so they always agree. */
export interface DuelState {
  nonce:string;
  snapshot:ArenaSnapshot;
  localId:string;
  practice:boolean;
  /** The two fighters, for rendering names/levels above the HP bars. */
  a: Duelist;
  b: Duelist;
  /** True when `a` is the local player. */
  aIsMe: boolean;
}

export interface SocialState {
  connected: boolean;
  roster: SocialPresence[];
  /** Local player's party id, or null when solo. */
  partyId: string | null;
  /** Who created the party. Leaving as the leader disbands it. */
  partyLeaderId: string | null;
  friends: FriendRef[];
  invites: SocialInvite[];
  duel: DuelState | null;
  /** User id whose card is open, or null when the card is closed. */
  card: string | null;

  setConnected(connected: boolean): void;
  setRoster(roster: SocialPresence[]): void;
  setPartyId(partyId: string | null, leaderId: string | null): void;
  setFriends(friends: FriendRef[]): void;
  addFriend(friend: FriendRef): void;
  removeFriend(userId: string): void;
  pushInvite(invite: SocialInvite): void;
  dismissInvite(id: string): void;
  clearInvitesFrom(userId: string, kind?: SocialInvite['kind']): void;
  setDuel(duel: DuelState | null): void;
  openCard(userId: string): void;
  closeCard(): void;
}

export const socialStore = createStore<SocialState>((set) => ({
  connected: false,
  roster: [],
  partyId: null,
  partyLeaderId: null,
  friends: [],
  invites: [],
  duel: null,
  card: null,

  setConnected(connected) {
    set({ connected });
  },
  setRoster(roster) {
    set({ roster });
  },
  setPartyId(partyId, leaderId) {
    set({ partyId, partyLeaderId: leaderId });
  },
  setFriends(friends) {
    set({ friends });
  },
  addFriend(friend) {
    set((s) => (s.friends.some((f) => f.userId === friend.userId) ? s : { friends: [...s.friends, friend] }));
  },
  removeFriend(userId) {
    set((s) => ({ friends: s.friends.filter((f) => f.userId !== userId) }));
  },
  pushInvite(invite) {
    set((s) => ({
      invites: [...s.invites.filter((i) => !(i.kind === invite.kind && i.from.userId === invite.from.userId)), invite],
    }));
  },
  dismissInvite(id) {
    set((s) => ({ invites: s.invites.filter((i) => i.id !== id) }));
  },
  clearInvitesFrom(userId, kind) {
    set((s) => ({
      invites: s.invites.filter((i) => !(i.from.userId === userId && (!kind || i.kind === kind))),
    }));
  },
  setDuel(duel) {
    set({ duel });
  },
  openCard(userId) {
    set({ card: userId });
  },
  closeCard() {
    set({ card: null });
  },
}));

export function useSocial<T>(selector: (s: SocialState) => T): T {
  return useStore(socialStore, selector);
}

/** Presence entry for a user id, or null if they left the channel. */
export function presenceFor(roster: SocialPresence[], userId: string): SocialPresence | null {
  return roster.find((p) => p.userId === userId) ?? null;
}
