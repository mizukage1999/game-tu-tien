// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const fake = vi.hoisted(() => ({
  getSession: vi.fn(),
  allowed: vi.fn(),
  listener: null as ((event: string, session: unknown) => void) | null,
}));
vi.mock('../net/supabase', () => ({
  supabase: {
    auth: {
      getSession: fake.getSession,
      onAuthStateChange: (fn: typeof fake.listener) => {
        fake.listener = fn;
        return { data: { subscription: { unsubscribe() {} } } };
      },
      signOut: async () => ({ error: null }),
    },
  },
}));
vi.mock('../net/auth', () => ({ signIn: vi.fn() }));
vi.mock('./adminApi', () => ({
  adminApi: { allowed: fake.allowed },
  adminError: (e: Error) => e.message,
}));
vi.mock('./AdminDashboard', () => ({
  AdminDashboard: () => <div data-private-dashboard>Private dashboard</div>,
}));
import { AdminApp } from './AdminApp';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let host: HTMLDivElement, root: Root;
beforeEach(() => {
  host = document.createElement('div');
  root = createRoot(host);
  fake.listener = null;
  fake.getSession
    .mockReset()
    .mockResolvedValue({ data: { session: { user: { id: 'admin' } } }, error: null });
  fake.allowed.mockReset().mockResolvedValue(false);
});
afterEach(() => {
  act(() => root.unmount());
});
it('does not render privileged dashboard content for a non-admin', async () => {
  await act(async () => root.render(<AdminApp />));
  expect(host.querySelector('[data-private-dashboard]')).toBeNull();
  expect(host.textContent).toContain('chưa được cấp quyền quản trị');
});
it('requires a session before checking admin privileges', async () => {
  fake.getSession.mockResolvedValue({ data: { session: null }, error: null });
  await act(async () => root.render(<AdminApp />));
  expect(fake.allowed).not.toHaveBeenCalled();
  expect(host.querySelector('input[type=password]')).not.toBeNull();
});
it('removes the dashboard immediately after a sign-out event', async () => {
  fake.allowed.mockResolvedValue(true);
  await act(async () => root.render(<AdminApp />));
  expect(host.querySelector('[data-private-dashboard]')).not.toBeNull();
  await act(async () => {
    fake.listener?.('SIGNED_OUT', null);
    await new Promise((r) => setTimeout(r, 5));
  });
  expect(host.querySelector('[data-private-dashboard]')).toBeNull();
  expect(host.querySelector('input[type=password]')).not.toBeNull();
});
it('ignores a late authorization response belonging to a previous account', async () => {
  let resolve!: (v: boolean) => void;
  fake.allowed
    .mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    )
    .mockResolvedValue(false);
  await act(async () => root.render(<AdminApp />));
  await act(async () => {
    fake.listener?.('SIGNED_IN', { user: { id: 'other' } });
    await new Promise((r) => setTimeout(r, 5));
  });
  await act(async () => resolve(true));
  expect(host.querySelector('[data-private-dashboard]')).toBeNull();
  expect(host.textContent).toContain('chưa được cấp quyền quản trị');
});
it('fails closed when the role lookup fails', async () => {
  fake.allowed.mockRejectedValue(new Error('network unavailable'));
  await act(async () => root.render(<AdminApp />));
  expect(host.querySelector('[data-private-dashboard]')).toBeNull();
  expect(host.querySelector('[role=alert]')!.textContent).toContain('network unavailable');
});
