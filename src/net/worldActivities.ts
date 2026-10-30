import { createStore } from 'zustand/vanilla';
import { supabase } from './supabase';
import { getAccountState } from './session';
import { activeSessionId } from './activeSession';
import { flushCloudSave } from './cloudSave';
import { refreshMail } from './gameMail';
import { EventBus } from '../game/EventBus';
import type { ActivityKind } from '../game/systems/worldActivities';
export const activityStore = createStore<{
  offset: number;
  synced: boolean;
  error: string;
  winner: string | null;
}>(() => ({ offset: 0, synced: false, error: '', winner: null }));
export const activityNow = () => Date.now() + activityStore.getState().offset;
const messages: Record<string, string> = {
  ACTIVITY_CLOSED: 'Hoạt động đã đóng. Hãy chờ đợt kế tiếp.',
  GUARDIAN_REQUIRED: 'Cần hạ thủ vệ và có đóng góp trước khi nhận thưởng.',
  TREASURE_TAKEN: 'Bảo vật đã được đạo hữu khác đoạt được.',
  CAPTURE_REQUIRED: 'Cần giữ vị trí đủ 5 giây để đoạt bảo.',
  ADMISSION_REQUIRED: 'Hoàn thành nhập môn trước khi tham gia.',
  EXPLORATION_REQUIRED: 'Khám phá động phủ trước khi mở rương.',
};
export async function activityAction(
  kind: ActivityKind,
  action = 'status',
  seed = 0,
): Promise<{ mail?: string; winner: string | null } | null> {
  const user = getAccountState().user?.id,
    instance = user ? activeSessionId(user) : null;
  if (!supabase || !user || !instance) {
    activityStore.setState({ synced: false, error: 'Hoạt động cần kết nối server.' });
    return null;
  }
  try {
    if (['start', 'capture', 'claim'].includes(action)) {
      EventBus.emit('cmd:save');
      await flushCloudSave(user);
    }
    const { data, error } = await supabase
      .rpc('game_activity', {
        p_instance_id: instance,
        p_kind: kind,
        p_action: action,
        p_seed: seed,
      })
      .abortSignal(AbortSignal.timeout(12000));
    if (getAccountState().user?.id !== user || instance !== activeSessionId(user)) return null;
    if (error) throw error;
    if (
      !data ||
      typeof data.now !== 'number' ||
      !Number.isFinite(data.now) ||
      Math.abs(data.now - Date.now()) > 86400000
    )
      throw Error('INVALID_REPLY');
    activityStore.setState({
      offset: data.now - Date.now(),
      synced: true,
      error: '',
      winner: typeof data.winner === 'string' ? data.winner : null,
    });
    if (data.mail) void refreshMail();
    return data;
  } catch (error) {
    if (getAccountState().user?.id !== user) return null;
    const code = String((error as { message?: string })?.message ?? '');
    const text =
      Object.entries(messages).find(([key]) => code.includes(key))?.[1] ??
      'Server chưa mở hoạt động hoặc đang mất kết nối. Hãy thử lại.';
    activityStore.setState({ error: text, ...(action === 'status' ? { synced: false } : {}) });
    return null;
  }
}
