import { REALMS } from '../../data';

export const REALM_COLORS = [
  '#dad7f8',
  '#65e6af',
  '#63baff',
  '#d887ff',
  '#ffd16e',
  '#ff9b50',
  '#ff6380',
  '#c66aff',
  '#70bdff',
  '#62e6df',
  '#ff7bda',
  '#bc79ff',
] as const;
export const REALM_PHASES = ['Sơ Kỳ', 'Trung Kỳ', 'Hậu Kỳ', 'Đại Viên Mãn'] as const;
export interface RealmStyle {
  index: number;
  name: string;
  phase: string;
  phaseIndex: number;
  color: string;
}
export interface RealmIdentity {
  level?: number;
  realm?: string;
  child?: boolean;
}
const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase();
/** Presentation only: level, EXP, realm gates and combat strength are unchanged. */
export function realmStyle(identity: RealmIdentity): RealmStyle {
  if (identity.child || normalize(identity.realm ?? '') === 'pham nhan')
    return { index: -1, name: 'Phàm Nhân', phase: '', phaseIndex: 0, color: '#ded4b5' };
  const text = normalize(identity.realm ?? '').replace('ket dan', 'kim dan');
  const named = REALMS.findIndex((r) => text.startsWith(normalize(r.name)));
  const level =
    Number.isFinite(identity.level) && identity.level! > 0 ? identity.level! : undefined;
  const fromLevel = level === undefined ? -1 : REALMS.findIndex((r) => level <= r.maxLevel);
  const index =
    named >= 0 ? named : level === undefined ? -1 : fromLevel < 0 ? REALMS.length - 1 : fromLevel;
  if (index < 0)
    return {
      index: -1,
      name: identity.realm?.slice(0, 30) || 'Chưa rõ',
      phase: '',
      phaseIndex: 0,
      color: '#c0ccda',
    };
  const offset =
    level === undefined ? 0 : Math.max(0, Math.min(9, Math.floor(level) - REALMS[index].minLevel));
  const namedPhase = text.includes('dai vien man')
    ? 3
    : text.includes('hau ky')
      ? 2
      : text.includes('trung ky')
        ? 1
        : text.includes('so ky')
          ? 0
          : -1;
  const phaseIndex = (
    namedPhase >= 0 ? namedPhase : offset === 9 ? 3 : offset >= 6 ? 2 : offset >= 3 ? 1 : 0
  ) as 0 | 1 | 2 | 3;
  return {
    index,
    name: REALMS[index].name,
    phase: REALM_PHASES[phaseIndex],
    phaseIndex,
    color: REALM_COLORS[index],
  };
}
