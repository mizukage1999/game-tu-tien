import type { Objective, QuestDef } from '../../data';

export type QuestStatus = 'active' | 'ready' | 'done';

export interface QuestProgress {
  status: QuestStatus;
  progress: number[];
}

export type QuestLog = Record<string, QuestProgress>;

export type GameEvent =
  | { type: 'kill'; target: string }
  | { type: 'collect'; item: string; qty: number }
  | { type: 'talk'; npc: string }
  | { type: 'level'; level: number }
  | { type: 'enterZone'; zone: string }
  | { type: 'meditate'; zone: string | null; seconds: number };

export interface QuestContext {
  level: number;
}

function initialProgress(obj: Objective, ctx: QuestContext): number {
  return obj.type === 'reachLevel' ? Math.min(obj.count, ctx.level) : 0;
}

function allDone(def: QuestDef, progress: number[]): boolean {
  return def.objectives.every((o, i) => progress[i] >= o.count);
}

function finishState(def: QuestDef): QuestStatus {
  return def.turnIn ? 'ready' : 'done';
}

export function acceptQuest(
  log: QuestLog,
  defs: Record<string, QuestDef>,
  id: string,
  ctx: QuestContext,
): QuestLog {
  const def = defs[id];
  if (!def || log[id]) return log;
  const progress = def.objectives.map((o) => initialProgress(o, ctx));
  const status: QuestStatus = allDone(def, progress) ? finishState(def) : 'active';
  return { ...log, [id]: { status, progress } };
}

function objectiveGain(obj: Objective, ev: GameEvent): number | 'set' | 0 {
  switch (obj.type) {
    case 'kill':
      return ev.type === 'kill' && ev.target === obj.target ? 1 : 0;
    case 'collect':
      return ev.type === 'collect' && ev.item === obj.item ? ev.qty : 0;
    case 'talk':
      return ev.type === 'talk' && ev.npc === obj.npc ? 1 : 0;
    case 'enterZone':
      return ev.type === 'enterZone' && ev.zone === obj.zone ? 1 : 0;
    case 'meditate':
      return ev.type === 'meditate' && ev.zone === obj.zone ? ev.seconds : 0;
    case 'reachLevel':
      return ev.type === 'level' ? 'set' : 0;
  }
}

export interface EventResult {
  log: QuestLog;
  /** Quests that reached 'ready' or 'done' because of this event. */
  finished: string[];
  changed: boolean;
}

export function applyEvent(
  log: QuestLog,
  defs: Record<string, QuestDef>,
  ev: GameEvent,
): EventResult {
  let next = log;
  const finished: string[] = [];
  for (const [id, q] of Object.entries(log)) {
    if (q.status !== 'active') continue;
    const def = defs[id];
    if (!def) continue;
    let touched = false;
    const progress = def.objectives.map((obj, i) => {
      const gain = objectiveGain(obj, ev);
      const cur = q.progress[i] ?? 0;
      if (gain === 'set' && ev.type === 'level') {
        const v = Math.min(obj.count, ev.level);
        if (v !== cur) touched = true;
        return v;
      }
      if (typeof gain === 'number' && gain > 0 && cur < obj.count) {
        touched = true;
        return Math.min(obj.count, cur + gain);
      }
      return cur;
    });
    if (!touched) continue;
    const status = allDone(def, progress) ? finishState(def) : 'active';
    if (status !== 'active') finished.push(id);
    next = { ...next, [id]: { status, progress } };
  }
  return { log: next, finished, changed: next !== log };
}

export function completeQuest(log: QuestLog, id: string): QuestLog {
  const q = log[id];
  if (!q || q.status !== 'ready') return log;
  return { ...log, [id]: { ...q, status: 'done' } };
}

export function availableQuests(
  log: QuestLog,
  defs: Record<string, QuestDef>,
  npc: string,
): string[] {
  return Object.entries(defs)
    .filter(([id, d]) => d.giver === npc && !log[id] && (!d.requires || log[d.requires]?.status === 'done'))
    .map(([id]) => id);
}

export function turnInQuests(log: QuestLog, defs: Record<string, QuestDef>, npc: string): string[] {
  return Object.entries(log)
    .filter(([id, q]) => q.status === 'ready' && defs[id]?.turnIn === npc)
    .map(([id]) => id);
}

export function autoStartQuests(defs: Record<string, QuestDef>): string[] {
  return Object.entries(defs)
    .filter(([, d]) => d.autoStart)
    .map(([id]) => id);
}

export function objectiveText(
  obj: Objective,
  names: { monster: (id: string) => string; item: (id: string) => string; npc: (id: string) => string; zone: (id: string) => string },
): string {
  switch (obj.type) {
    case 'kill':
      return `Đánh bại ${names.monster(obj.target)}`;
    case 'collect':
      return `Thu thập ${names.item(obj.item)}`;
    case 'talk':
      return `Trò chuyện với ${names.npc(obj.npc)}`;
    case 'reachLevel':
      return `Đạt cấp ${obj.count}`;
    case 'enterZone':
      return `Đến ${names.zone(obj.zone)}`;
    case 'meditate':
      return `Tọa thiền tại ${names.zone(obj.zone)} (giây)`;
  }
}
