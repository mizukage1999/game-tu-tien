import { gameStore } from '../store/gameStore';
import { socialStore, type SocialInvite, presenceFor } from '../store/socialStore';
import { buildDuelist, type Duelist } from '../game/systems/duel';
import { ArenaEngine, type ArenaInput } from '../game/systems/arena';
import { arenaSteer, arenaLineClear } from '../game/systems/arenaNavigation';
import { EventBus } from '../game/EventBus';
import { isChildhood } from '../game/systems/origin';
import { lifeProgress } from '../game/systems/life';
import { adventure } from '../game/systems/adventure';
import { realmNameAtLevel } from '../game/systems/progression';
import { saveGame } from '../game/systems/save';
import { getAccountState } from './session';
import { joinSocialChannel, type SocialChannel } from './socialChannel';
import { newPartyId, type FriendRef, type PublicProfile, type SocialMessage } from './social';
import { WhisperCrypto } from './whisperCrypto';
import { chatStore } from '../store/chatStore';
import { inspectionStore } from '../store/inspectionStore';
import { buildInspection } from './inspection';
import { attachPartyDungeonTransport, receivePartyDungeon } from './partyDungeon';

let channel: SocialChannel | null = null;
let stopSocial: (() => void) | null = null;

/** Our own stats snapshot, taken when a duel is proposed so it cannot drift mid-fight. */
let pendingNonce: { nonce: string; duelist: Duelist; peer: string } | null = null;
let arenaEngine: ArenaEngine | null = null;
let arenaTimer: ReturnType<typeof setInterval> | null = null;
let arenaReady = new Set<string>();
let lastPeerInput = 0;
let practiceSeq = 0;
let rewardedNonce = '';
let whispers: WhisperCrypto | null = null;
let lastWorldChat = -Infinity, worldChatSending = false;
const worldChatReceived = new Map<string, number>();
function canDuel() {
  const s = gameStore.getState();
  return (
    s.status === 'alive' &&
    !isChildhood(s.player) &&
    !s.tribulation &&
    !s.dungeon &&
    !lifeProgress(s.player).retreat &&
    !socialStore.getState().duel
  );
}

function openArena(a: Duelist, b: Duelist, nonce: string, host: boolean, practice = false) {
  if (arenaTimer) clearInterval(arenaTimer);
  arenaEngine = host ? new ArenaEngine(nonce, a, b) : null;
  arenaReady = new Set();
  lastPeerInput = Date.now();
  const snapshot = (arenaEngine ?? new ArenaEngine(nonce, a, b)).snapshot();
  socialStore.getState().setDuel({
    nonce,
    snapshot,
    a,
    b,
    aIsMe: a.userId === myRef().userId,
    localId: myRef().userId,
    practice,
  });
  gameStore.getState().setAuto(false);
  gameStore.getState().setMenu(null);
  EventBus.emit('cmd:duelPause', true);
  if (!host) {
    arenaTimer = setInterval(() => {
      const live = socialStore.getState().duel;
      if (!live || live.snapshot.phase === 'finished') {
        if (arenaTimer) clearInterval(arenaTimer);
        arenaTimer = null;
        return;
      }
      if (Date.now() - lastPeerInput > 20000) {
        socialStore.getState().setDuel({
          ...live,
          snapshot: {
            ...live.snapshot,
            phase: 'finished',
            winner: null,
            reason: 'Mất kết nối với đối thủ',
          },
        });
      }
    }, 1000);
    return;
  }
  arenaTimer = setInterval(() => {
    const live = socialStore.getState().duel;
    if (!arenaEngine || !live) return;
    if (practice && arenaEngine.state.phase === 'fighting') {
      const [hero, bot] = arenaEngine.state.fighters,
        dx = hero.x - bot.x,
        dy = hero.y - bot.y,
        d = Math.hypot(dx, dy) || 1;
      const danger = arenaEngine.state.effects.some(
        (e) =>
          e.owner !== bot.userId &&
          !e.resolved &&
          Math.hypot(e.x - bot.x, e.y - bot.y) < e.range + 20,
      );
      const goal = danger
        ? {
            x: Math.max(30, Math.min(690, bot.x - (dy / d) * 90)),
            y: Math.max(30, Math.min(370, bot.y + (dx / d) * 90)),
          }
        : hero;
      const steering = arenaSteer(bot, goal);
      arenaEngine.input(bot.userId, {
        seq: ++practiceSeq,
        x: danger || d > 65 ? steering.x : 0,
        y: danger || d > 65 ? steering.y : 0,
        cast: d < 90 && arenaLineClear(bot, hero) ? 'basic' : null,
      });
    }
    if (!practice && Date.now() - lastPeerInput > 20000)
      arenaEngine.forfeit(b.userId, 'Đối thủ mất kết nối');
    arenaEngine.step(50);
    const snapshot = arenaEngine.snapshot();
    socialStore.getState().setDuel({ ...live, snapshot });
    if (!practice)
      channel?.send({ t: 'arena:state', to: b.userId, from: a.userId, nonce, snapshot });
    if (snapshot.phase === 'finished') {
      if (rewardedNonce !== nonce) {
        rewardedNonce = nonce;
        gameStore.getState().recordAdventure('duel');
      }
      if (arenaTimer) clearInterval(arenaTimer);
      arenaTimer = null;
    }
  }, 50);
}
export function readyArena() {
  const live = socialStore.getState().duel;
  if (!live) return;
  if (live.aIsMe) {
    arenaReady.add(live.localId);
    if (live.practice || arenaReady.has(live.b.userId)) arenaEngine?.start();
  } else
    channel?.send({ t: 'arena:ready', to: live.a.userId, from: live.localId, nonce: live.nonce });
}
export function sendArenaInput(input: ArenaInput) {
  const live = socialStore.getState().duel;
  if (!live) return;
  if (live.aIsMe) arenaEngine?.input(live.localId, input);
  else
    channel?.send({
      t: 'arena:input',
      to: live.a.userId,
      from: live.localId,
      nonce: live.nonce,
      input,
    });
}
export function closeArena() {
  const live = socialStore.getState().duel;
  if (live && !live.practice && live.snapshot.phase !== 'finished')
    channel?.send({
      t: 'arena:leave',
      to: live.aIsMe ? live.b.userId : live.a.userId,
      from: live.localId,
      nonce: live.nonce,
    });
  if (arenaTimer) clearInterval(arenaTimer);
  arenaTimer = null;
  arenaEngine = null;
  socialStore.getState().setDuel(null);
  if (live) EventBus.emit('cmd:duelPause', false);
}
export function practiceDuel() {
  if (!canDuel()) return;
  const mine = myDuelist(),
    bot = {
      ...mine,
      userId: 'practice',
      name: 'Mộc Nhân Luận Kiếm',
      heroId: 'so_thien' as const,
      sex: 'male' as const,
      atk: Math.round(mine.atk * 0.7),
      loadout: ['basic'] as Duelist['loadout'],
    };
  openArena(mine, bot, crypto.randomUUID().slice(0, 24), true, true);
}

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
    heroId: s.player.heroId,
    level: s.player.level,
    realm: realmNameAtLevel(s.player.level),
    mapId: s.mapId,
    party: socialStore.getState().partyId,
    sect: isChildhood(s.player) ? undefined : adventure(s.player).boundSect,
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
  if (!invite.nonce || !invite.duelist || !channel || !canDuel()) return;
  const mine = myDuelist();
  channel.send({
    t: 'duel:ok',
    to: invite.from.userId,
    from: myRef(),
    nonce: invite.nonce,
    duelist: mine,
  });
  openArena(invite.duelist, mine, invite.nonce, false);
  socialStore.getState().dismissInvite(invite.id);
}

function handleMessage(message: SocialMessage) {
  if (message.t === 'dungeon') { receivePartyDungeon(message.from, message.packet); return; }
  const social = socialStore.getState();
  const game = gameStore.getState();
  if (message.t === 'chat:world') {
    const sender = social.roster.find((p) => p.userId === message.from.userId), now = Date.now();
    if (!sender || sender.userId === myRef().userId || now - (worldChatReceived.get(sender.userId) ?? -Infinity) < 1500) return;
    if (chatStore.getState().add({ id: message.id, kind: 'world', from: sender.userId, name: sender.name, text: message.text, at: now })) {
      worldChatReceived.set(sender.userId, now);
      game.addLog(`${sender.name}: ${message.text}`, 'world');
    }
    return;
  }
  if (message.t === 'inspect:ask') {
    if (!social.roster.some((p) => p.userId === message.from)) return;
    channel?.send({
      t: 'inspect:result',
      to: message.from,
      from: myRef().userId,
      nonce: message.nonce,
      inspection: buildInspection(game.player, game.stats, game.quests, game.mapId, myRef().userId),
    });
    return;
  }
  if (message.t === 'inspect:result') {
    if (social.roster.some((p) => p.userId === message.from))
      inspectionStore.getState().complete(message.from, message.nonce, message.inspection);
    return;
  }
  if (message.t === 'chat:private') {
    const sender = social.roster.find((p) => p.userId === message.from.userId);
    if (
      !whispers ||
      !sender?.chatKey ||
      sender.chatKey.x !== message.key.x ||
      sender.chatKey.y !== message.key.y
    )
      return;
    const session = whispers;
    void session
      .open({ ...message, from: message.from.userId })
      .then((text) => {
        if (session !== whispers || message.to !== myRef().userId) return;
        if (!text.trim() || text.length > 200) return;
        if (
          chatStore.getState().add({
            id: message.id,
            kind: 'private',
            from: message.from.userId,
            to: message.to,
            name: sender.name,
            text,
            at: Date.now(),
          })
        )
          EventBus.emit('chat:whisper', { from: sender.userId, text });
      })
      .catch(() => undefined);
    return;
  }
  if (message.t.startsWith('arena:')) {
    const m = message as Extract<
        SocialMessage,
        { t: 'arena:ready' | 'arena:input' | 'arena:state' | 'arena:leave' }
      >,
      live = social.duel;
    if (!live || m.nonce !== live.nonce || m.from !== (live.aIsMe ? live.b.userId : live.a.userId))
      return;
    lastPeerInput = Date.now();
    if (m.t === 'arena:ready' && live.aIsMe) {
      arenaReady.add(m.from);
      if (arenaReady.has(live.localId)) arenaEngine?.start();
    }
    if (m.t === 'arena:input' && live.aIsMe) arenaEngine?.input(m.from, m.input);
    if (
      m.t === 'arena:state' &&
      !live.aIsMe &&
      m.snapshot.elapsed >= live.snapshot.elapsed &&
      m.snapshot.fighters[0].userId === live.a.userId &&
      m.snapshot.fighters[1].userId === live.b.userId
    ) {
      social.setDuel({ ...live, snapshot: m.snapshot });
      if (m.snapshot.phase === 'finished' && rewardedNonce !== live.nonce) {
        rewardedNonce = live.nonce;
        game.recordAdventure('duel');
      }
    }
    if (m.t === 'arena:leave') {
      if (arenaEngine) arenaEngine.forfeit(m.from);
      else
        social.setDuel({
          ...live,
          snapshot: {
            ...live.snapshot,
            phase: 'finished',
            winner: live.localId,
            reason: 'Đối thủ rời trận',
          },
        });
    }
    return;
  }
  switch (message.t) {
    case 'duel:ask': {
      if (!canDuel()) return;
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
      if (
        !pendingNonce ||
        pendingNonce.nonce !== message.nonce ||
        pendingNonce.peer !== message.from.userId ||
        !canDuel()
      )
        return;
      const mine = pendingNonce.duelist;
      openArena(mine, message.duelist, message.nonce, true);
      pendingNonce = null;
      break;
    }
    case 'duel:no': {
      if (pendingNonce?.peer !== message.from) return;
      game.toast('Đối thủ từ chối tỉ võ.', 'warn');
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
      social.pushInvite({
        id: `friend:${message.from.userId}`,
        kind: 'friend',
        from: message.from,
        createdAt: Date.now(),
      });
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
  lastWorldChat = -Infinity;
  worldChatReceived.clear();
  chatStore.getState().reset();
  if (crypto.subtle) {
    whispers = new WhisperCrypto();
    void whispers.publicKey().then((chatKey) => {
      if (channel === next) next.update({ chatKey });
    });
  }
  if (import.meta.env.DEV) Object.assign(window, { __socialChannel: channel });

  const social = socialStore.getState();
  social.setConnected(true);
  social.setFriends(gameStore.getState().player.friends ?? []);

  const offRoster = channel.onRoster((roster) => socialStore.getState().setRoster(roster));
  const offMessage = channel.onMessage(handleMessage);
  // Re-track presence when the character grows or changes map, so cards stay accurate.
  const offLevel = gameStore.subscribe((s, prev) => {
    if (
      s.player.level !== prev.player.level ||
      s.player.realmIndex !== prev.player.realmIndex ||
      s.mapId !== prev.mapId ||
      s.player.admitted !== prev.player.admitted ||
      s.player.adventure?.boundSect !== prev.player.adventure?.boundSect
    ) {
      channel?.update(myProfile());
    }
  });

  const offPartyDungeon = attachPartyDungeonTransport((to, packet) => channel?.send({ t: 'dungeon', to, from: myRef().userId, packet }));
  const cleanup = () => {
    offPartyDungeon();
    closeArena();
    offRoster();
    offMessage();
    offLevel();
    void channel?.leave();
    channel = null;
    whispers = null;
    worldChatSending = false;
    worldChatReceived.clear();
    chatStore.getState().reset();
    inspectionStore.getState().reset();
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

/** Fetch public loadout on demand instead of broadcasting the entire character save. */
export function requestInspection(userId: string): () => void {
  const nonce = crypto.randomUUID(),
    store = inspectionStore.getState();
  store.begin(userId, nonce);
  if (userId === myRef().userId) {
    const s = gameStore.getState();
    store.complete(userId, nonce, buildInspection(s.player, s.stats, s.quests, s.mapId, userId));
  } else if (channel && presenceFor(socialStore.getState().roster, userId))
    channel.send({ t: 'inspect:ask', to: userId, from: myRef().userId, nonce });
  else store.fail(nonce);
  const timer = setTimeout(() => inspectionStore.getState().fail(nonce), 6000);
  return () => {
    clearTimeout(timer);
    if (inspectionStore.getState().nonce === nonce) inspectionStore.getState().reset();
  };
}

/** Sends a duel challenge. The nonce is what both clients later replay. */
export function challengeDuel(userId: string) {
  if (!channel) return;
  if (!canDuel()) return;
  const nonce = Math.random().toString(36).slice(2, 10);
  const duelist = myDuelist();
  pendingNonce = { nonce, duelist, peer: userId };
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
  gameStore
    .getState()
    .toast(
      social.partyLeaderId === myRef().userId ? 'Đã giải tán tổ đội.' : 'Đã rời tổ đội.',
      'info',
    );
}

/** Answers a pending invitation. */
export function respondInvite(invite: SocialInvite, accept: boolean) {
  const social = socialStore.getState();
  social.dismissInvite(invite.id);
  if (!accept) {
    if (!channel) return;
    if (invite.kind === 'duel')
      channel.send({ t: 'duel:no', to: invite.from.userId, from: myRef().userId });
    if (invite.kind === 'friend')
      channel.send({ t: 'friend:no', to: invite.from.userId, from: myRef().userId });
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
    channel.send({
      t: 'party:join',
      to: invite.from.userId,
      from: myRef(),
      partyId: invite.partyId,
    });
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

export async function sendWhisper(to: string, text: string): Promise<boolean> {
  text = text.trim();
  const peer = socialStore.getState().roster.find((p) => p.userId === to);
  if (!text || text.length > 200 || !channel || !whispers || !peer?.chatKey) {
    gameStore
      .getState()
      .toast('Đạo hữu cần trực tuyến và mở phiên chat mới để nhận tin mật.', 'warn');
    return false;
  }
  try {
    const envelope = await whispers.seal(peer.chatKey, text, myRef().userId, to);
    channel.send({ ...envelope, t: 'chat:private', from: myRef() });
    chatStore.getState().add({
      id: envelope.id,
      kind: 'private',
      from: myRef().userId,
      to,
      name: myRef().name,
      text,
      at: Date.now(),
      outgoing: true,
    });
    return true;
  } catch {
    gameStore.getState().toast('Chưa gửi được tin mật. Hãy thử lại.', 'warn');
    return false;
  }
}

export async function sendWorldChat(text: string): Promise<boolean> {
  const game = gameStore.getState(), transport = channel;
  text = text.trim();
  if (!text || text.length > 200 || /[\p{Cc}\p{Cf}]/u.test(text)) return false;
  if (!transport || !getAccountState().user) { game.toast('Cần kết nối server để chat Thế Giới.', 'warn'); return false; }
  if (worldChatSending || Date.now() - lastWorldChat < 2000) { game.toast('Hãy đợi 2 giây giữa các tin Thế Giới.', 'info'); return false; }
  worldChatSending = true;
  const from = myRef(), id = crypto.randomUUID();
  try {
    if (!await transport.send({ t: 'chat:world', to: '*', from, id, text }) || channel !== transport) {
      game.toast('Chưa gửi được tin Thế Giới. Hãy thử lại.', 'warn'); return false;
    }
    lastWorldChat = Date.now();
    chatStore.getState().add({ id, kind: 'world', from: from.userId, name: from.name, text, at: lastWorldChat, outgoing: true });
    game.addLog(`${from.name}: ${text}`, 'world');
    return true;
  } finally { if (channel === transport) worldChatSending = false; }
}
