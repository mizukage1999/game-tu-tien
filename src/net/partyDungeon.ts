import { createStore } from 'zustand/vanilla';
import { DUNGEONS } from '../data';
import { EventBus } from '../game/EventBus';
import { canEnter } from '../game/systems/dungeon';
import { isChildhood } from '../game/systems/origin';
import { lifeProgress } from '../game/systems/life';
import type { PartyDungeonPacket, PartyRunTicket } from '../game/systems/partyDungeon';
import { gameStore } from '../store/gameStore';
import { socialStore } from '../store/socialStore';
import { getAccountState } from './session';

export const partyDungeonStore = createStore<{
  ticket: PartyRunTicket | null;
  ready: string[];
  phase: 'idle' | 'forming' | 'running';
  waiting: boolean;
}>(() => ({ ticket: null, ready: [], phase: 'idle', waiting: false }));

type Send = (to: string, packet: PartyDungeonPacket) => void;
let send: Send | null = null;
export function attachPartyDungeonTransport(transport: Send) {
  send = transport;
  return () => {
    cancelPartyDungeon();
    send = null;
  };
}
export function partyDungeonBlocker(dungeon: string): string | null {
  const s = gameStore.getState(),
    def = DUNGEONS[dungeon];
  if (!getAccountState().user || !socialStore.getState().connected)
    return 'Cần kết nối online và lập tổ đội.';
  if (!def?.tier || def.practice) return 'Hãy chọn phó bản thử luyện để đi tổ đội.';
  if (isChildhood(s.player) || s.status !== 'alive') return 'Cần nhập môn và hồi phục trước.';
  if (
    s.dungeon ||
    s.tribulation ||
    lifeProgress(s.player).retreat ||
    socialStore.getState().duel ||
    s.rewardPending
  )
    return 'Hãy hoàn thành hoạt động đang diễn ra trước.';
  if (!['dai_thua_vien', 'linh_son_tong'].includes(s.mapId))
    return 'Cả đội tập kết tại tông môn trước khi vào phó bản.';
  const check = canEnter(s.player.dungeons, dungeon, def, s.player.level, undefined, s.quests);
  return check.ok ? null : check.reason;
}

export function offerPartyDungeon(dungeon: string) {
  const me = getAccountState().user?.id,
    social = socialStore.getState();
  const reason = partyDungeonBlocker(dungeon);
  const warn = (text: string) => gameStore.getState().toast(text, 'warn');
  if (reason) return warn(reason);
  if (!send || !me || !social.partyId || social.partyLeaderId !== me)
    return warn('Đội trưởng cần lập đội rồi mời vào phó bản.');
  if (partyDungeonStore.getState().phase !== 'idle')
    return warn('Đang chuẩn bị một phó bản tổ đội.');
  const others = social.roster.filter((p) => p.party === social.partyId);
  if (others.length < 1 || others.length > 2)
    return warn('Phó bản hỗ trợ tổ đội 2–3 người online.');
  if (others.some((p) => !['dai_thua_vien', 'linh_son_tong'].includes(p.mapId)))
    return warn('Hãy nhờ đồng đội về tông môn tập kết.');
  const ticket: PartyRunTicket = {
    id: crypto.randomUUID(),
    party: social.partyId,
    leader: me,
    dungeon,
    expires: Date.now() + 45000,
    members: [
      { userId: me, name: gameStore.getState().player.name },
      ...others.map((p) => ({ userId: p.userId, name: p.name })),
    ],
  };
  partyDungeonStore.setState({ ticket, phase: 'forming', ready: [me] });
  gameStore.getState().setAuto(false);
  gameStore.getState().patch({ menu: null, dialogNpc: null });
  for (const p of others) send(p.userId, { kind: 'offer', ticket });
}

export function receivePartyDungeon(from: string, packet: PartyDungeonPacket) {
  const me = getAccountState().user?.id,
    social = socialStore.getState(),
    now = Date.now();
  const live = partyDungeonStore.getState();
  if (!me) return;
  if (packet.kind === 'offer') {
    const t = packet.ticket;
    if (
      live.phase !== 'idle' ||
      from !== t.leader ||
      social.partyLeaderId !== from ||
      t.party !== social.partyId ||
      t.expires <= now ||
      t.expires > now + 60000 ||
      !t.members.some((m) => m.userId === me) ||
      t.members.some(
        (m) =>
          m.userId !== me &&
          !social.roster.some((p) => p.userId === m.userId && p.party === t.party),
      )
    )
      return;
    const reason = partyDungeonBlocker(t.dungeon);
    if (reason) {
      send?.(from, { kind: 'cancel', id: t.id });
      gameStore.getState().toast(reason, 'info');
      return;
    }
    partyDungeonStore.setState({ ticket: t, phase: 'forming', ready: [from] });
    return;
  }
  const t = live.ticket;
  if (!t || packet.id !== t.id || !t.members.some((m) => m.userId === from)) return;
  if (packet.kind === 'cancel') {
    cancelPartyDungeon(false);
    if (me === t.leader)
      for (const member of t.members)
        if (member.userId !== me && member.userId !== from) send?.(member.userId, packet);
    return;
  }
  if (live.phase !== 'forming' || t.expires <= now || social.partyId !== t.party) return;
  if (packet.kind === 'ready' && me === t.leader) {
    partyDungeonStore.setState({ ready: [...new Set([...live.ready, from])] });
  }
  if (packet.kind === 'start' && from === t.leader && live.ready.includes(me)) launch(t);
}

export function readyPartyDungeon() {
  const live = partyDungeonStore.getState(),
    me = getAccountState().user?.id,
    t = live.ticket;
  if (!t || !me || live.phase !== 'forming' || t.expires <= Date.now()) return;
  const reason = partyDungeonBlocker(t.dungeon);
  if (reason) {
    gameStore.getState().toast(reason, 'warn');
    cancelPartyDungeon();
    return;
  }
  gameStore.getState().setAuto(false);
  gameStore.getState().patch({ menu: null, dialogNpc: null });
  partyDungeonStore.setState({ ready: [...new Set([...live.ready, me])] });
  send?.(t.leader, { kind: 'ready', id: t.id });
}
export function startPartyDungeon() {
  const live = partyDungeonStore.getState(),
    t = live.ticket,
    me = getAccountState().user?.id;
  if (
    !t ||
    me !== t.leader ||
    live.phase !== 'forming' ||
    t.expires <= Date.now() ||
    !t.members.every((m) => live.ready.includes(m.userId))
  )
    return;
  const reason = partyDungeonBlocker(t.dungeon);
  if (reason) {
    gameStore.getState().toast(reason, 'warn');
    cancelPartyDungeon();
    return;
  }
  for (const member of t.members)
    if (member.userId !== me) send?.(member.userId, { kind: 'start', id: t.id });
  launch(t);
}
function launch(ticket: PartyRunTicket) {
  if (partyDungeonBlocker(ticket.dungeon)) return cancelPartyDungeon();
  partyDungeonStore.setState({ phase: 'running', waiting: true });
  EventBus.emit('cmd:enterPartyDungeon', ticket);
}
export function cancelPartyDungeon(broadcast = true) {
  const live = partyDungeonStore.getState(),
    me = getAccountState().user?.id;
  if (broadcast && live.ticket)
    for (const member of live.ticket.members)
      if (member.userId !== me) send?.(member.userId, { kind: 'cancel', id: live.ticket.id });
  partyDungeonStore.setState({ ticket: null, ready: [], phase: 'idle', waiting: false });
  if (live.phase === 'running' && live.ticket)
    EventBus.emit('cmd:abortPartyDungeon', live.ticket.id);
}
export function completePartyDungeon() {
  partyDungeonStore.setState({ ticket: null, ready: [], phase: 'idle', waiting: false });
}
