import { beforeEach, expect, it, vi } from 'vitest';
import { authHandler, type AuthGateway } from '../../supabase/functions/admin-auth/handler';
const id = '10000000-0000-4000-8000-000000000005',
  target = '10000000-0000-4000-8000-000000000006';
const fake = {
  authorize: vi.fn(),
  prepare: vi.fn(),
  getUser: vi.fn(),
  create: vi.fn(),
  ban: vi.fn(),
  remove: vi.fn(),
  finish: vi.fn(),
};
const handler = authHandler(fake as AuthGateway);
const request = (body: Record<string, unknown>, token = 'token') =>
  handler(
    new Request('http://localhost/admin-auth', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
      body: JSON.stringify(body),
    }),
  );
const command = { id, kind: 'auth_ban', target, reason: 'Kiểm tra quản trị', confirm: target };
beforeEach(() => {
  Object.values(fake).forEach((m) => m.mockReset());
  fake.authorize.mockResolvedValue(true);
  fake.prepare.mockResolvedValue({ id, kind: 'auth_ban', target, status: 'pending', payload: {} });
  fake.getUser.mockResolvedValue({ email: 'user@example.com' });
  fake.finish.mockResolvedValue({ ok: true, target });
});
it('checks a live user and admin role before touching Auth or command storage', async () => {
  fake.authorize.mockResolvedValue(false);
  const response = await request(command);
  expect(response.status).toBe(403);
  expect(fake.prepare).not.toHaveBeenCalled();
  expect(fake.ban).not.toHaveBeenCalled();
});
it('requires exact target confirmation and valid input', async () => {
  expect((await request({ ...command, confirm: 'wrong' })).status).toBe(400);
  expect(
    (await request({ ...command, kind: 'auth_create', username: 'ab', password: 'short' })).status,
  ).toBe(400);
  expect(fake.prepare).not.toHaveBeenCalled();
});
it('creates a deterministic account with no password stored in the receipt', async () => {
  fake.prepare.mockResolvedValue({ id, target: id, status: 'pending' });
  fake.getUser.mockResolvedValue(null);
  const response = await request({
    ...command,
    kind: 'auth_create',
    username: 'Nguoi_Choi',
    email: '',
    password: 'secret-password',
  });
  expect(response.status).toBe(200);
  expect(fake.create).toHaveBeenCalledWith(
    id,
    'Nguoi_Choi',
    'nguoi_choi@players.tutien.invalid',
    'secret-password',
    id,
  );
  expect(JSON.stringify(fake.prepare.mock.calls)).not.toContain('secret-password');
  expect(fake.finish).toHaveBeenCalledWith(id);
});
it('recovers a lost create response without creating another user or changing the password', async () => {
  fake.prepare.mockResolvedValue({ id, target: id, status: 'pending' });
  fake.getUser.mockResolvedValue({
    email: 'nguoi@players.tutien.invalid',
    username: 'Nguoi',
    command: id,
  });
  expect(
    (
      await request({
        ...command,
        kind: 'auth_create',
        username: 'Nguoi',
        password: 'secret-password',
      })
    ).status,
  ).toBe(200);
  expect(fake.create).not.toHaveBeenCalled();
  expect(fake.finish).toHaveBeenCalledOnce();
});
it('returns committed results before calling Auth again', async () => {
  fake.prepare.mockResolvedValue({ id, target, status: 'done', result: { ok: true } });
  expect((await request(command)).status).toBe(200);
  expect(fake.getUser).not.toHaveBeenCalled();
});
it('applies bans/unbans, and finishes a delete whose user is already absent', async () => {
  await request(command);
  expect(fake.ban).toHaveBeenLastCalledWith(target, true);
  await request({ ...command, kind: 'auth_unban' });
  expect(fake.ban).toHaveBeenLastCalledWith(target, false);
  fake.getUser.mockResolvedValue(null);
  await request({ ...command, kind: 'auth_delete' });
  expect(fake.remove).not.toHaveBeenCalled();
  expect(fake.finish).toHaveBeenCalledTimes(3);
});
it('honors protected-account rejection before any service-role mutation', async () => {
  fake.prepare.mockRejectedValue({ message: 'PROTECTED_ADMIN' });
  const response = await request({ ...command, kind: 'auth_delete' });
  expect(await response.json()).toEqual({ error: 'PROTECTED_ADMIN' });
  expect(fake.remove).not.toHaveBeenCalled();
});
it('leaves failed Auth operations pending for reconciliation and does not leak details', async () => {
  fake.ban.mockRejectedValue(new Error('secret service credentials'));
  const response = await request(command);
  expect(await response.json()).toEqual({ error: 'AUTH_OPERATION_PENDING' });
  expect(fake.finish).not.toHaveBeenCalled();
});
