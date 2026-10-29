import type { SupabaseClient } from '@supabase/supabase-js';
import { expect, it, vi } from 'vitest';
import { joinSocialChannel } from './socialChannel';
import { parseSocialMessage, type PublicProfile } from './social';

it('broadcasts world chat across maps while friend messages remain addressed to one account', async () => {
  const peers: { deliver: (payload: unknown) => void }[] = [];
  const client = () =>
    ({
      getChannels: () => [],
      removeChannel: vi.fn(),
      channel: () => {
        let incoming: (value: { payload: unknown }) => void = () => {};
        const self = { deliver: (payload: unknown) => incoming({ payload }) };
        peers.push(self);
        const socket = {
          on(type: string, options: { event: string }, fn: typeof incoming) {
            if (type === 'broadcast' && options.event === 'social') incoming = fn;
            return socket;
          },
          presenceState: () => ({}),
          track: async () => 'ok',
          subscribe(fn: (status: string) => void) {
            fn('SUBSCRIBED');
            return socket;
          },
          async send({ payload }: { payload: unknown }) {
            peers.filter((p) => p !== self).forEach((p) => p.deliver(payload));
            return 'ok';
          },
        };
        return socket;
      },
    }) as unknown as SupabaseClient;
  const profile = (userId: string, mapId: string): PublicProfile => ({
    userId,
    mapId,
    name: userId,
    sex: 'male',
    level: 15,
    realm: 'Trúc Cơ',
    party: null,
  });
  const a = joinSocialChannel(profile('a', 'vuong_gia_thon'), client())!,
    b = joinSocialChannel(profile('b', 'rung_linh_thu'), client())!,
    c = joinSocialChannel(profile('c', 'dai_thua_vien'), client())!;
  const onB = vi.fn(),
    onC = vi.fn();
  b.onMessage(onB);
  c.onMessage(onC);
  expect(
    await a.send({
      t: 'chat:world',
      to: '*',
      from: { userId: 'a', name: 'a' },
      id: 'world-1',
      text: 'Đạo hữu cùng săn boss nhé!',
    }),
  ).toBe(true);
  expect(onB).toHaveBeenCalledWith(
    expect.objectContaining({ t: 'chat:world', text: 'Đạo hữu cùng săn boss nhé!' }),
  );
  expect(onC).toHaveBeenCalledOnce();
  await a.send({ t: 'friend:no', from: 'a', to: 'b' });
  expect(onB).toHaveBeenCalledTimes(2);
  expect(onC).toHaveBeenCalledOnce();
  await a.leave();
  expect(
    await a.send({
      t: 'chat:world',
      to: '*',
      from: { userId: 'a', name: 'a' },
      id: 'world-2',
      text: 'Đã ngắt',
    }),
  ).toBe(false);
  await b.leave();
  await c.leave();
});
it('rejects empty, oversized, hidden-control and wrongly addressed world messages', () => {
  const packet = {
    t: 'chat:world',
    to: '*',
    from: { userId: 'a', name: 'a' },
    id: 'id',
    text: 'Xin chào',
  };
  expect(parseSocialMessage(packet)).toEqual(packet);
  for (const text of ['', '   ', 'a'.repeat(201), 'ẩn\u200bchữ'])
    expect(parseSocialMessage({ ...packet, text })).toBeNull();
  expect(parseSocialMessage({ ...packet, to: 'b' })).toBeNull();
});
