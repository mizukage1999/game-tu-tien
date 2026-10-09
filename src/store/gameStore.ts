import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { ITEMS, MONSTERS, NPCS, QUESTS, ZONE_NAMES, type QuestRewards, type SkillId } from '../data';
import {
  addExp,
  applyBreakthrough,
  checkBreakthrough,
  computeStats,
  expToNext,
  isBottleneck,
  realmFor,
  type DerivedStats,
} from '../game/systems/progression';
import {
  acceptQuest as acceptQuestPure,
  applyEvent,
  autoStartQuests,
  completeQuest,
  type GameEvent,
  type QuestLog,
} from '../game/systems/quest';
import { loadGame, type PlayerSave } from '../game/systems/save';
import type { LifeStatus } from '../game/systems/respawn';
import type { Vec2 } from '../game/types';

export type LogChannel = 'system' | 'world' | 'combat';
export interface LogEntry {
  id: number;
  channel: LogChannel;
  text: string;
}

export type ToastKind = 'info' | 'levelup' | 'quest' | 'warn' | 'realm';
export interface Toast {
  id: number;
  text: string;
  kind: ToastKind;
}

export interface TargetInfo {
  name: string;
  level: number;
  hp: number;
  maxHp: number;
}

export interface MinimapData {
  player: Vec2;
  monsters: Vec2[];
  npcs: Vec2[];
  loot: Vec2[];
}

export type MenuTab = 'character' | 'bag' | 'cultivate' | 'skills' | 'quests' | 'shop' | 'settings';

export interface GameState {
  player: PlayerSave;
  stats: DerivedStats;
  status: LifeStatus;
  downedRemaining: number;
  meditating: boolean;
  cooldowns: Partial<Record<SkillId, number>>;
  auto: boolean;
  target: TargetInfo | null;
  quests: QuestLog;
  logs: LogEntry[];
  toasts: Toast[];
  dialogNpc: string | null;
  nearbyNpc: string | null;
  zone: { id: string; name: string; rate: number } | null;
  mapId: string;
  spawnPos: Vec2 | null;
  playerTile: Vec2;
  minimap: MinimapData;
  menu: MenuTab | null;

  addLog(text: string, channel?: LogChannel): void;
  toast(text: string, kind?: ToastKind): void;
  dismissToast(id: number): void;
  gainExp(amount: number, opts?: { silent?: boolean }): void;
  addItem(id: string, qty: number, opts?: { silent?: boolean; fromPickup?: boolean }): void;
  removeItems(cost: Record<string, number>): boolean;
  damagePlayer(amount: number): number;
  restore(hp: number, mp: number): void;
  spendMp(amount: number): boolean;
  consumeItem(id: string): void;
  equip(id: string): void;
  unequip(slot: 'ring'): void;
  questEvent(ev: GameEvent): void;
  acceptQuest(id: string): void;
  turnInQuest(id: string): void;
  tryBreakthrough(): void;
  buy(npcId: string, index: number): void;
  setMenu(menu: MenuTab | null): void;
  setDialog(npc: string | null): void;
  setAuto(on: boolean): void;
  patch(p: Partial<GameState>): void;
}

let uid = 1;
const MAX_LOGS = 80;

export function newPlayer(): PlayerSave {
  const stats = computeStats(1, 0, {});
  return {
    name: 'Tuyết Kỳ',
    level: 1,
    exp: 0,
    realmIndex: 0,
    hp: stats.maxHp,
    mp: stats.maxMp,
    linhKhi: 0,
    inventory: { hoi_xuan_dan: 3 },
    equipment: {},
  };
}

function initialQuests(): QuestLog {
  let log: QuestLog = {};
  for (const id of autoStartQuests(QUESTS)) log = acceptQuestPure(log, QUESTS, id, { level: 1 });
  return log;
}

export function itemName(id: string) {
  return ITEMS[id]?.name ?? id;
}

export function npcName(id: string) {
  const n = NPCS[id];
  return n ? `${n.name} ${n.title}` : id;
}

export const questNames = {
  monster: (id: string) => MONSTERS[id]?.name ?? id,
  item: itemName,
  npc: npcName,
  zone: (id: string) => ZONE_NAMES[id] ?? id,
};

const save = loadGame();
const startPlayer = save?.player ?? newPlayer();

export const gameStore = createStore<GameState>()((set, get) => {
  const grantRewards = (rewards: QuestRewards) => {
    const s = get();
    if (rewards.linhKhi) s.addItem('linh_khi', rewards.linhKhi);
    for (const [id, qty] of Object.entries(rewards.items ?? {})) s.addItem(id, qty);
    if (rewards.exp) s.gainExp(rewards.exp);
  };

  const finishQuests = (ids: string[]) => {
    for (const id of ids) {
      const def = QUESTS[id];
      const q = get().quests[id];
      if (!def || !q) continue;
      if (q.status === 'done') {
        get().toast(`Hoàn thành: ${def.name}`, 'quest');
        get().addLog(`Hoàn thành nhiệm vụ [${def.name}]`);
        grantRewards(def.rewards);
      } else if (q.status === 'ready' && def.turnIn) {
        get().toast(`${def.name}: hãy về gặp ${npcName(def.turnIn)}`, 'quest');
        get().addLog(`Nhiệm vụ [${def.name}] đã đủ điều kiện, về gặp ${npcName(def.turnIn)}.`);
      }
    }
  };

  return {
    player: startPlayer,
    stats: computeStats(startPlayer.level, startPlayer.realmIndex, startPlayer.equipment),
    status: 'alive',
    downedRemaining: 0,
    meditating: false,
    cooldowns: {},
    auto: false,
    target: null,
    quests: save?.quests ?? initialQuests(),
    logs: [],
    toasts: [],
    dialogNpc: null,
    nearbyNpc: null,
    zone: null,
    mapId: save?.mapId ?? 'dai_thua_vien',
    spawnPos: save?.pos ?? null,
    playerTile: { x: 0, y: 0 },
    minimap: { player: { x: 0, y: 0 }, monsters: [], npcs: [], loot: [] },
    menu: null,

    addLog(text, channel = 'system') {
      set((s) => ({ logs: [...s.logs.slice(-(MAX_LOGS - 1)), { id: uid++, channel, text }] }));
    },

    toast(text, kind = 'info') {
      set((s) => ({ toasts: [...s.toasts.slice(-3), { id: uid++, text, kind }] }));
    },

    dismissToast(id) {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    },

    gainExp(amount, opts = {}) {
      const p = { ...get().player };
      const wasCapped = isBottleneck(p) && p.exp >= expToNext(p.level);
      const res = addExp(p, amount);
      set({ player: p });
      if (!opts.silent) get().addLog(`Nhận ${Math.round(amount)} EXP`);
      if (res.levelsGained > 0) {
        const stats = computeStats(p.level, p.realmIndex, p.equipment);
        set({ stats, player: { ...p, hp: stats.maxHp, mp: stats.maxMp } });
        get().toast(`Thăng cấp ${p.level}!`, 'levelup');
        get().addLog(`Đạt cấp ${p.level}!`);
        get().addLog('HP/MP đã được hồi đầy');
        get().questEvent({ type: 'level', level: p.level });
      }
      if (res.bottleneck && !wasCapped) {
        get().toast('Tu vi đã đạt bình cảnh, hãy mở Tu Luyện để đột phá!', 'warn');
      }
    },

    addItem(id, qty, opts = {}) {
      if (qty <= 0) return;
      const p = get().player;
      if (id === 'linh_khi') {
        set({ player: { ...p, linhKhi: p.linhKhi + qty } });
      } else {
        set({ player: { ...p, inventory: { ...p.inventory, [id]: (p.inventory[id] ?? 0) + qty } } });
      }
      if (!opts.silent) {
        get().addLog(
          ITEMS[id]?.kind === 'currency' ? `Nhận ${qty} ${itemName(id)}` : `Nhận được ${itemName(id)} x${qty}`,
        );
      }
      if (opts.fromPickup) get().questEvent({ type: 'collect', item: id, qty });
    },

    removeItems(cost) {
      const p = get().player;
      for (const [id, qty] of Object.entries(cost)) {
        const have = id === 'linh_khi' ? p.linhKhi : (p.inventory[id] ?? 0);
        if (have < qty) return false;
      }
      const inventory = { ...p.inventory };
      let linhKhi = p.linhKhi;
      for (const [id, qty] of Object.entries(cost)) {
        if (id === 'linh_khi') linhKhi -= qty;
        else {
          inventory[id] -= qty;
          if (inventory[id] <= 0) delete inventory[id];
        }
      }
      set({ player: { ...p, inventory, linhKhi } });
      return true;
    },

    damagePlayer(amount) {
      const p = get().player;
      const hp = Math.max(0, p.hp - amount);
      set({ player: { ...p, hp } });
      return hp;
    },

    restore(hp, mp) {
      const { player: p, stats } = get();
      set({
        player: {
          ...p,
          hp: Math.min(stats.maxHp, Math.max(0, p.hp + hp)),
          mp: Math.min(stats.maxMp, Math.max(0, p.mp + mp)),
        },
      });
    },

    spendMp(amount) {
      const p = get().player;
      if (p.mp < amount) return false;
      set({ player: { ...p, mp: p.mp - amount } });
      return true;
    },

    consumeItem(id) {
      const def = ITEMS[id];
      const s = get();
      if (!def || (s.player.inventory[id] ?? 0) <= 0) return;
      if (def.kind === 'equipment') return s.equip(id);
      if (def.kind !== 'consumable') return;
      if (s.status !== 'alive') return;
      s.removeItems({ [id]: 1 });
      const heal = def.heal ?? 0;
      s.restore(Math.round(s.stats.maxHp * heal), Math.round(s.stats.maxMp * heal));
      s.addLog(`Sử dụng ${def.name}`);
    },

    equip(id) {
      const def = ITEMS[id];
      const s = get();
      if (!def?.slot || (s.player.inventory[id] ?? 0) <= 0) return;
      const current = s.player.equipment[def.slot];
      s.removeItems({ [id]: 1 });
      if (current) s.addItem(current, 1, { silent: true });
      const p = get().player;
      const equipment = { ...p.equipment, [def.slot]: id };
      set({ player: { ...p, equipment }, stats: computeStats(p.level, p.realmIndex, equipment) });
      s.addLog(`Trang bị ${def.name}`);
    },

    unequip(slot) {
      const p = get().player;
      const id = p.equipment[slot];
      if (!id) return;
      const equipment = { ...p.equipment, [slot]: undefined };
      set({ player: { ...p, equipment }, stats: computeStats(p.level, p.realmIndex, equipment) });
      get().addItem(id, 1, { silent: true });
    },

    questEvent(ev) {
      const res = applyEvent(get().quests, QUESTS, ev);
      if (!res.changed) return;
      set({ quests: res.log });
      finishQuests(res.finished);
    },

    acceptQuest(id) {
      const def = QUESTS[id];
      if (!def) return;
      const log = acceptQuestPure(get().quests, QUESTS, id, { level: get().player.level });
      set({ quests: log });
      get().toast(`Nhận nhiệm vụ: ${def.name}`, 'quest');
      get().addLog(`Nhận nhiệm vụ [${def.name}]`);
      if (log[id]?.status !== 'active') finishQuests([id]);
    },

    turnInQuest(id) {
      const def = QUESTS[id];
      if (!def) return;
      const log = completeQuest(get().quests, id);
      if (log === get().quests) return;
      set({ quests: log });
      finishQuests([id]);
    },

    tryBreakthrough() {
      const s = get();
      const check = checkBreakthrough(s.player, s.player.linhKhi, s.player.inventory.linh_thach ?? 0);
      if (!check.ok) {
        s.toast(check.reason, 'warn');
        return;
      }
      s.removeItems({ linh_khi: check.cost.linhKhi, linh_thach: check.cost.linhThach });
      const p = { ...get().player };
      applyBreakthrough(p);
      const stats = computeStats(p.level, p.realmIndex, p.equipment);
      set({ player: { ...p, hp: stats.maxHp, mp: stats.maxMp }, stats });
      const realm = realmFor(p.realmIndex).name;
      s.toast(`Đột phá thành công: ${realm}!`, 'realm');
      s.addLog(`Đột phá cảnh giới ${realm}, đạt cấp ${p.level}!`);
      s.addLog(`Đạo hữu ${p.name} vừa đột phá ${realm}!`, 'world');
      s.questEvent({ type: 'level', level: p.level });
    },

    buy(npcId, index) {
      const offer = NPCS[npcId]?.shop?.[index];
      if (!offer) return;
      if (!get().removeItems(offer.price)) {
        get().toast('Không đủ tài nguyên.', 'warn');
        return;
      }
      get().addItem(offer.item, offer.qty);
    },

    setMenu(menu) {
      set({ menu });
    },
    setDialog(dialogNpc) {
      set({ dialogNpc });
    },
    setAuto(auto) {
      set({ auto });
      get().addLog(auto ? 'Bật tự động chiến đấu' : 'Tắt tự động chiến đấu');
    },
    patch(p) {
      set(p);
    },
  };
});

export function useGame<T>(selector: (s: GameState) => T): T {
  return useStore(gameStore, selector);
}
