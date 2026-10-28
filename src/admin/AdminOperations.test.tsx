// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const fake = vi.hoisted(() => ({
  status: vi.fn(),
  snapshot: vi.fn(),
  execute: vi.fn(),
  backup: vi.fn(),
}));
vi.mock('./adminOperationsApi', async (original) => ({
  ...(await original<typeof import('./adminOperationsApi')>()),
  operationsApi: fake,
}));
import { AdminOperations } from './AdminOperations';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const user = '10000000-0000-4000-8000-000000000001';
let host: HTMLDivElement, root: Root;
const field = async (label: string, value: string) => {
  await act(async () => {
    const e = host.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      `[aria-label="${label}"]`,
    )!;
    const proto =
      e.tagName === 'SELECT'
        ? HTMLSelectElement.prototype
        : e.tagName === 'TEXTAREA'
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(e, value);
    e.dispatchEvent(new Event(e.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  });
};
const button = async (text: string) => {
  await act(async () => {
    const b = [...host.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
      b.textContent?.includes(text),
    );
    expect(b).toBeTruthy();
    b!.click();
  });
};
const submit = async () => {
  await act(async () => {
    host
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
};
const render = async () => {
  await act(async () => {
    root.render(<AdminOperations initialTarget={user} revision={0} onSaved={() => {}} />);
  });
};
beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  Object.values(fake).forEach((f) => f.mockReset());
  fake.status.mockResolvedValue({
    maintenance: false,
    message: '',
    bosses: [{ id: 'map:boss', map: 'map', monster: 'boss' }],
    pending_auth: [],
  });
  fake.snapshot.mockResolvedValue({
    snapshot: { v: 1, player: { name: 'Đạo hữu', inventory: { hoi_xuan_dan: 5 } } },
    token: 'snapshot-a',
    blocked: false,
    protected: false,
  });
  fake.execute.mockResolvedValue({ ok: true });
});
afterEach(async () => {
  await act(() => root.unmount());
  host.remove();
});
it('reviews an item grant before applying and retries the same request id after an uncertain response', async () => {
  await render();
  await button('Tải thông tin');
  await field('Lý do thao tác', 'Tặng quà kiểm tra');
  await submit();
  expect(fake.execute).not.toHaveBeenCalled();
  fake.execute.mockRejectedValueOnce(new Error('offline'));
  await button('Xác nhận thực hiện');
  const first = fake.execute.mock.calls[0][0];
  expect(first).toMatchObject({
    kind: 'item_grant',
    target: user,
    token: 'snapshot-a',
    payload: { item: 'hoi_xuan_dan', quantity: 1 },
  });
  await button('Thử lại cùng yêu cầu');
  expect(fake.execute.mock.calls[1][0].id).toBe(first.id);
  expect(host.textContent).toContain('Đã thực hiện');
});
it('requires typing the exact target id before hard Auth deletion', async () => {
  await render();
  await field('Thao tác quản trị', 'auth_delete');
  await button('Tải thông tin');
  await field('Lý do thao tác', 'Xóa tài khoản thử nghiệm');
  await submit();
  let confirm = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
    (b) => b.textContent === 'Xác nhận thực hiện',
  )!;
  expect(confirm.disabled).toBe(true);
  await field('Nhập xác nhận thao tác', 'wrong');
  expect(confirm.disabled).toBe(true);
  await field('Nhập xác nhận thao tác', user);
  confirm = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
    (b) => b.textContent === 'Xác nhận thực hiện',
  )!;
  expect(confirm.disabled).toBe(false);
  await button('Xác nhận thực hiện');
  expect(fake.execute.mock.calls[0][0]).toMatchObject({
    kind: 'auth_delete',
    target: user,
    confirm: user,
  });
});
it('protects admin accounts from ban/delete even before server validation', async () => {
  fake.snapshot.mockResolvedValue({ snapshot: null, token: null, protected: true, blocked: false });
  await render();
  await field('Thao tác quản trị', 'auth_ban');
  await button('Tải thông tin');
  await field('Lý do thao tác', 'Kiểm tra bảo vệ');
  await submit();
  expect(host.querySelector('[role=dialog]')).toBeNull();
  expect(fake.execute).not.toHaveBeenCalled();
  expect(host.textContent).toContain('Không thể xóa hoặc khóa');
});
it('requires an explicit whole-server confirmation for maintenance', async () => {
  await render();
  await field('Thao tác quản trị', 'maintenance');
  await field('Trạng thái bảo trì', 'on');
  await field('Thông báo bảo trì', 'Bảo trì trong ít phút');
  await field('Lý do thao tác', 'Cập nhật máy chủ');
  await submit();
  expect(fake.execute).not.toHaveBeenCalled();
  await field('Nhập xác nhận thao tác', 'TOAN SERVER');
  await button('Xác nhận thực hiện');
  expect(fake.execute.mock.calls[0][0]).toMatchObject({
    kind: 'maintenance',
    target: null,
    payload: { enabled: true, message: 'Bảo trì trong ít phút' },
  });
});
it('ignores late account reads when the target id changes', async () => {
  let resolve!: (value: unknown) => void;
  fake.snapshot.mockReturnValueOnce(
    new Promise((r) => {
      resolve = r;
    }),
  );
  await render();
  await button('Tải thông tin');
  await field('ID tài khoản thao tác', '10000000-0000-4000-8000-000000000002');
  await act(async () => {
    resolve({ snapshot: { player: { name: 'Old private character' } }, token: 'old' });
  });
  expect(host.textContent).not.toContain('Old private character');
});
it('never shows the initial Auth password in the review dialog', async () => {
  await render();
  await field('Thao tác quản trị', 'auth_create');
  await field('Tên đăng nhập mới', 'newuser');
  await field('Mật khẩu tài khoản mới', 'secret-password');
  await field('Lý do thao tác', 'Tạo tài khoản thử');
  await submit();
  expect(host.querySelector('[role=dialog]')?.textContent).not.toContain('secret-password');
  await button('Xác nhận thực hiện');
  expect(fake.execute.mock.calls[0][0]).toMatchObject({
    kind: 'auth_create',
    username: 'newuser',
    password: 'secret-password',
  });
});
