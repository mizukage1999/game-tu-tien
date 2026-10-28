// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import type { SaveData } from '../game/systems/save';
const fake = vi.hoisted(() => ({
  rpc: vi.fn(),
  flush: vi.fn(),
  emit: vi.fn(),
  user: 'user' as string | null,
  instance: 'instance' as string | null,
  saved: null as SaveData | null,
}));
vi.mock('./supabase', () => ({ supabase: { rpc: fake.rpc } }));
vi.mock('./session', () => ({
  getAccountState: () => ({ user: fake.user ? { id: fake.user } : null }),
  useAccount: () => ({ user: fake.user ? { id: fake.user } : null }),
}));
vi.mock('./activeSession', () => ({ activeSessionId: () => fake.instance }));
vi.mock('./cloudSave', () => ({ flushCloudSave: fake.flush }));
vi.mock('../game/EventBus', () => ({ EventBus: { emit: fake.emit } }));
vi.mock('../game/systems/save', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../game/systems/save')>()),
  loadGame: () => fake.saved,
  writeSnapshot: (s: SaveData) => {
    fake.saved = structuredClone(s);
  },
}));
import { ALPHATEST_REWARDS, type GameMail } from '../data/alphatest';
import { gameStore, newPlayer } from '../store/gameStore';
import { claimMail, mailStore, refreshMail, resetMail } from './gameMail';
import { premiumStore, resetPremium } from './premium';
import { MailPanel } from '../ui/menus/MailPanel';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const letter: GameMail = {
  id: 'mail-a',
  campaign_id: 'alphatest-v1',
  title: 'Quà Alphatest',
  body: 'Hoàn thành nhập môn để nhận quà.',
  created_at: '2026-10-28T00:00:00Z',
  read_at: null,
  claimed_at: null,
  rewards: ALPHATEST_REWARDS,
};
let root: Root | undefined, host: HTMLDivElement;
const confirmed = () =>
  ({
    v: 1,
    savedAt: 5,
    mapId: 'thanh_khe_tran',
    pos: { x: 20, y: 30 },
    quests: gameStore.getState().quests,
    player: {
      ...gameStore.getState().player,
      level: 99,
      realmIndex: 9,
      exp: 0,
      linhKhi: 1000000,
      inventory: { linh_thach: 100000 },
      mailRevision: 1,
    },
  }) as SaveData;
const gift = () => ({
  snapshot: confirmed(),
  premium: { balance: 99999, items: [], admin: false },
  mail: { ...letter, claimed_at: '2026-10-28T01:00:00Z' },
  already_claimed: false,
});
beforeEach(() => {
  fake.user = 'user';
  fake.instance = 'instance';
  fake.saved = null;
  resetPremium();
  resetMail();
  gameStore.setState({
    player: { ...newPlayer(), origin: 'vuong_gia_thon', admitted: true },
    menu: 'mail',
    rewardPending: false,
  });
  fake.rpc.mockReset().mockImplementation(async (name: string) => ({
    error: null,
    data:
      name === 'game_mail_inbox'
        ? { mails: [{ ...letter }], snapshot: null, premium: null }
        : name === 'read_game_mail'
          ? true
          : null,
  }));
  fake.flush.mockReset().mockResolvedValue(undefined);
  fake.emit.mockClear();
});
afterEach(async () => {
  if (root) await act(() => root!.unmount());
  root = undefined;
  host?.remove();
  resetMail();
});
it('blocks unadmitted characters and never locally invents a reward', async () => {
  gameStore.setState({ player: { ...gameStore.getState().player, admitted: false } });
  expect(await claimMail(letter.id)).toBe(false);
  expect(fake.rpc).not.toHaveBeenCalled();
  expect(premiumStore.getState().balance).toBe(0);
  expect(gameStore.getState().player.level).toBe(1);
});
it('freezes gameplay, waits for saves and applies only the confirmed package', async () => {
  let resolve!: (v: unknown) => void;
  fake.rpc.mockImplementation(async (name: string) => {
    if (name === 'game_mail_inbox')
      return { error: null, data: { mails: [letter], snapshot: null } };
    return new Promise((r) => {
      resolve = r;
    });
  });
  const pending = claimMail(letter.id);
  for (let i = 0; i < 10; i++) await Promise.resolve();
  expect(gameStore.getState().rewardPending).toBe(true);
  expect(premiumStore.getState()).toMatchObject({ balance: 0, busy: true });
  expect(await claimMail(letter.id)).toBe(false);
  expect(fake.flush).toHaveBeenCalledWith('user');
  expect(fake.rpc).toHaveBeenLastCalledWith('claim_alphatest_mail', {
    p_mail: letter.id,
    p_instance_id: 'instance',
  });
  resolve({ error: null, data: gift() });
  expect(await pending).toBe(true);
  expect(gameStore.getState()).toMatchObject({
    rewardPending: false,
    player: { level: 99, exp: 0, mailRevision: 1 },
  });
  expect(premiumStore.getState()).toMatchObject({ balance: 99999, busy: false });
  expect(fake.emit.mock.calls.filter((c) => c[0] === 'cmd:save')).toHaveLength(2);
});
it('does not call claim or grant resources if the latest save fails', async () => {
  fake.flush.mockRejectedValueOnce(new Error('save offline'));
  expect(await claimMail(letter.id)).toBe(false);
  expect(fake.rpc.mock.calls.map((c) => c[0])).toEqual(['game_mail_inbox']);
  expect(gameStore.getState()).toMatchObject({ rewardPending: false, player: { level: 1 } });
  expect(mailStore.getState().error).toContain('save offline');
  expect(premiumStore.getState().balance).toBe(0);
});
it('recovers a lost response before another save or claim can overwrite it', async () => {
  const receipt = gift();
  fake.rpc.mockImplementationOnce(async () => ({
    error: null,
    data: { mails: [receipt.mail], snapshot: receipt.snapshot, premium: receipt.premium },
  }));
  expect(await claimMail(letter.id)).toBe(true);
  expect(fake.flush).not.toHaveBeenCalled();
  expect(fake.emit).not.toHaveBeenCalled();
  expect(gameStore.getState().player.level).toBe(99);
  expect(premiumStore.getState().balance).toBe(99999);
  expect(mailStore.getState().mails[0].claimed_at).toBeTruthy();
});
it('ignores old inbox and claim responses after changing accounts', async () => {
  let resolve!: (v: unknown) => void;
  fake.rpc.mockImplementationOnce(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  const loading = refreshMail();
  resetMail();
  fake.user = 'other';
  resolve({
    error: null,
    data: { mails: [letter], snapshot: confirmed(), premium: { balance: 99999 } },
  });
  await loading;
  expect(mailStore.getState().mails).toEqual([]);
  expect(premiumStore.getState().balance).toBe(0);
  fake.user = 'user';
  fake.rpc.mockImplementation(async (name: string) =>
    name === 'game_mail_inbox'
      ? { error: null, data: { mails: [letter], snapshot: null } }
      : new Promise((r) => {
          resolve = r;
        }),
  );
  const pending = claimMail(letter.id);
  for (let i = 0; i < 12; i++) await Promise.resolve();
  resetMail();
  fake.user = 'other';
  resolve({ error: null, data: gift() });
  await pending;
  expect(gameStore.getState().player.level).toBe(1);
  expect(premiumStore.getState().balance).toBe(0);
});
it('releases the frozen world when the server rejects the reward', async () => {
  fake.rpc.mockImplementation(async (name: string) =>
    name === 'game_mail_inbox'
      ? { error: null, data: { mails: [letter], snapshot: null } }
      : { data: null, error: { message: 'ADMISSION_REQUIRED' } },
  );
  expect(await claimMail(letter.id)).toBe(false);
  expect(mailStore.getState()).toMatchObject({
    busy: false,
    error: expect.stringContaining('nhập môn'),
  });
  expect(gameStore.getState().rewardPending).toBe(false);
  expect(premiumStore.getState().busy).toBe(false);
});
it('unfreezes a mobile game after a timed-out claim and ignores its late reply', async () => {
  vi.useFakeTimers();
  let resolve!: (value: unknown) => void;
  fake.rpc.mockImplementation(async (name: string) =>
    name === 'game_mail_inbox'
      ? { error: null, data: { mails: [letter], snapshot: null } }
      : new Promise((r) => {
          resolve = r;
        }),
  );
  try {
    const pending = claimMail(letter.id);
    for (let i = 0; i < 15; i++) await Promise.resolve();
    await vi.advanceTimersByTimeAsync(20001);
    expect(await pending).toBe(false);
    expect(gameStore.getState().rewardPending).toBe(false);
    expect(mailStore.getState().error).toContain('Kết nối quá lâu');
    resolve({ error: null, data: gift() });
    await Promise.resolve();
    expect(gameStore.getState().player.level).toBe(1);
    expect(premiumStore.getState().balance).toBe(0);
  } finally {
    vi.useRealTimers();
  }
});
it('shows one letter category, an admission lock and a disabled received state', async () => {
  gameStore.setState({ player: { ...gameStore.getState().player, admitted: false } });
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(<MailPanel />);
  });
  expect(host.querySelectorAll('nav > button')).toHaveLength(1);
  expect(host.querySelector<HTMLButtonElement>('.mail-claim')?.disabled).toBe(true);
  expect(host.textContent).toContain('Hoàn thành nhập môn');
  await act(async () => {
    gameStore.setState({ player: { ...gameStore.getState().player, admitted: true } });
  });
  expect(host.querySelector<HTMLButtonElement>('.mail-claim')?.disabled).toBe(false);
  await act(async () => {
    mailStore.setState({ mails: [{ ...letter, claimed_at: '2026-10-28T01:00:00Z' }] });
  });
  expect(host.querySelector<HTMLButtonElement>('.mail-claim')?.disabled).toBe(true);
  expect(host.querySelector('.mail-claim')?.textContent).toBe('Đã nhận');
});
