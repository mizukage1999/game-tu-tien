import { beforeEach, expect, it, vi } from 'vitest';
const fake = vi.hoisted(() => ({
  activate: vi.fn(),
  stop: vi.fn(),
  active: vi.fn(),
  refresh: vi.fn(),
  control: vi.fn(),
  account: vi.fn(),
  attach: vi.fn(),
  detach: vi.fn(),
  hydrate: vi.fn(),
  scope: vi.fn(),
  disable: vi.fn(),
  user: { id: 'admin-id' },
  listener: null as null | ((event: string, session: { user: { id: string } }) => void),
}));
vi.mock('./config', () => ({ onlineEnabled: true }));
vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: { user: fake.user } } }),
      onAuthStateChange: (listener: typeof fake.listener) => {
        fake.listener = listener;
        return { data: { subscription: { unsubscribe() {} } } };
      },
    },
  },
}));
vi.mock('./session', () => ({ setAccountState: fake.account }));
vi.mock('./activeSession', () => ({
  activateSession: fake.activate,
  stopActiveSession: fake.stop,
  activeSessionId: fake.active,
  SESSION_REPLACED: 'replaced',
}));
vi.mock('./serverControl', () => ({
  refreshServerControl: fake.refresh,
  serverControlStore: { setState: fake.control },
}));
vi.mock('./cloudSave', () => ({
  attachCloudSync: fake.attach,
  detachCloudSync: fake.detach,
  hydrateFromCloud: fake.hydrate,
}));
vi.mock('../game/systems/save', () => ({ setSaveScope: fake.scope, disableSaving: fake.disable }));
beforeEach(() => {
  vi.resetModules();
  fake.listener = null;
  for (const value of Object.values(fake)) if (vi.isMockFunction(value)) value.mockReset();
  fake.activate.mockResolvedValue(true);
  fake.active.mockReturnValue('lease');
  fake.hydrate.mockResolvedValue(undefined);
});
it('a page refresh during maintenance never hydrates game data even with an admin Auth session', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    const control = {
      maintenance: true,
      admin: true,
      blocked: false,
      maintenance_at: '2026-01-01T00:00:00Z',
      message: 'Đang bảo trì',
      boss_resets: [],
    };
    fake.activate.mockRejectedValue(new Error('GAME_ACCESS_BLOCKED'));
    fake.refresh.mockResolvedValue(control);
    const { bootOnline } = await import('./boot');
    await bootOnline();
    expect(fake.hydrate).not.toHaveBeenCalled();
    expect(fake.attach).not.toHaveBeenCalled();
    expect(fake.control).toHaveBeenCalledWith(control);
    expect(fake.stop).toHaveBeenCalled();
    expect(fake.account).toHaveBeenCalledWith(
      expect.objectContaining({ user: null, booting: false }),
    );
  } finally {
    warn.mockRestore();
  }
});
it('still hydrates the same account normally when the server has reopened', async () => {
  const { bootOnline } = await import('./boot');
  await bootOnline();
  expect(fake.activate).toHaveBeenCalledWith('admin-id', expect.any(Function));
  expect(fake.hydrate).toHaveBeenCalledWith('admin-id');
  expect(fake.account).toHaveBeenCalledWith({ user: fake.user, booting: false });
});
it('ending a game session stops its lease and prevents token refresh from reconnecting that page', async () => {
  const { bootOnline, endGameSession } = await import('./boot');
  await bootOnline();
  endGameSession('Máy chủ đang bảo trì');
  expect(fake.stop).toHaveBeenCalledOnce();
  expect(fake.detach).toHaveBeenCalledOnce();
  expect(fake.disable).toHaveBeenCalledOnce();
  expect(fake.account).toHaveBeenLastCalledWith(
    expect.objectContaining({ user: null, error: 'Máy chủ đang bảo trì' }),
  );
  fake.listener?.('TOKEN_REFRESHED', { user: fake.user });
  await new Promise((resolve) => setTimeout(resolve, 5));
  expect(fake.activate).toHaveBeenCalledOnce();
  expect(fake.hydrate).toHaveBeenCalledOnce();
});
