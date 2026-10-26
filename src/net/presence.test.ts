import { describe, expect, it } from 'vitest';
import {
  applyPose,
  mergePresence,
  parseDir,
  parseRemote,
  parseRoster,
  parseSex,
  pruneStale,
  shouldPublish,
  uniqueWorldPlayers,
  smoothing,
  stepToward,
  type Pose,
  type RemotePlayerState,
} from './presence';

it('renders one body per account and never renders a closing copy of the local player', () => {
  const make = (key: string, userId: string, joinedAt: number) => parseRemote(key,
    { user_id: userId, x: 100, y: 100, joinedAt }, 0)!;
  const old = make('old', 'peer', 10), latest = make('latest', 'peer', 20), other = make('other', 'other', 5);
  expect(uniqueWorldPlayers([old, latest, other, make('my-old-tab', 'me', 0)], 'me')).toEqual([latest, other]);
  expect(uniqueWorldPlayers([latest, old], 'me')).toEqual([latest]);
});

const pose = (x: number, y: number, extra: Partial<Pose> = {}): Pose => ({
  x,
  y,
  dir: 'down',
  moving: false,
  ...extra,
});

const player = (key: string, extra: Partial<RemotePlayerState> = {}): RemotePlayerState => ({
  key,
  userId: `user-${key}`,
  name: key,
  sex: 'female',
  realm: 'Luyện Khí Sơ Kỳ',
  ...pose(0, 0),
  updatedAt: 0,
  ...extra,
});

describe('presence parsing', () => {
  it('accepts a well-formed entry', () => {
    const p = parseRemote('k1', { user_id: 'u1', name: ' Tuyết  Kỳ ', sex: 'male', realm: 'Trúc Cơ', x: 10, y: 20, dir: 'left', moving: true }, 100);
    expect(p).toMatchObject({ key: 'k1', userId: 'u1', name: 'Tuyết Kỳ', sex: 'male', x: 10, y: 20, dir: 'left', moving: true, updatedAt: 100 });
  });

  it('drops entries without an id or position', () => {
    expect(parseRemote('k', { x: 1, y: 2 }, 0)).toBeNull();
    expect(parseRemote('k', { user_id: 'u', y: 2 }, 0)).toBeNull();
    expect(parseRemote('k', { user_id: 'u', x: Number.NaN, y: 2 }, 0)).toBeNull();
    expect(parseRemote('k', null, 0)).toBeNull();
    expect(parseRemote('k', 'nope', 0)).toBeNull();
  });

  it('falls back to safe defaults instead of trusting strings', () => {
    const p = parseRemote('k', { user_id: 'u', name: '   ', sex: 'other', x: 0, y: 0, dir: 'sideways' }, 0)!;
    expect(p.name).toBe('Đạo hữu');
    expect(p.sex).toBe('female');
    expect(p.dir).toBe('down');
    expect(p.moving).toBe(false);
  });

  it('caps names so one client cannot flood the HUD', () => {
    const p = parseRemote('k', { user_id: 'u', name: 'x'.repeat(80), x: 0, y: 0 }, 0)!;
    expect(p.name).toHaveLength(16);
  });

  it('parses dir and sex defensively', () => {
    expect(parseDir('up')).toBe('up');
    expect(parseDir('diagonal')).toBe('down');
    expect(parseSex('male')).toBe('male');
    expect(parseSex(undefined)).toBe('female');
  });

  it('builds a roster without ourselves', () => {
    const roster = parseRoster(
      {
        me: [{ user_id: 'self', x: 1, y: 1 }],
        a: [{ user_id: 'ua', name: 'A', x: 2, y: 3 }],
        b: [{ user_id: 'ub', name: 'B', x: 4, y: 5 }],
        broken: [{ x: 9, y: 9 }],
      },
      'me',
      50,
    );
    expect(roster.map((p) => p.name)).toEqual(['A', 'B']);
  });

  it('merges duplicate presence metas for one connection', () => {
    const roster = parseRoster({ a: [{ x: 1, y: 1 }, { user_id: 'ua', name: 'A' }] }, 'me', 0);
    expect(roster).toHaveLength(1);
    expect(roster[0]).toMatchObject({ x: 1, y: 1, userId: 'ua', name: 'A' });
  });
});

describe('presence updates', () => {
  it('moves only the matching player', () => {
    const roster = [player('a'), player('b', { x: 5 })];
    const next = applyPose(roster, { key: 'b', x: 9, y: 8, dir: 'up', moving: true }, 1000);
    expect(next[0].x).toBe(0);
    expect(next[1]).toMatchObject({ x: 9, y: 8, dir: 'up', moving: true, updatedAt: 1000 });
  });

  it('ignores broadcasts with no usable position or unknown players', () => {
    const roster = [player('a')];
    expect(applyPose(roster, { key: 'zzz', x: 1, y: 1, dir: 'up', moving: false }, 0)).toEqual(roster);
    const bad = applyPose(roster, { key: 'a', x: 'oops', y: 1, dir: 'up', moving: false }, 0);
    expect(bad[0].x).toBe(0);
  });

  it('keeps the fresher pose when a presence sync arrives', () => {
    const moved = player('a', { x: 500, y: 300, dir: 'right', moving: true, updatedAt: 9000 });
    const resynced = player('a', { x: 100, y: 100, dir: 'down', moving: false, updatedAt: 10000 });
    const [kept] = mergePresence([moved], [resynced]);
    expect(kept).toMatchObject({ key: 'a', x: 500, y: 300, dir: 'right', moving: true, updatedAt: 9000 });
  });

  it('takes identity from the sync and drops players who left', () => {
    const merged = mergePresence(
      [player('a', { x: 5, y: 5 }), player('gone')],
      [player('a', { name: 'Tên Mới' }), player('new')],
    );
    expect(merged.map((p) => p.name)).toEqual(['Tên Mới', 'new']);
    expect(merged[0].x).toBe(5);
  });

  it('prunes players that went silent', () => {
    const roster = [player('old', { updatedAt: 0 }), player('new', { updatedAt: 9000 })];
    expect(pruneStale(roster, 10000, 15000).map((p) => p.key)).toEqual(['old', 'new']);
    expect(pruneStale(roster, 30000, 15000).map((p) => p.key)).toEqual([]);
  });
});

describe('shouldPublish', () => {
  it('always sends the first pose', () => {
    expect(shouldPublish(null, pose(0, 0), 500)).toBe(true);
  });

  it('respects the minimum gap between packets', () => {
    expect(shouldPublish(pose(0, 0), pose(50, 0), 40)).toBe(false);
  });

  it('sends when the player moved', () => {
    expect(shouldPublish(pose(0, 0), pose(50, 0), 120)).toBe(true);
    expect(shouldPublish(pose(0, 0), pose(1, 0), 120)).toBe(false);
  });

  it('sends immediately on a turn or start/stop', () => {
    expect(shouldPublish(pose(0, 0), pose(0, 0, { dir: 'up' }), 120)).toBe(true);
    expect(shouldPublish(pose(0, 0), pose(0, 0, { moving: true }), 120)).toBe(true);
  });

  it('keeps standing players alive with a heartbeat', () => {
    expect(shouldPublish(pose(0, 0), pose(0, 0), 400)).toBe(false);
    expect(shouldPublish(pose(0, 0), pose(0, 0), 1100)).toBe(true);
  });
});

describe('rendering helpers', () => {
  it('does not move without time passing', () => {
    expect(smoothing(0)).toBe(0);
    expect(stepToward({ x: 0, y: 0 }, { x: 100, y: 0 }, 0)).toEqual({ x: 0, y: 0 });
  });

  it('closes half the gap in one half-life', () => {
    expect(smoothing(90, 90)).toBeCloseTo(0.5, 5);
    expect(stepToward({ x: 0, y: 0 }, { x: 100, y: 0 }, 90).x).toBeCloseTo(50, 5);
  });

  it('converges towards the target', () => {
    let p = { x: 0, y: 0 };
    for (let i = 0; i < 40; i++) p = stepToward(p, { x: 100, y: 0 }, 16);
    expect(p.x).toBeGreaterThan(99);
    expect(p.x).toBeLessThanOrEqual(100);
  });

  it('snaps across teleports instead of sliding over the map', () => {
    expect(stepToward({ x: 0, y: 0 }, { x: 5000, y: 0 }, 16)).toEqual({ x: 5000, y: 0 });
  });
});
