import { SKILLS, type SkillId } from '../../data';
import { availableHeroSkillIds } from '../../data/heroSkills';
import { heroFor } from '../../data/heroes';
import type { PlayerSave } from './save';
import { playerStats, realmFor } from './progression';
import { battlePower } from './adventure';
import { skillLevel, skillUnlocked } from './skills';

export interface PowerGrowth {
  title: string;
  power: number;
  delta: number;
  details: string[];
  unlocked: SkillId[];
  menu: 'character' | 'skills' | 'cultivate';
}
/** Compare actual character builds, ignoring HP/MP ticks, loot, EXP and loading another account. */
export function powerGrowth(before: PlayerSave, after: PlayerSave): PowerGrowth | null {
  if (before.name !== after.name || heroFor(before).id !== heroFor(after).id) return null;
  if (
    before.level === after.level &&
    before.realmIndex === after.realmIndex &&
    before.equipment === after.equipment &&
    before.skills === after.skills &&
    before.adventure?.enhancements === after.adventure?.enhancements &&
    before.life?.companions === after.life?.companions &&
    before.life?.companion === after.life?.companion &&
    before.life?.artifact === after.life?.artifact
  )
    return null;
  const a = playerStats(before),
    b = playerStats(after),
    delta = battlePower(b) - battlePower(a);
  const upgraded = availableHeroSkillIds(heroFor(after).id).find(
    (id) => skillLevel(after.skills, id) > skillLevel(before.skills, id),
  );
  const unlocked = availableHeroSkillIds(heroFor(after).id).filter(
    (id) => skillUnlocked(after, id) && !skillUnlocked(before, id),
  );
  if (delta <= 0 && !upgraded && !unlocked.length) return null;
  const details: string[] = [];
  for (const [key, label] of [
    ['atk', 'Công'],
    ['def', 'Phòng'],
    ['maxHp', 'Sinh lực'],
    ['maxMp', 'Linh lực'],
  ] as const) {
    const gain = b[key] - a[key];
    if (gain > 0) details.push(`${label} +${gain.toLocaleString('vi-VN')}`);
  }
  if (upgraded)
    details.push(`${SKILLS[upgraded].name} → cấp ${skillLevel(after.skills, upgraded)}`);
  return {
    title:
      after.realmIndex > before.realmIndex
        ? `Đột phá ${realmFor(after.realmIndex).name}`
        : after.level > before.level
          ? `Đạt cấp ${after.level}`
          : upgraded
            ? 'Kỹ năng tinh tiến'
            : 'Trang bị · Linh thú tăng lực',
    power: battlePower(b),
    delta: Math.max(0, delta),
    details,
    unlocked,
    menu:
      unlocked.length || upgraded
        ? 'skills'
        : after.realmIndex > before.realmIndex
          ? 'cultivate'
          : 'character',
  };
}
