import type { PlayerSave } from './save';

export function isChildhood(player: Pick<PlayerSave, 'origin' | 'admitted'>) {
  return player.origin === 'vuong_gia_thon' && !player.admitted;
}

export function heroName(player: PlayerSave) {
  return isChildhood(player) ? 'Thiết Trụ' : player.name;
}
