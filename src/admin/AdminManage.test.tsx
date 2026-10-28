// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const fake = vi.hoisted(() => ({ grant: vi.fn(), savePlan: vi.fn(), plans: vi.fn() }));
vi.mock('./adminApi', async (importOriginal) => {
  const original = await importOriginal<typeof import('./adminApi')>();
  return {
    ...original,
    adminApi: {
      ...original.adminApi,
      grant: fake.grant,
      savePlan: fake.savePlan,
      plans: fake.plans,
    },
  };
});
import { AdminEvents, AdminJade } from './AdminManage';
import { adminCsv } from './adminApi';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let host: HTMLDivElement, root: Root;
const field = (selector: string, value: string) =>
  act(() => {
    const e = host.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
    Object.getOwnPropertyDescriptor(
      e.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
      'value',
    )!.set!.call(e, value);
    e.dispatchEvent(new Event('input', { bubbles: true }));
  });
const submit = async () => {
  await act(async () =>
    host
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
  );
};
const click = async (selector: string) => {
  await act(async () => host.querySelector<HTMLButtonElement>(selector)!.click());
};
beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  fake.grant.mockReset();
  fake.savePlan.mockReset();
  fake.plans.mockReset().mockResolvedValue([]);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});
it('requires review before granting jade and retries a failed call with the same idempotency key', async () => {
  const saved = vi.fn();
  await act(async () => root.render(<AdminJade initialTarget="player" onSaved={saved} />));
  field('[aria-label="Số Tiên Ngọc quản trị"]', '200');
  field('[aria-label="Lý do cấp ngọc"]', 'Đã xác nhận giao dịch');
  await submit();
  expect(fake.grant).not.toHaveBeenCalled();
  expect(host.querySelector('[role=dialog]')!.textContent).toContain('200');
  fake.grant
    .mockRejectedValueOnce(new Error('network unavailable'))
    .mockResolvedValueOnce({ ok: true });
  await click('[data-action=confirm-admin-jade]');
  expect(host.querySelector('[role=dialog] [role=alert]')!.textContent).toContain(
    'network unavailable',
  );
  await click('[data-action=confirm-admin-jade]');
  expect(fake.grant).toHaveBeenCalledTimes(2);
  expect(fake.grant.mock.calls[0]).toEqual(fake.grant.mock.calls[1]);
  expect(saved).toHaveBeenCalledTimes(1);
  expect(host.querySelector('[role=dialog]')).toBeNull();
  expect(host.querySelector('[role=status]')!.textContent).toContain('Đã xác nhận cấp');
});
it('keeps edited event text visible when a stale plan version is rejected', async () => {
  const plan = {
    id: 'plan',
    version: 3,
    title: 'Kế hoạch cũ',
    description: 'Nội dung',
    starts_at: null,
    ends_at: null,
    map_id: null,
    status: 'draft',
  };
  fake.plans.mockResolvedValue([plan]);
  fake.savePlan.mockRejectedValue(new Error('PLAN_CONFLICT'));
  await act(async () => root.render(<AdminEvents revision={0} onSaved={vi.fn()} />));
  await click('.admin-plan-list button');
  field('[aria-label="Tên kế hoạch sự kiện"]', 'Nội dung đã sửa');
  await submit();
  expect(fake.savePlan.mock.calls[0][0]).toMatchObject({
    id: 'plan',
    version: 3,
    status: 'draft',
    title: 'Nội dung đã sửa',
  });
  expect(host.querySelector<HTMLInputElement>('[aria-label="Tên kế hoạch sự kiện"]')!.value).toBe(
    'Nội dung đã sửa',
  );
  expect(host.querySelector('[role=alert]')!.textContent).toContain('thay đổi ở nơi khác');
});
it('neutralizes spreadsheet formulas in exported user strings while preserving numeric amounts', () => {
  const csv = adminCsv([['=HYPERLINK("bad")', '+cmd', '@command', -200, 'normal']]);
  expect(csv).toContain('"\'=HYPERLINK(""bad"")"');
  expect(csv).toContain('"\'+cmd"');
  expect(csv).toContain('"\'@command"');
  expect(csv).toContain('"-200"');
});
