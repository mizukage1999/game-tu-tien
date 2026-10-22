import { gameStore } from '../store/gameStore';
import { socialStore, type SocialInvite, presenceFor } from '../store/socialStore';
import { buildDuelist, simulateDuel, type Duelist } from '../game/systems/duel';
import { realmNameAtLevel } from '../game/systems/progression';
import { saveGame } from '../game/systems/save';
import { getAccountState } from './session';
import { joinSocialChannel, type SocialChannel } from './socialChannel';
import { newPartyId, type FriendRef, type PublicProfile, type SocialMessage } from './social';

let channel: SocialChannel | null = null;
let stopSocial: (() => void) | null = null;

/** Our own stats snapshot, taken when a duel is proposed so it cannot drift mid-fight. */
let pendingNonce: { nonce: string; duelist: Duelist } | null = null;

function myRef(): FriendRef {
  const s = gameStore.getState();
  return { userId: getAccountState().user?.id ?? 'me', name: s.player.name };
}

function myDuelist(): Duelist {
  const s = gameStore.getState();
  return buildDuelist(s.player, s.stats, realmNameAtLevel(s.player.level), myRef().userId);
}

function myProfile(): PublicProfile {
  const s = gameStore.getState();
  return {
    userId: myRef().userId,
    name: s.player.name,
    sex: s.player.sex ?? 'female',
    level: s.player.level,
    realm: realmNameAtLevel(s.player.level),
    mapId: s.mapId,
    party: socialStore.getState().partyId,
  };
}

/** Friends live in the save file so they survive a reload and follow the account to the cloud. */
function persistFriends(friends: FriendRef[]) {
  socialStore.getState().setFriends(friends);
  const s = gameStore.getState();
  gameStore.setState({ player: { ...s.player, friends } });
  saveGame({ player: { ...s.player, friends }, quests: s.quests, mapId: s.mapId, pos: s.spawnPos });
}

function acceptDuel(invite: SocialInvite) {
  if (!invite.nonce || !invite.duelist || !channel) return;
  const mine = myDuelist();
  channel.send({
    t: 'duel:ok',
    to: invite.from.userId,
    from: myRef(),
    nonce: invite.nonce,
    duelist: mine,
  });
  const result = simulateDuel(invite.duelist, mine, invite.nonce);
  socialStore.getState().setDuel({ result, a: invite.duelist, b: mine, aIsMe: false, won: result.winnerId === mine.userId });
  socialStore.getState().dismissInvite(invite.id);
}

function handleMessage(message: SocialMessage) {
  const social = socialStore.getState();
  const game = gameStore.getState();
  switch (message.t) {
    case 'duel:ask': {
      social.pushInvite({
        id: `duel:${message.from.userId}:${message.nonce}`,
        kind: 'duel',
        from: message.from,
        createdAt: Date.now(),
        nonce: message.nonce,
        duelist: message.duelist,
      });
      game.toast(`${message.from.name} muốn tỉ võ.`, 'warn');
      break;
    }
    case 'duel:ok': {
      // Same seed, same stats on both sides: the two clients agree without a server.
      const mine = pendingNonce?.duelist ?? myDuelist();
      const result = simulateDuel(mine, message.duelist, message.nonce);
      social.setDuel({ result, a: mine, b: message.duelist, aIsMe: true, won: result.winnerId === mine.userId });
      pendingNonce = null;
      break;
    }
    case 'duel:no': {
      game.toast(`${message.from} từ chối tỉ võ.`, 'warn');
      pendingNonce = null;
      break;
    }
    case 'party:invite': {
      social.pushInvite({
        id: `party:${message.from.userId}:${message.partyId}`,
        kind: 'party',
        from: message.from,
        createdAt: Date.now(),
        partyId: message.partyId,
      });
      game.toast(`${message.from.name} mời bạn vào tổ đội.`, 'warn');
      break;
    }
    case 'party:join': {
      if (!social.partyId) {
        social.setPartyId(message.partyId, message.from.userId);
        channel?.update({ party: message.partyId });
      }
      game.toast(`${message.from.name} đã vào tổ đội.`, 'info');
      break;
    }
    case 'party:end': {
      social.setPartyId(null, null);
      channel?.update({ party: null });
      game.toast(`${message.from} giải tán tổ đội.`, 'warn');
      break;
    }
    case 'friend:ask': {
      social.pushInvite({ id: `friend:${message.from.userId}`, kind: 'friend', from: message.from, createdAt: Date.now() });
      game.toast(`${message.from.name} muốn kết hảo hữu.`, 'warn');
      break;
    }
    case 'friend:ok': {
      // message.from is the player who just accepted; add them on our side too.
      // `message` here is the *parsed* message, so `from` is a FriendRef — but
      // parseSocialMessage only carries userId + name, so level/realm are missing.
      // Fill from presence if available so the friend card is not all dashes.
      const incoming = message.from;
      const presence = presenceFor(social.roster, incoming.userId);
      const friend = presence ? { userId: incoming.userId, name: presence.name } : incoming;
      social.addFriend(friend);
      // Read the store again: addFriend returns a new list, and saving the snapshot
      // taken at the top of handleMessage would drop the friend that was just added.
      persistFriends(socialStore.getState().friends);
      game.toast(`${message.from.name} đã nhận lời kết hảo hữu.`, 'quest');
      break;
    }
    case 'friend:no': {
      game.toast(`${message.from} chưa muốn kết hảo hữu.`, 'warn');
      break;
    }
  }
}

/** Joins the social channel for the signed-in player. Returns a cleanup function. */
export function startSocial(): () => void {
  stopSocial?.();
  stopSocial = null;

  const account = getAccountState();
  if (!account.user) return () => {};
  const profile = myProfile();
  const next = joinSocialChannel(profile);
  if (!next) return () => {};
  channel = next;
  if (import.meta.env.DEV) Object.assign(window, { __socialChannel: channel });

  const social = socialStore.getState();
  social.setConnected(true);
  social.setFriends(gameStore.getState().player.friends ?? []);

  const offRoster = channel.onRoster((roster) => socialStore.getState().setRoster(roster));
  const offMessage = channel.onMessage(handleMessage);
  // Re-track presence when the character grows or changes map, so cards stay accurate.
  const offLevel = gameStore.subscribe((s, prev) => {
    if (s.player.level !== prev.player.level || s.player.realmIndex !== prev.player.realmIndex || s.mapId !== prev.mapId) {
      channel?.update(myProfile());
    }
  });

  const cleanup = () => {
    offRoster();
    offMessage();
    offLevel();
    void channel?.leave();
    channel = null;
    const state = socialStore.getState();
    state.setConnected(false);
    state.setRoster([]);
    state.setPartyId(null, null);
    state.setDuel(null);
    state.closeCard();
  };
  stopSocial = cleanup;
  return cleanup;
}

/** Stops the social channel and clears everything derived from it. */
export function stopSocialChannel() {
  stopSocial?.();
  stopSocial = null;
}

/** Sends a duel challenge. The nonce is what both clients later replay. */
export function challengeDuel(userId: string) {
  if (!channel) return;
  const nonce = Math.random().toString(36).slice(2, 10);
  const duelist = myDuelist();
  pendingNonce = { nonce, duelist };
  channel.send({ t: 'duel:ask', to: userId, from: myRef(), nonce, duelist });
  gameStore.getState().toast('Đã gửi lời mời tỉ võ.', 'info');
}

/** Invites another player to the current party, or starts a new one. */
export function inviteToParty(userId: string) {
  if (!channel) return;
  const social = socialStore.getState();
  let partyId = social.partyId;
  if (!partyId) {
    partyId = newPartyId(myRef().userId, Date.now());
    social.setPartyId(partyId, myRef().userId);
    channel.update({ party: partyId });
  }
  channel.send({ t: 'party:invite', to: userId, from: myRef(), partyId });
  gameStore.getState().toast('Đã gửi lời mời vào tổ đội.', 'info');
}

/** Asks to be friends. Both sides write the other into their save on accept. */
export function requestFriend(userId: string) {
  if (!channel) return;
  channel.send({ t: 'friend:ask', to: userId, from: myRef() });
  gameStore.getState().toast('Đã gửi lời kết hảo hữu.', 'info');
}

/** Leaves the current party. The leader leaving disbands it for everyone. */
export function leaveParty() {
  if (!channel) return;
  const social = socialStore.getState();
  const partyId = social.partyId;
  if (!partyId) return;
  const members = social.roster.filter((p) => p.party === partyId);
  if (social.partyLeaderId === myRef().userId) {
    for (const member of members) {
      channel.send({ t: 'party:end', to: member.userId, from: myRef().userId, partyId });
    }
  }
  social.setPartyId(null, null);
  channel.update({ party: null });
  gameStore.getState().toast(social.partyLeaderId === myRef().userId ? 'Đã giải tán tổ đội.' : 'Đã rời tổ đội.', 'info');
}

/** Answers a pending invitation. */
export function respondInvite(invite: SocialInvite, accept: boolean) {
  const social = socialStore.getState();
  social.dismissInvite(invite.id);
  if (!accept) {
    if (!channel) return;
    if (invite.kind === 'duel') channel.send({ t: 'duel:no', to: invite.from.userId, from: myRef().userId });
    if (invite.kind === 'friend') channel.send({ t: 'friend:no', to: invite.from.userId, from: myRef().userId });
    return;
  }
  if (invite.kind === 'duel') {
    acceptDuel(invite);
    return;
  }
  if (invite.kind === 'party' && invite.partyId) {
    if (!channel) return;
    social.setPartyId(invite.partyId, invite.from.userId);
    channel.update({ party: invite.partyId });
    channel.send({ t: 'party:join', to: invite.from.userId, from: myRef(), partyId: invite.partyId });
    gameStore.getState().toast(`Đã vào tổ đội của ${invite.from.name}.`, 'info');
    return;
  }
  if (invite.kind === 'friend') {
    if (!channel) return;
    social.addFriend(invite.from);
    persistFriends(socialStore.getState().friends);
    channel.send({ t: 'friend:ok', to: invite.from.userId, from: myRef() });
  }
}

/** Removes a friend. Local only; the other side is not told. */
export function removeFriend(userId: string) {
  persistFriends(socialStore.getState().friends.filter((f) => f.userId !== userId));
}
