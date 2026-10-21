import type { PlayerSave } from '../systems/save';
import type { DerivedStats } from '../systems/progression';

export interface Duelist {
  userId: string;
  name: string;
  level: number;
  realm: string;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  critRate: number;
  critMul: number;
  speed: number;
}

export function buildDuelist(player: PlayerSave, stats: DerivedStats, realm: string, userId: string): Duelist {
  return {
    userId,
    name: player.name,
    level: player.level,
    realm,
    hp: stats.maxHp,
    maxHp: stats.maxHp,
    atk: stats.atk,
    def: stats.def,
    critRate: stats.critRate,
    critMul: stats.critMul,
    speed: stats.speed,
  };
}

export interface DuelRound {
  attackerId: string;
  targetId: string;
  damage: number;
  crit: boolean;
  hp: Record<string, number>;
}

export interface DuelResult {
  winnerId: string;
  turns: number;
  hp: Record<string, number>;
  maxHp: Record<string, number>;
  rounds: DuelRound[];
  reason: string;
}

export function simulateDuel(a: Duelist, b: Duelist, seed: string): DuelResult {
  let aHp = a.hp;
  let bHp = b.hp;
  const maxHp: Record<string, number> = { [a.userId]: a.maxHp, [b.userId]: b.maxHp };
  const hp: Record<string, number> = { [a.userId]: aHp, [b.userId]: bHp };
  const rounds: DuelRound[] = [];
  let turns = 0;
  const maxTurns = 20;
  let rng = hashCode(seed);
  const next = () => ((rng = (rng * 1103515245 + 12345) & 0x7fffffff) >>> 0);

  while (aHp > 0 && bHp > 0 && turns < maxTurns) {
    turns++;
    const attacker = turns % 2 === 1 ? a : b;
    const target = turns % 2 === 1 ? b : a;
    const baseDmg = Math.max(1, attacker.atk - target.def + ((next() % 5) - 2));
    const crit = next() / 0x7fffffff < attacker.critRate;
    const damage = crit ? Math.round(baseDmg * attacker.critMul) : baseDmg;
    if (attacker === a) bHp = Math.max(0, bHp - damage);
    else aHp = Math.max(0, aHp - damage);
    hp[attacker.userId] = attacker === a ? aHp : bHp;
    hp[target.userId] = target === a ? aHp : bHp;
    rounds.push({
      attackerId: attacker.userId,
      targetId: target.userId,
      damage,
      crit,
      hp: { ...hp },
    });
    if (bHp <= 0 || aHp <= 0) break;
  }
  return {
    winnerId: aHp > 0 ? a.userId : b.userId,
    turns,
    hp,
    maxHp,
    rounds,
    reason: aHp > 0 ? 'Chiến thắng' : 'Thua',
  };
}

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h;
}
