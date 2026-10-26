import type { PlayerSave } from './save';

export function isChildhood(player: Pick<PlayerSave, 'origin' | 'admitted'>) {
  return player.origin === 'vuong_gia_thon' && !player.admitted;
}

export function heroName(player: PlayerSave) {
  // Story dialogue can retain childhood aliases, but visible multiplayer names
  // must always use the unique identity chosen by the player.
  return player.name;
}

export function usesChildSprite(player: Pick<PlayerSave, 'origin' | 'admitted' | 'heroId'>) {
  return isChildhood(player);
}

export function originText(text: string, player: PlayerSave) {
  if (player.heroId && player.heroId !== 'wang_lam' && player.heroId !== 'ly_mo_uyen')
    return text.split('Thiết Trụ').join(player.name).split('THIẾT TRỤ').join(player.name.toLocaleUpperCase('vi-VN'));
  return player.sex === 'female' ? text.split('Thiết Trụ').join('Mộ Uyển').split('THIẾT TRỤ').join('MỘ UYỂN') : text;
}
