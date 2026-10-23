import type { PlayerSave } from './save';

export function isChildhood(player: Pick<PlayerSave, 'origin' | 'admitted'>) {
  return player.origin === 'vuong_gia_thon' && !player.admitted;
}

export function heroName(player: PlayerSave) {
  return isChildhood(player) ? player.sex === 'female' ? 'Mộ Uyển' : 'Thiết Trụ' : player.name;
}

export function originText(text: string, player: PlayerSave) {
  return player.sex === 'female' ? text.split('Thiết Trụ').join('Mộ Uyển').split('THIẾT TRỤ').join('MỘ UYỂN') : text;
}
