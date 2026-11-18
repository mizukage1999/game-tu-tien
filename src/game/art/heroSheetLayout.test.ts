import { expect, it } from 'vitest';
import { heroSheetMetrics, runningPoseY } from './heroSheetLayout';
it('lowers lifted knees and hands while preserving the planted shoe and a continuous hip seam', () => {
  for (const child of [true, false]) {
    const { cell, foot } = heroSheetMetrics(child),
      hip = Math.round(cell * 0.65);
    expect(runningPoseY(foot, child)).toBe(foot);
    expect(runningPoseY(foot - 20, child)).toBeGreaterThan(foot - 20);
    expect(runningPoseY(hip - 0.001, child)).toBeCloseTo(runningPoseY(hip, child), 2);
    expect(runningPoseY(80, child) - 80).toBeGreaterThan(0);
  }
});
