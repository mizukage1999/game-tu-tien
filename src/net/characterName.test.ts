import { beforeEach, expect, it, vi } from 'vitest';
const fake = vi.hoisted(() => ({
  online: true,
  user: { id: 'user' } as { id: string } | null,
  instance: 'instance' as string | null,
  rpc: vi.fn(),
}));
vi.mock('./config', () => ({
  get onlineEnabled() {
    return fake.online;
  },
}));
vi.mock('./session', () => ({ getAccountState: () => ({ user: fake.user }) }));
vi.mock('./activeSession', () => ({ activeSessionId: () => fake.instance }));
vi.mock('./supabase', () => ({ supabase: { rpc: fake.rpc } }));
import { claimCharacterName } from './characterName';
beforeEach(() => {
  fake.online = true;
  fake.user = { id: 'user' };
  fake.instance = 'instance';
  fake.rpc.mockReset();
});

it('normalizes Unicode and whitespace, then reserves with the owning session', async () => {
  fake.rpc.mockResolvedValue({ data: 'Vương Lâm', error: null });
  expect(await claimCharacterName('  Vương   Lâm  '.normalize('NFD'))).toBe('Vương Lâm');
  expect(fake.rpc).toHaveBeenCalledWith('claim_character_name', {
    p_name: 'Vương Lâm',
    p_instance_id: 'instance',
  });
});
it('surfaces an atomic server conflict, without treating it as availability', async () => {
  fake.rpc.mockResolvedValue({ data: null, error: { message: 'CHARACTER_NAME_TAKEN' } });
  await expect(claimCharacterName('Vương Lâm')).rejects.toThrow('đã có người sử dụng');
});
it('fails closed when the server is unreachable or the migration is missing', async () => {
  fake.rpc.mockResolvedValueOnce({ data: null, error: { code: 'PGRST202', message: 'missing' } });
  await expect(claimCharacterName('Vương Lâm')).rejects.toThrow('chưa cập nhật');
  fake.rpc.mockRejectedValueOnce(new Error('network unavailable'));
  await expect(claimCharacterName('Vương Lâm')).rejects.toThrow();
});
it('rejects a reply belonging to a session replaced during reservation', async () => {
  fake.rpc.mockImplementation(async () => {
    fake.instance = 'new';
    return { data: 'Vương Lâm', error: null };
  });
  await expect(claimCharacterName('Vương Lâm')).rejects.toThrow('đăng nhập lại');
});
it('refuses invisible names and keeps offline creation usable without RPCs', async () => {
  await expect(claimCharacterName('\u200b')).rejects.toThrow('ký tự');
  fake.online = false;
  expect(await claimCharacterName('  Đạo Hữu ')).toBe('Đạo Hữu');
  expect(fake.rpc).not.toHaveBeenCalled();
});
it('rejects names shorter than six on both online and offline paths before reserving', async () => {
  for (const online of [true, false]) {
    fake.online = online;
    await expect(claimCharacterName('12345')).rejects.toThrow('6');
    await expect(claimCharacterName('   Thanh    ')).rejects.toThrow('6');
    await expect(claimCharacterName('😀😀😀')).rejects.toThrow('6');
  }
  expect(fake.rpc).not.toHaveBeenCalled();
  fake.online = false;
  expect(await claimCharacterName('123456')).toBe('123456');
});
