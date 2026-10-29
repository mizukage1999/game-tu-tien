import { NAME_MIN, NAME_MAX, normalizeName } from '../game/systems/character';
import { activeSessionId } from './activeSession';
import { onlineEnabled } from './config';
import { getAccountState } from './session';
import { supabase } from './supabase';

/** A server reservation, rather than an availability query, closes concurrent creation races. */
export async function claimCharacterName(raw: string): Promise<string> {
  const name = normalizeName(raw);
  if (!name)
    throw new Error(
      `Tên nhân vật cần từ ${NAME_MIN} đến ${NAME_MAX} ký tự và không chứa ký tự ẩn.`,
    );
  if (!onlineEnabled) return name;
  const user = getAccountState().user;
  const instance = user && activeSessionId(user.id);
  if (!supabase || !user || !instance)
    throw new Error('Phiên chơi đã thay đổi. Hãy đăng nhập lại.');
  const { data, error } = await supabase.rpc('claim_character_name', {
    p_name: name,
    p_instance_id: instance,
  });
  if (getAccountState().user?.id !== user.id || activeSessionId(user.id) !== instance)
    throw new Error('Phiên chơi đã thay đổi. Hãy đăng nhập lại.');
  if (error) {
    if (error.message.includes('SESSION_REPLACED'))
      throw new Error('Phiên chơi đã thay đổi. Hãy đăng nhập lại.');
    if (error.message.includes('CHARACTER_NAME_TAKEN'))
      throw new Error('Tên nhân vật này đã có người sử dụng. Hãy chọn tên khác.');
    if (error.message.includes('INVALID_CHARACTER_NAME'))
      throw new Error(
        `Tên nhân vật cần từ ${NAME_MIN} đến ${NAME_MAX} ký tự và không chứa ký tự ẩn.`,
      );
    if (error.message.includes('CHARACTER_ALREADY_EXISTS'))
      throw new Error('Tài khoản đã có nhân vật. Hãy tải lại trang để tiếp tục.');
    if (error.code === 'PGRST202' || error.code === '42883')
      throw new Error('Server chưa cập nhật giữ tên nhân vật. Hãy liên hệ quản trị viên.');
    throw new Error('Chưa giữ được tên trên server. Hãy kiểm tra kết nối rồi thử lại.');
  }
  if (typeof data !== 'string' || normalizeName(data) !== name)
    throw new Error('Server chưa xác nhận tên nhân vật. Hãy thử lại.');
  return data;
}
