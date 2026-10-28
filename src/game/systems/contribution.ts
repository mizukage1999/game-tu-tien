import type { LootRoll } from './loot';

export interface Contribution {
  key: string;
  damage: number;
  hits: number;
  at: number;
}
export interface RewardParticipant {
  key: string;
  x: number;
  y: number;
  alive: boolean;
  party?: string | null;
}
export interface SharedAward {
  to: string;
  exp: number;
  drops: LootRoll[];
}

export function recordContribution(
  entries: Contribution[],
  key: string,
  damage: number,
  hpBefore: number,
  now: number,
): Contribution[] {
  const actual = Math.max(0, Math.min(hpBefore, damage));
  if (!Number.isFinite(actual) || actual <= 0) return entries;
  const old = entries.find((e) => e.key === key);
  return [
    ...entries.filter((e) => e.key !== key),
    {
      key,
      damage: (old?.damage ?? 0) + actual,
      hits: (old?.hits ?? 0) + 1,
      at: now,
    },
  ].slice(-64);
}

/** Only active fighters qualify. Loot is rolled once, then partitioned, never copied. */
export function contributionAwards(
  entries: Contribution[],
  actors: RewardParticipant[],
  monster: { x: number; y: number; hp: number },
  exp: number,
  drops: LootRoll[],
  now = Date.now(),
  rng = Math.random,
): SharedAward[] {
  const eligible = entries
    .filter((e) => {
      const actor = actors.find((a) => a.key === e.key);
      return (
        actor?.alive &&
        now - e.at <= 30_000 &&
        now >= e.at &&
        Math.hypot(actor.x - monster.x, actor.y - monster.y) <= 900 &&
        (e.damage >= monster.hp * 0.02 || e.hits >= 3)
      );
    })
    .sort((a, b) => b.damage - a.damage || a.key.localeCompare(b.key))
    .slice(0, 32);
  if (!eligible.length) return [];
  const total = eligible.reduce((sum, e) => sum + e.damage, 0);
  const awards = eligible.map((e) => {
    const actor = actors.find((a) => a.key === e.key)!;
    const teammates = actor.party
      ? eligible.filter((other) => actors.find((a) => a.key === other.key)?.party === actor.party)
          .length - 1
      : 0;
    return {
      to: e.key,
      exp: Math.max(
        1,
        Math.floor(
          exp *
            (0.5 / eligible.length + (0.5 * e.damage) / total) *
            (1 + Math.min(3, teammates) * 0.1),
        ),
      ),
      drops: [] as LootRoll[],
    };
  });
  let cursor = Math.floor(rng() * awards.length) % awards.length;
  for (const drop of drops) {
    const qty = Math.max(0, Math.floor(drop.qty));
    const each = Math.floor(qty / awards.length),
      remainder = qty % awards.length;
    for (let i = 0; i < awards.length; i++) {
      const n = each + (i < remainder ? 1 : 0);
      if (n) awards[(cursor + i) % awards.length].drops.push({ item: drop.item, qty: n });
    }
    cursor = (cursor + remainder) % awards.length;
  }
  return awards;
}
