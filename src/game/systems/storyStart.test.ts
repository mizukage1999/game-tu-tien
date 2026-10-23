import { describe, expect, it } from 'vitest';
import { startVillageChapter } from './storyStart';
import type { SaveData } from './save';

const oldSave: SaveData = {
  v: 1, savedAt: 123, mapId: 'dai_thua_vien', pos: { x: 200, y: 300 },
  player: { name: 'Đạo hữu', level: 12, exp: 50, realmIndex: 1, hp: 100, mp: 80,
    linhKhi: 200, inventory: { hoi_xuan_dan: 8 }, equipment: {} },
  quests: { main_0: { status: 'done', progress: [1] } },
};

describe('village story entry', () => {
  it('moves an existing hero to the childhood chapter without losing progress', () => {
    const next = startVillageChapter(oldSave);
    expect(next.mapId).toBe('vuong_gia_thon');
    expect(next.pos).toBeNull();
    expect(next.player).toMatchObject({ ...oldSave.player, origin: 'vuong_gia_thon', admitted: false });
    expect(next.quests.main_0).toEqual(oldSave.quests.main_0);
    expect(next.quests.village_0.status).toBe('active');
    expect(oldSave.player.origin).toBeUndefined();
  });
  it('does not teleport a chapter character again, including after admission', () => {
    const chapter = startVillageChapter(oldSave);
    const continued = { ...chapter, mapId: 'ngoai_mon', player: { ...chapter.player, admitted: true } };
    expect(startVillageChapter(chapter)).toBe(chapter);
    expect(startVillageChapter(continued)).toBe(continued);
  });
});
