import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  village: vi.fn(async () => ({ completed: 17, total: 17, failed: 0 })),
  images: vi.fn(async () => ({ completed: 1, total: 1, failed: 0 })),
}));
vi.mock('../game/art/startupCache', () => ({
  warmVillageStartup: mocks.village,
  warmImages: mocks.images,
}));
import { prepareEntryResources } from './resources';
import type { SaveData } from '../game/systems/save';
beforeEach(() => vi.clearAllMocks());
it('prepares the opening village for a new player and preserves the hydrated school/age', async () => {
  const report = vi.fn();
  await prepareEntryResources(null, report);
  expect(mocks.village).toHaveBeenCalledWith('wang_lam', true, report);
  await prepareEntryResources(
    { mapId: 'vuong_gia_thon', player: { heroId: 'hong_lien', admitted: true } } as SaveData,
    report,
  );
  expect(mocks.village).toHaveBeenLastCalledWith('hong_lien', false, report);
});
it('does not prefetch an unused village for a returning player on a different map', async () => {
  await prepareEntryResources(
    { mapId: 'thac_ngoc', player: { heroId: 'ly_mo_uyen', admitted: true } } as SaveData,
    vi.fn(),
  );
  expect(mocks.village).not.toHaveBeenCalled();
  expect(mocks.images).toHaveBeenCalledWith(
    [expect.stringContaining('hero-adult-ly_mo_uyen')],
    expect.any(Function),
  );
});
