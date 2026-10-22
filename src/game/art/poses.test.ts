import { describe, expect, it } from 'vitest';
import animData from '../../data/animations.json';
import { humanPose } from './poses';

describe('humanPose fallback frames', () => {
  it('keeps every procedural human frame finite for each configured rig', () => {
    for (const [rigName, rig] of Object.entries(animData.rigs)) {
      if (rigName === 'beast') continue;

      for (const [animation, definition] of Object.entries(rig.anims)) {
        for (let frame = 0; frame < definition.frames; frame++) {
          const pose = humanPose(animation, frame, definition.frames);

          expect(
            [pose.bob, pose.step, pose.arm, pose.reach, pose.cast, pose.tilt, pose.fall].every(Number.isFinite),
            `${rigName}.${animation}[${frame}]`,
          ).toBe(true);
          expect(pose.sword === null || Number.isFinite(pose.sword), `${rigName}.${animation}[${frame}].sword`).toBe(
            true,
          );
          expect(
            pose.trailFrom === null || Number.isFinite(pose.trailFrom),
            `${rigName}.${animation}[${frame}].trailFrom`,
          ).toBe(true);
        }
      }
    }
  });
});
