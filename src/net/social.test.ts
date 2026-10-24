import { describe, expect, it } from 'vitest';
import { parseProfile } from './social';

describe('sect membership in presence', () => {
  it('validates the registered sect and keeps older profiles without guessing from their map', () => {
    const old = { user_id: 'peer', name: 'Đạo hữu', map_id: 'linh_son_tong' };
    expect(parseProfile('key', old, 1)?.sect).toBeUndefined();
    expect(parseProfile('key', { ...old, sect: 'invented-sect' }, 1)?.sect).toBeUndefined();
    expect(parseProfile('key', { ...old, sect: 'dai_thua_vien' }, 1)?.sect).toBe('dai_thua_vien');
    expect(parseProfile('key', { ...old, sect: 'linh_son_tong' }, 1)?.sect).toBe('linh_son_tong');
  });
});
