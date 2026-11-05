import { describe, expect, it } from 'vitest';
import { openingMapPlan } from './mapAssetPlan';

describe('opening map asset budget', () => {
  it('keeps village visuals without loading distant settlements or adult combat', () => {
    const plan = openingMapPlan('vuong_gia_thon', true);
    expect(plan.world).toEqual([]);
    expect(plan.combat).toBe(false);
  });
  it('prepares an admitted player even when returning to the starting village', () => {
    const plan = openingMapPlan('vuong_gia_thon', false);
    expect(plan.combat).toBe(true);
  });
  it('retains the full world scenery after leaving the village', () => {
    const plan = openingMapPlan('linh_son_tong', false);
    expect(plan.world).toContain('world-vistas-v4');
    expect(plan.world).toContain('world-nature-v4');
    expect(plan.world).toContain('world-buildings-v4');
    expect(plan.combat).toBe(true);
  });
});
