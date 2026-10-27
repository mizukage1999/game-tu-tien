import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { DUNGEONS, ITEMS, MONSTERS, NPCS, QUESTS, SKILLS, ZONE_NAMES, type EquipSlot, type PracticeAction, type QuestRewards, type SkillId } from '../data';
import { canEnter, consumeAttempt, recordClear, type RunPhase } from '../game/systems/dungeon';
import { rollDungeonGear } from '../game/systems/loot';
import { checkUpgrade, effectiveSkill, skillLevel, SKILL_BONUS_LEVEL, type EffectiveSkill } from '../game/systems/skills';
import {
  addExp,
  applyBreakthrough,
  canEquip,
  checkBreakthrough,
  breakthroughPillCount,
  computeStats,
  expToNext,
  isBottleneck,
  realmNameAtLevel,
  type DerivedStats,
  playerStats,
} from '../game/systems/progression';
import {
  acceptQuest as acceptQuestPure,
  applyEvent,
  autoStartQuests,
  completeQuest,
  type GameEvent,
  type QuestLog,
} from '../game/systems/quest';
import { loadGame, saveGame, type PlayerSave, type Sex } from '../game/systems/save';
import type { LifeStatus } from '../game/systems/respawn';
import type { Vec2 } from '../game/types';
import { ADMISSION_QUEST, PROLOGUE_ORDER } from '../data/world';
import { isChildhood } from '../game/systems/origin';
import { breakthroughBlocker, tribulationPlan } from '../game/systems/cultivation';
import { heroFor, type HeroId } from '../data/heroes';
import { heroDefaultLoadout } from '../data/heroSkills';
import { advanceLife, lifeProgress, performLifeAction, type LifeAction } from '../game/systems/life';
import { startVillageChapter } from '../game/systems/storyStart';
import { adventureAction, beastVictory, sectEvent, type AdventureAction } from '../game/systems/adventure';
import { chooseSkill, skillUnlocked } from '../game/systems/skills';
import { premiumStore } from '../net/premium';
import { equipmentBaseId, equipmentInstanceId, findOwnedEquipment, isIndividualEquipment, normalizeEquipment } from '../game/systems/equipment';
import {
  GARDEN_COOLDOWN_MS, herbCooldownMs, HOME_MAX_LEVEL, HOME_QUEST,
  homeUpgradeCost, immortalProgress, mountUnlocked, RECIPES, recipeCheck,
  type HerbNode, type MountId,
} from '../game/systems/immortal';

export type LogChannel = 'system' | 'world' | 'combat' | 'near';
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
  monsters: (Vec2 & { boss?: boolean; level?: number; name?: string })[];
  npcs: Vec2[];
  loot: Vec2[];
}

export type MenuTab = 'character' | 'bag' | 'cultivate' | 'skills' | 'dungeon' | 'mail' | 'quests' | 'shop' | 'social' | 'settings' | 'journey' | 'sect' | 'premium' | 'map';

export interface DungeonHud {
  id: string;
  name: string;
  phase: RunPhase;
  wave: number;
  waves: number;
  timeLeft: number;
  remaining: number;
  boss: { name: string; hp: number; maxHp: number } | null;
}

export interface DungeonResult {
  id: string;
  success: boolean;
  elapsedMs: number;
  rewards: QuestRewards;
  firstClear: QuestRewards | null;
  /** Gear that actually rolled this clear. Empty when the low chance missed. */
  dropped: { item: string; qty: number }[];
}

export interface GameState {
  recordPractice(action: PracticeAction): void;
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
  craftFeedback: {id:string;ok:boolean;text:string} | null;
  dialogNpc: string | null;
  nearbyNpc: string | null;
  nearbyHerb: { id: string; name: string } | null;
  nearbyPoint: { id: string; name: string } | null;
  zone: { id: string; name: string; rate: number } | null;
  mapId: string;
  spawnPos: Vec2 | null;
  playerTile: Vec2;
  minimap: MinimapData;
  menu: MenuTab | null;
  journeySection: 'story'|'alchemy'|'home'|'mounts'|'world'|'companions';
  homeSection: 'field'|'chamber'|'furnace'|'artifact';
  dungeon: DungeonHud | null;
  dungeonResult: DungeonResult | null;
  /** Where to put the player back after leaving a dungeon. */
  dungeonReturn: { mapId: string; pos: Vec2 } | null;
  /** Other humans on this map right now (online builds only). */
  online: number;
  tribulation: {realm:number;strikes:number;remaining:number;id?:string}|null;

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
  unequip(slot: EquipSlot): void;
  questEvent(ev: GameEvent): void;
  acceptQuest(id: string): void;
  turnInQuest(id: string): void;
  tryBreakthrough(): void;
  craftPill(id: string, quantity?: number): void;
  harvestHerb(node: HerbNode, now?: number): boolean;
  upgradeHome(): void;
  harvestGarden(now?: number): void;
  selectMount(id: MountId | null): void;
  buy(npcId: string, index: number): void;
  upgradeSkill(id: SkillId): void;
  /** Validates and spends a daily attempt. Called by the world scene before entering. */
  beginDungeon(id: string): boolean;
  finishDungeon(id: string, success: boolean, elapsedMs: number): void;
  setMenu(menu: MenuTab | null): void;
  setDialog(npc: string | null): void;
  setAuto(on: boolean): void;
  patch(p: Partial<GameState>): void;
  tickGameTime(ms: number): void;
  lifeAction(action: LifeAction): void;
  salvageLegacy(id: string): void;
  adventureAction(action:AdventureAction):void;
  recordAdventure(event:string,qty?:number):void;
  beastVictory(type:string):void;
  chooseSkill(slot:number,id:SkillId):void;
  finishTribulation(success:boolean):void;
  syncPremium():void;
}

let uid = 1;
const MAX_LOGS = 80;

export function newPlayer(opts?: { name?: string; sex?: Sex }): PlayerSave {
  const stats = computeStats(1, 0, {});
  return {
    name: opts?.name ?? 'Tuyết Kỳ',
    sex: opts?.sex ?? 'female',
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

function initialQuests(childhood = false): QuestLog {
  let log: QuestLog = {};
  for (const id of childhood ? ['village_0'] : autoStartQuests(QUESTS).filter((id) => !id.startsWith('village_'))) log = acceptQuestPure(log, QUESTS, id, { level: 1 });
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

const previousSave = loadGame();
const save = previousSave ? startVillageChapter(previousSave) : null;
// Persist the one-time chapter entry before autosave or cloud sync starts.
if (save && save !== previousSave) saveGame(save);
const startPlayer: PlayerSave = save?.player ?? {
  ...newPlayer({ name: 'Vương Lâm', sex: 'male' }),
  origin: 'vuong_gia_thon', admitted: false, inventory: {},
  world: { interactions: {}, discovered: ['vuong_gia_thon'] },
};

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
        if (id === ADMISSION_QUEST && isChildhood(get().player)) {
          set({ player: { ...get().player, admitted: true, life:{...lifeProgress(get().player),days:Math.max(2160,lifeProgress(get().player).days)} } });
          get().addItem('moc_kiem',1);
          get().addItem('hat_thanh_linh',3);
          get().addItem('hat_linh_chi',1);
          get().addItem('hat_ngung_lo',1);
          get().acceptQuest('main_0');
          get().acceptQuest('side_2');
          get().addLog('Sáu năm rèn luyện trôi qua. Từ tuổi thơ Vương Gia Thôn, bạn đã trưởng thành và bắt đầu đời đệ tử.');
          get().toast('Sáu năm sau · Nhập môn, tiên lộ bắt đầu!', 'realm');
        }
        if (id.startsWith('village_') && isChildhood(get().player)) {
          const next = PROLOGUE_ORDER.find((nextId) => QUESTS[nextId].requires === id);
          if (next) get().acceptQuest(next);
        }
        for (const [nextId, next] of Object.entries(QUESTS))
          if (next.autoStart && next.requires === id) get().acceptQuest(nextId);
      } else if (q.status === 'ready' && def.turnIn) {
        get().toast(`${def.name}: hãy về gặp ${npcName(def.turnIn)}`, 'quest');
        get().addLog(`Nhiệm vụ [${def.name}] đã đủ điều kiện, về gặp ${npcName(def.turnIn)}.`);
      }
    }
  };

  return {
    player: startPlayer,
    stats: playerStats(startPlayer),
    status: 'alive',
    downedRemaining: 0,
    meditating: false,
    cooldowns: {},
    auto: false,
    target: null,
    quests: save?.quests ?? initialQuests(true),
    logs: [],
    toasts: [],
    craftFeedback: null,
    dialogNpc: null,
    nearbyNpc: null,
    nearbyHerb: null,
    nearbyPoint: null,
    zone: null,
    mapId: save?.mapId ?? 'vuong_gia_thon',
    spawnPos: save?.pos ?? null,
    playerTile: { x: 0, y: 0 },
    minimap: { player: { x: 0, y: 0 }, monsters: [], npcs: [], loot: [] },
    menu: null,
    journeySection: 'story',
    homeSection: 'field',
    dungeon: null,
    dungeonResult: null,
    dungeonReturn: null,
    online: 0,
    tribulation: null,

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
        const stats = playerStats(p);
        set({ stats, player: { ...p, hp: stats.maxHp, mp: stats.maxMp } });
        get().toast(`EXP tinh tiến: ${realmNameAtLevel(p.level)}`, 'levelup');
        get().addLog(`EXP đạt ${realmNameAtLevel(p.level)}!`);
        get().addLog('HP/MP đã được hồi đầy');
        get().questEvent({ type: 'level', level: p.level });
      }
      if (res.bottleneck && !wasCapped) {
        get().toast('EXP đã đạt bình cảnh, hãy mở Tu Luyện để đột phá!', 'warn');
      }
    },

    addItem(id, qty, opts = {}) {
      if (!Number.isFinite(qty) || qty <= 0) return;
      qty = Math.floor(qty);
      const p = get().player;
      if (id === 'linh_khi') {
        set({ player: { ...p, linhKhi: p.linhKhi + qty } });
      } else if (isIndividualEquipment(id, ITEMS)) {
        const next = normalizeEquipment(p, ITEMS), inventory = { ...next.inventory };
        for (let i = 0; i < qty; i++) {
          let key = equipmentInstanceId(id);
          while (inventory[key] || Object.values(next.equipment).includes(key)) key = equipmentInstanceId(id);
          inventory[key] = 1;
        }
        set({ player: { ...next, inventory } });
      } else {
        set({ player: { ...p, inventory: { ...p.inventory, [id]: (p.inventory[id] ?? 0) + qty } } });
      }
      if (!opts.silent) {
        get().addLog(
          ITEMS[id]?.kind === 'currency' ? `Nhận ${qty} ${itemName(id)}` : `Nhận được ${itemName(id)} x${qty}`,
        );
      }
      if (opts.fromPickup) get().questEvent({ type: 'collect', item: equipmentBaseId(id), qty });
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
      if (def.cultivation) {
        s.gainExp(def.cultivation.exp);
        s.addItem('linh_khi', def.cultivation.linhKhi);
      }
      const heal = def.heal ?? 0;
      s.restore(Math.round(s.stats.maxHp * heal), Math.round(s.stats.maxMp * heal));
      s.addLog(`Sử dụng ${def.name}`);
      if (id === 'hoi_xuan_dan') get().recordPractice('potion');
    },

    equip(id) {
      const def = ITEMS[id];
      const s = get();
      if (!def?.slot || !findOwnedEquipment(s.player, id)) return;
      if(id==='tien_phap_bao'&&!premiumStore.getState().items.includes(id))return s.toast('Tiên pháp bảo cần được xác thực trên tài khoản.','warn');
      const check = canEquip(id, s.player.level);
      if (!check.ok) {
        s.toast(check.reason, 'warn');
        return;
      }
      const p = normalizeEquipment(s.player, ITEMS), key = findOwnedEquipment(p, id);
      if (!key) return;
      const current = p.equipment[def.slot], inventory = { ...p.inventory };
      if (--inventory[key] <= 0) delete inventory[key];
      if (current) inventory[current] = (inventory[current] ?? 0) + 1;
      const player = { ...p, inventory, equipment: { ...p.equipment, [def.slot]: key } };
      const stats = playerStats(player);
      set({ player: { ...player, hp: Math.min(player.hp, stats.maxHp), mp: Math.min(player.mp, stats.maxMp) }, stats });
      s.addLog(`Trang bị ${def.name}`);
      if (def.slot === 'weapon') get().recordPractice('equip');
    },

    unequip(slot) {
      const p = normalizeEquipment(get().player, ITEMS);
      const id = p.equipment[slot];
      if (!id) return;
      const equipment = { ...p.equipment, [slot]: undefined };
      const player = { ...p, equipment, inventory: { ...p.inventory, [id]: (p.inventory[id] ?? 0) + 1 } };
      const stats = playerStats(player);
      set({ player: { ...player, hp: Math.min(player.hp, stats.maxHp), mp: Math.min(player.mp, stats.maxMp) }, stats });
    },

    questEvent(ev) {
      // Reconcile newly added story links for older saves on their next world event.
      for (const [id, def] of Object.entries(QUESTS))
        if (def.autoStart && def.requires && get().quests[def.requires]?.status === 'done' && !get().quests[id]) get().acceptQuest(id);
      const event=ev.type==='dungeonClear'?'dungeon':ev.type;
      get().recordAdventure(event,ev.type==='gather'?'qty' in ev?Number(ev.qty):1:1);
      const res = applyEvent(get().quests, QUESTS, ev);
      if (!res.changed) return;
      set({ quests: res.log });
      finishQuests(res.finished);
    },

    acceptQuest(id) {
      const def = QUESTS[id];
      if (!def) return;
      if (isChildhood(get().player) && !id.startsWith('village_')) return;
      if (!get().player.origin && id.startsWith('village_')) return;
      const before = get().quests;
      const player = get().player;
      const log = acceptQuestPure(before, QUESTS, id, { level: player.level, immortal: immortalProgress(player), mapId: get().mapId, interactions: player.world?.interactions, practice: player.practice, armed: !!player.equipment.weapon, clears: player.dungeons?.clears });
      if (log === before) return;
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
      if (s.status !== 'alive') return;
      if(s.tribulation)return s.toast('Thiên kiếp đang diễn ra.','warn');
      const blocked = breakthroughBlocker(s.player, s.mapId, s.status === 'alive');
      if (blocked) return s.toast(blocked, 'warn');
      const check = checkBreakthrough(s.player, s.player.linhKhi, s.player.inventory.linh_thach ?? 0);
      if (!check.ok) {
        s.toast(check.reason, 'warn');
        return;
      }
      const pills = breakthroughPillCount(s.player.realmIndex);
      if (!s.removeItems({ linh_khi: check.cost.linhKhi, linh_thach: check.cost.linhThach, pha_canh_dan: pills })) return;
      const plan = tribulationPlan(s.player.realmIndex);
      s.selectMount(null);
      set({tribulation:{realm:s.player.realmIndex,strikes:0,remaining:plan.durationMs,id:crypto.randomUUID()},auto:false,menu:null});
      s.toast(`Thiên kiếp giáng lâm! Né vùng sét và sống sót qua ${plan.waves} đợt.`, 'realm');
    },

    craftPill(id, quantity = 1) {
      const s = get();
      const reason = isChildhood(s.player) ? 'Đan đạo sẽ mở sau khi nhập môn.' :
        s.status !== 'alive' ? 'Cần hồi phục trước khi luyện đan.' : recipeCheck(s.player,id,quantity);
      if (reason) { set({craftFeedback:{id,ok:false,text:reason}}); return s.toast(reason,'warn'); }
      const recipe = RECIPES.find((r) => r.id === id)!;
      if (!s.removeItems(Object.fromEntries(Object.entries(recipe.cost).map(([key, amount]) => [key, amount * quantity])))) return;
      const p = get().player;
      const progress = immortalProgress(p);
      set({ player: { ...p, immortal: { ...progress, crafted: { ...progress.crafted, [id]: (progress.crafted[id] ?? 0) + quantity } } } });
      get().addItem(id, quantity);
      get().questEvent({ type: 'craft', item: id, qty: quantity });
      set({craftFeedback:{id,ok:true,text:`Luyện thành ${recipe.name} ×${quantity}. Đã cất vào túi đồ.`}});
      get().toast(`Luyện thành ${recipe.name}!`, 'quest');
    },

    harvestHerb(node, now = Date.now()) {
      const s = get();
      const progress = immortalProgress(s.player);
      if (s.status !== 'alive' || (progress.harvestReadyAt[node.id] ?? 0) > now) return false;
      const qty = node.item === 'thanh_linh_thao' ? 2 : 1;
      set({ player: { ...s.player, immortal: {
        ...progress,
        gathered: { ...progress.gathered, [node.item]: (progress.gathered[node.item] ?? 0) + qty },
        harvestReadyAt: { ...progress.harvestReadyAt, [node.id]: now + herbCooldownMs(node.item) },
      } } });
      get().addItem(node.item, qty, { fromPickup: true });
      get().questEvent({ type: 'gather', item: node.item, qty });
      get().toast(`Hái ${itemName(node.item)} ×${qty}`, 'info');
      return true;
    },

    upgradeHome() {
      const s = get();
      if (s.status !== 'alive' || s.quests[HOME_QUEST]?.status !== 'done') return;
      const progress = immortalProgress(s.player);
      if (progress.homeLevel >= HOME_MAX_LEVEL) return;
      if (!s.removeItems(homeUpgradeCost(progress.homeLevel))) return s.toast('Chưa đủ tài nguyên nâng động phủ.', 'warn');
      set({ player: { ...get().player, immortal: { ...progress, homeLevel: progress.homeLevel + 1 } } });
      s.toast(`Động phủ đạt cấp ${progress.homeLevel + 1}!`, 'levelup');
    },

    harvestGarden(now = Date.now()) {
      const s = get();
      if (s.status !== 'alive' || s.mapId !== 'dong_phu' || s.quests[HOME_QUEST]?.status !== 'done') return;
      const progress = immortalProgress(s.player);
      if (progress.gardenReadyAt > now) return s.toast('Dược điền đang sinh trưởng.', 'info');
      const qty = 2 + progress.homeLevel;
      set({ player: { ...s.player, immortal: { ...progress, gardenReadyAt: now + GARDEN_COOLDOWN_MS,
        gathered: { ...progress.gathered, thanh_linh_thao: (progress.gathered.thanh_linh_thao ?? 0) + qty, linh_chi: (progress.gathered.linh_chi ?? 0) + 1, ngung_lo: (progress.gathered.ngung_lo ?? 0) + 2 },
      } } });
      get().addItem('thanh_linh_thao', qty, { fromPickup: true });
      get().addItem('linh_chi', 1, { fromPickup: true });
      get().addItem('ngung_lo', 2, { fromPickup: true });
      get().questEvent({ type: 'gather', item: 'thanh_linh_thao', qty });
      get().questEvent({ type: 'gather', item: 'linh_chi', qty: 1 });
      get().questEvent({ type: 'gather', item: 'ngung_lo', qty: 2 });
      s.toast('Đã thu hoạch dược điền!', 'quest');
    },

    selectMount(id) {
      const s = get();
      if (isChildhood(s.player)) return;
      if (s.status !== 'alive') return;
      if (id && (s.dungeon || s.tribulation || lifeProgress(s.player).retreat)) return s.toast('Chưa thể ngự hành lúc này.','warn');
      if (id && !mountUnlocked(id, s.quests,s.player)) return s.toast('Đạt Trúc Cơ hoặc hoàn thành tiên duyên để mở khóa.', 'warn');
      set({ player: { ...s.player, immortal: { ...immortalProgress(s.player), mount: id } } });
      if (id) get().questEvent({ type: 'mount', mount: id });
      s.toast(id === 'sword' ? s.player.realmIndex>=6?'Đạp không phi hành':'Ngự kiếm Thanh Vân' : id === 'crane' ? 'Bạch Vân Hạc đã nhận lệnh' : 'Đã hạ xuống');
    },

    buy(npcId, index) {
      const offer = NPCS[npcId]?.shop?.[index];
      if (!offer) return;
      if (!get().removeItems(offer.price)) {
        get().toast('Không đủ tài nguyên.', 'warn');
        return;
      }
      get().addItem(offer.item, offer.qty);
      get().toast(`Đã mua ${itemName(offer.item)}`);
    },

    upgradeSkill(id) {
      const s = get();
      if(!skillUnlocked(s.player,id))return s.toast('Kỹ năng chưa được lĩnh ngộ.','warn');
      const p = s.player;
      const level = skillLevel(p.skills, id);
      const check = checkUpgrade(level, p.level, {
        linhKhi: p.linhKhi,
        linhThach: p.inventory.linh_thach ?? 0,
        kiemPho: p.inventory.kiem_pho ?? 0,
      });
      if (!check.ok) {
        s.toast(check.reason, 'warn');
        return;
      }
      const { cost } = check;
      s.removeItems({ linh_khi: cost.linhKhi, linh_thach: cost.linhThach, ...(cost.kiemPho ? { kiem_pho: cost.kiemPho } : {}) });
      const next = level + 1;
      const after = get().player;
      set({ player: { ...after, skills: { ...after.skills, [id]: next } } });
      const name = SKILLS[id].name;
      s.toast(next === SKILL_BONUS_LEVEL ? `${name} cấp ${next}: lĩnh ngộ tuyệt kỹ!` : `${name} đạt cấp ${next}`, 'levelup');
      s.addLog(`Nâng cấp ${name} lên cấp ${next}`);
      s.questEvent({ type: 'skillUpgrade', skill: id });
    },

    beginDungeon(id) {
      const s = get();
      const def = DUNGEONS[id];
      if (!def) return false;
      if (s.dungeon) {
        s.toast('Bạn đang ở trong phó bản.', 'warn');
        return false;
      }
      if (s.status !== 'alive' || isChildhood(s.player) || s.tribulation || lifeProgress(s.player).retreat) return false;
      const check = canEnter(s.player.dungeons, id, def, s.player.level, undefined, s.quests);
      if (!check.ok) {
        s.toast(check.reason, 'warn');
        return false;
      }
      set({
        player: { ...s.player, dungeons: consumeAttempt(s.player.dungeons, id) },
        menu: null,
        dialogNpc: null,
        dungeonResult: null,
      });
      s.addLog(`Tiến vào phó bản ${def.name}`);
      return true;
    },

    finishDungeon(id, success, elapsedMs) {
      const def = DUNGEONS[id];
      if (!def) return;
      const s = get();
      if (!success) {
        set({ dungeonResult: { id, success, elapsedMs, rewards: {}, firstClear: null, dropped: [] } });
        s.toast(`Khiêu chiến ${def.name} thất bại!`, 'warn');
        s.addLog(`Hết thời gian, khiêu chiến ${def.name} thất bại.`);
        return;
      }
      const { record, first } = recordClear(s.player.dungeons, id);
      set({ player: { ...s.player, dungeons: record } });
      grantRewards(def.rewards);
      if (first) grantRewards(def.firstClear);
      const dropped = rollDungeonGear(def.drops ?? []);
      for (const d of dropped) get().addItem(d.item, d.qty);
      if (dropped.length) get().toast(`Rơi được ${dropped.map((d) => itemName(d.item)).join(', ')}`, 'quest');
      set({ dungeonResult: { id, success, elapsedMs, rewards: def.rewards, firstClear: first ? def.firstClear : null, dropped } });
      s.toast(`Vượt ải ${def.name}!`, 'realm');
      s.addLog(`Đạo hữu ${s.player.name} vừa vượt ải ${def.name}!`, 'world');
      s.questEvent({ type: 'dungeonClear', dungeon: id });
    },

    setMenu(menu) {
      set({ menu, ...(menu === 'journey' ? {journeySection:'story' as const} : {}) });
    },
    setDialog(dialogNpc) {
      set({ dialogNpc });
    },
    setAuto(auto) {
      if (auto && isChildhood(get().player)) return;
      set({ auto });
      get().addLog(auto ? 'Bật tự động chiến đấu' : 'Tắt tự động chiến đấu');
    },
    patch(p) {
      set(p);
    },
    tickGameTime(ms) {
      const s=get();
      set({player:advanceLife(s.player,ms)});
    },
    lifeAction(action) {
      const s=get();
      const feedbackId = action.type==='forge'?action.recipe:action.type==='learn'?action.formula:null;
      if (s.mapId === 'dong_phu' && s.quests[HOME_QUEST]?.status !== 'done') {
        if(feedbackId)set({craftFeedback:{id:feedbackId,ok:false,text:'Chưa nhận động phủ riêng.'}});
        return s.toast('Chưa nhận động phủ riêng.','warn');
      }
      const result=performLifeAction(s.player,action,s.mapId==='dong_phu',s.status==='alive');
      if(!result.ok){if(feedbackId)set({craftFeedback:{id:feedbackId,ok:false,text:result.reason}});return s.toast(result.reason,'warn');}
      if(feedbackId)set({craftFeedback:{id:feedbackId,ok:true,text:result.message}});
      const nextPlayer=normalizeEquipment(result.player,ITEMS),stats=playerStats(nextPlayer);
      set({player:{...nextPlayer,hp:Math.min(nextPlayer.hp,stats.maxHp),mp:Math.min(nextPlayer.mp,stats.maxMp)},stats,...(action.type==='retreat'?{auto:false}: {})});
      if(result.exp)get().gainExp(result.exp);
      get().toast(result.message,'quest');
      get().addLog(result.message);
      const fresh=get();saveGame({player:fresh.player,quests:fresh.quests,mapId:fresh.mapId,pos:fresh.spawnPos});
      if(action.type==='harvest')get().recordAdventure('gather');
      if(action.type==='forge')get().recordAdventure('craft');
    },
    salvageLegacy(id) {
      const s=get(), def=ITEMS[id];
      if(def?.slot==='weapon'||!def?.slot||!s.removeItems({[id]:1}))return;
      get().addItem('huyen_thiet',2);
      s.toast('Đã phân giải thành 2 Huyền Thiết.');
    },
    adventureAction(action){
      const s=get();if(s.status!=='alive'||s.tribulation)return;
      if(action.type==='bindSect'&&action.id!==s.mapId)return s.toast('Hãy tới đúng tông môn để ghi danh.','warn');
      const result=adventureAction(s.player,action,['dai_thua_vien','linh_son_tong'].includes(s.mapId));
      if(!result.ok)return s.toast(result.reason,'warn');
      set({player:result.player,stats:playerStats(result.player)});if(result.exp)get().gainExp(result.exp);
      s.toast(result.message,result.enhanced===false?'warn':'quest');const fresh=get();saveGame({player:fresh.player,quests:fresh.quests,mapId:fresh.mapId,pos:fresh.spawnPos});
    },
    recordAdventure(event,qty=1){const p=get().player,next=sectEvent(p,event,qty);if(next!==p)set({player:next});},
    beastVictory(type){set({player:beastVictory(get().player,type)});},
    chooseSkill(slot,id){const p=chooseSkill(get().player,slot,id);if(!p)return get().toast('Kỹ năng chưa mở hoặc ô không hợp lệ.','warn');set({player:p});get().recordPractice('loadout');const s=get();saveGame({player:s.player,quests:s.quests,mapId:s.mapId,pos:s.minimap.player.x>0?s.minimap.player:s.spawnPos});},
    recordPractice(action) {
      const s = get();
      if (s.status !== 'alive' || isChildhood(s.player) || (s.auto && ['basic', 'skill', 'dash'].includes(action))) return;
      const practice = { ...s.player.practice, [action]: Math.min(999, (s.player.practice?.[action] ?? 0) + 1) };
      set({ player: { ...s.player, practice } });
      get().questEvent({ type: 'practice', action });
    },
    finishTribulation(success){
      const s=get(),trial=s.tribulation;if(!trial)return;
      if(success&&(trial.remaining>0||trial.strikes<tribulationPlan(trial.realm).waves))return;
      set({tribulation:null});
      if(!success)return s.toast('Độ kiếp thất bại. Hãy chuẩn bị lại đan dược và trang bị.','warn');
      if(s.player.realmIndex!==trial.realm||s.status!=='alive')return;
      const p={...s.player};applyBreakthrough(p);const stats=playerStats(p);set({player:{...p,hp:stats.maxHp,mp:stats.maxMp},stats});
      s.addItem('thien_loi_tinh',1);s.toast(`Vượt thiên kiếp: ${realmNameAtLevel(p.level)}!`,'realm');s.questEvent({type:'level',level:p.level});
    },
    syncPremium(){
      const s=get(),owned=premiumStore.getState().items.includes('tien_phap_bao'),p=s.player,inventory={...p.inventory},equipment={...p.equipment};
      if(owned){if(!Object.values(equipment).includes('tien_phap_bao'))inventory.tien_phap_bao=1;}
      else {delete inventory.tien_phap_bao;for(const slot of Object.keys(equipment) as EquipSlot[])if(equipment[slot]==='tien_phap_bao')delete equipment[slot];}
      const next={...p,inventory,equipment};set({player:next,stats:playerStats(next)});
    },
  };
});

/** Writes the first save and replaces the placeholder hero. Call this before the world boots. */
export function createCharacter(name: string, sex: Sex, heroId?: HeroId) {
  const player: PlayerSave = { ...newPlayer({ name, sex: heroId ? heroFor({ heroId }).sex : sex }), ...(heroId ? { heroId, skillLoadout: heroDefaultLoadout(heroId) } : {}), origin: 'vuong_gia_thon', admitted: false, inventory: {}, world: { interactions: {}, discovered: ['vuong_gia_thon'] } };
  const quests = initialQuests(true);
  saveGame({ player, quests, mapId: 'vuong_gia_thon', pos: null });
  gameStore.setState({
    player,
    stats: playerStats(player),
    quests,
    mapId: 'vuong_gia_thon',
    spawnPos: null,
    logs: [],
    toasts: [],
    craftFeedback: null,
    dialogNpc: null,
    menu: null,
    status: 'alive',
  });
}

/** The skill as the player currently has it, with level growth applied. */
export function playerSkill(id: SkillId): EffectiveSkill {
  return effectiveSkill(id, skillLevel(gameStore.getState().player.skills, id));
}

export function useGame<T>(selector: (s: GameState) => T): T {
  return useStore(gameStore, selector);
}
