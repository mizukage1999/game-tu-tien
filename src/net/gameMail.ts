import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { GameMail } from '../data/alphatest';
import type { SaveData } from '../game/systems/save';
import { loadGame, writeSnapshot } from '../game/systems/save';
import { playerStats } from '../game/systems/progression';
import { EventBus } from '../game/EventBus';
import { gameStore } from '../store/gameStore';
import { supabase } from './supabase';
import { getAccountState } from './session';
import { activeSessionId } from './activeSession';
import { flushCloudSave } from './cloudSave';
import { acceptConfirmedPremium, premiumStore } from './premium';

interface MailState {
  mails: GameMail[];
  loaded: boolean;
  loading: boolean;
  busy: boolean;
  error: string | null;
}
const empty: MailState = { mails: [], loaded: false, loading: false, busy: false, error: null };
export const mailStore = createStore<MailState>()(() => ({ ...empty }));
export function useMail<T>(select: (s: MailState) => T) {
  return useStore(mailStore, select);
}
let epoch = 0,
  request = 0;
export function resetMail() {
  epoch++;
  request++;
  mailStore.setState({ ...empty });
  gameStore.setState({ rewardPending: false });
}
function mailError(error: unknown) {
  const e = error as { message?: string; code?: string };
  const m = e?.message ?? String(error);
  if (m.includes('ADMISSION_REQUIRED')) return 'Hãy hoàn thành nhập môn rồi quay lại nhận quà.';
  if (m.includes('SESSION_REPLACED')) return 'Phiên đăng nhập đã thay đổi. Hãy đăng nhập lại.';
  if (m.includes('MAIL_REWARD_STALE'))
    return 'Phần thưởng đã được xử lý ở phiên khác. Hãy đăng nhập lại để đồng bộ.';
  if (e?.code === 'PGRST202' || m.includes('Could not find the function'))
    return 'Máy chủ chưa mở tính năng nhận quà qua thư. Vui lòng liên hệ quản trị viên.';
  return m;
}
const owns = (user: string, version: number) =>
  epoch === version && getAccountState().user?.id === user && !!activeSessionId(user);
async function bounded<T>(work: PromiseLike<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const limit = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error('Kết nối quá lâu. Hãy thử lại; phần thưởng sẽ không bị nhận trùng.')),
      20000,
    );
  });
  try {
    return await Promise.race([work, limit]);
  } finally {
    clearTimeout(timer!);
  }
}
interface Inbox {
  mails: GameMail[];
  snapshot: SaveData | null;
  premium: unknown;
}
function applyReceipt(snapshot: SaveData | null, premium: unknown) {
  if (!snapshot?.player) return;
  // Hydrate confirmed progress, keeping the active scene and its exact position.
  writeSnapshot(snapshot);
  const normalized = loadGame();
  if (!normalized) throw new Error('Chưa đọc được dữ liệu phần thưởng. Hãy tải lại game.');
  if (premium) acceptConfirmedPremium(premium);
  gameStore.setState({
    player: normalized.player,
    quests: normalized.quests,
    stats: playerStats(normalized.player),
  });
  gameStore.getState().syncPremium();
}
async function inbox(): Promise<Inbox> {
  const { data, error } = await bounded(
    supabase!.rpc('game_mail_inbox', { p_revision: gameStore.getState().player.mailRevision ?? 0 }),
  );
  if (error) throw error;
  if (!data || !Array.isArray(data.mails)) throw new Error('Chưa tải được hộp thư.');
  return data as Inbox;
}
export async function refreshMail() {
  const user = getAccountState().user?.id;
  if (!supabase || !user || mailStore.getState().busy) return;
  const version = epoch,
    ticket = ++request;
  mailStore.setState({ loading: true, error: null });
  try {
    const result = await inbox();
    if (!owns(user, version) || request !== ticket) return;
    if (
      result.snapshot &&
      (result.snapshot.player.mailRevision ?? 0) > (gameStore.getState().player.mailRevision ?? 0)
    )
      applyReceipt(result.snapshot, result.premium);
    mailStore.setState({ mails: result.mails, loaded: true });
  } catch (error) {
    if (owns(user, version) && request === ticket) mailStore.setState({ error: mailError(error) });
  } finally {
    if (owns(user, version) && request === ticket) mailStore.setState({ loading: false });
  }
}
export async function readMail(id: string) {
  const user = getAccountState().user?.id,
    version = epoch;
  if (!supabase || !user) return;
  try {
    const { data, error } = await supabase.rpc('read_game_mail', { p_mail: id });
    if (!owns(user, version)) return;
    if (error) throw error;
    if (data === true)
      mailStore.setState((s) => ({
        mails: s.mails.map((m) =>
          m.id === id ? { ...m, read_at: m.read_at ?? new Date().toISOString() } : m,
        ),
      }));
  } catch (error) {
    if (owns(user, version)) mailStore.setState({ error: mailError(error) });
  }
}
export async function claimMail(id: string): Promise<boolean> {
  const user = getAccountState().user?.id;
  if (!supabase || !user || mailStore.getState().busy || premiumStore.getState().busy) return false;
  if (
    mailStore.getState().mails.find((m) => m.id === id)?.campaign_id === 'alphatest-v1' &&
    !gameStore.getState().player.admitted
  ) {
    mailStore.setState({ error: 'Hãy hoàn thành nhập môn rồi quay lại nhận quà.' });
    return false;
  }
  const version = epoch,
    instance = activeSessionId(user);
  request++; // Any older inbox response must not restore an unclaimed letter.
  mailStore.setState({ busy: true, loading: false, error: null });
  premiumStore.setState({ busy: true });
  gameStore.setState({ rewardPending: true });
  try {
    // Recover a committed claim whose previous response was lost BEFORE uploading anything.
    const recovered = await inbox();
    if (!owns(user, version) || activeSessionId(user) !== instance) return false;
    if (recovered.snapshot) applyReceipt(recovered.snapshot, recovered.premium);
    mailStore.setState({ mails: recovered.mails, loaded: true });
    const letter = recovered.mails.find((m) => m.id === id);
    if (!letter) throw new Error('Không tìm thấy thư này. Hãy làm mới hộp thư.');
    if (letter.claimed_at) return true;
    const alphatest = letter.campaign_id === 'alphatest-v1';
    if (alphatest && !gameStore.getState().player.admitted) throw new Error('ADMISSION_REQUIRED');
    EventBus.emit('cmd:save');
    await bounded(flushCloudSave(user));
    if (!owns(user, version) || activeSessionId(user) !== instance) return false;
    const { data, error } = await bounded(
      supabase.rpc(alphatest ? 'claim_alphatest_mail' : 'claim_game_mail', {
        p_mail: id,
        p_instance_id: instance,
      }),
    );
    if (!owns(user, version) || activeSessionId(user) !== instance) return false;
    if (error) throw error;
    if (!data?.snapshot?.player || !data.mail?.claimed_at)
      throw new Error('Chưa xác nhận được phần thưởng. Hãy thử nhận lại.');
    applyReceipt(data.snapshot as SaveData, data.premium);
    mailStore.setState((s) => ({
      mails: s.mails.map((m) => (m.id === id ? (data.mail as GameMail) : m)),
    }));
    EventBus.emit('cmd:save');
    gameStore
      .getState()
      .toast(
        alphatest
          ? 'Đã nhận quà Alphatest: cấp 99, Tiên Ngọc, Linh Thạch và Linh Khí.'
          : 'Đã nhận vật phẩm đính kèm trong thư.',
        'quest',
      );
    return true;
  } catch (error) {
    if (owns(user, version)) mailStore.setState({ error: mailError(error) });
    return false;
  } finally {
    if (epoch === version) {
      mailStore.setState({ busy: false });
      premiumStore.setState({ busy: false });
      gameStore.setState({ rewardPending: false });
    }
  }
}
