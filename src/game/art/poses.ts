import { BASE_BEAST, type BeastPose } from './beast';
import { BASE_POSE, type HumanPose } from './character';

const TAU = Math.PI * 2;

export function humanPose(anim: string, i: number, n: number): HumanPose {
  const t = i / n;
  const p: HumanPose = { ...BASE_POSE };
  switch (anim) {
    case 'idle':
      p.bob = Math.round(Math.sin(t * TAU) * 1);
      p.arm = Math.sin(t * TAU) * 0.25;
      break;
    case 'run':
      p.step = Math.sin(t * TAU);
      p.bob = -Math.abs(Math.sin(t * TAU)) * 2.5;
      p.arm = -p.step;
      break;
    case 'attack_1': {
      const angles = [-2.3, -2.0, -0.5, 0.7, 1.0];
      p.sword = angles[i];
      p.trailFrom = i === 2 || i === 3 ? -2.1 : null;
      p.bob = i >= 2 ? 1 : 0;
      break;
    }
    case 'attack_2': {
      const angles = [1.3, 1.1, -0.5, -1.4, -1.6];
      p.sword = angles[i];
      p.trailFrom = i === 2 || i === 3 ? 1.2 : null;
      p.bob = i === 1 ? 1 : 0;
      break;
    }
    case 'attack_3': {
      const reach = [0, -4, 9, 11, 5, 0];
      p.sword = i === 0 ? -0.4 : -0.05;
      p.reach = reach[i];
      p.step = i >= 2 && i <= 4 ? 0.6 : 0;
      p.trailFrom = i === 2 ? -0.9 : null;
      break;
    }
    case 'cast':
      p.cast = [0.3, 0.7, 1, 1, 0.5][i];
      p.bob = i >= 2 && i <= 3 ? -1 : 0;
      break;
    case 'hurt':
      p.tilt = i === 0 ? -0.14 : -0.06;
      p.eyesClosed = true;
      break;
    case 'downed':
      p.mode = 'lie';
      p.fall = [0.4, 0.85, 1][i];
      break;
    case 'meditate':
      p.mode = 'sit';
      p.bob = [0, -0.5, -1, -0.5][i];
      break;
  }
  return p;
}

export function beastPose(anim: string, i: number, n: number): BeastPose {
  const t = i / n;
  const p: BeastPose = { ...BASE_BEAST };
  switch (anim) {
    case 'idle':
      p.bob = Math.sin(t * TAU) * 1.2;
      p.tail = Math.sin(t * TAU);
      break;
    case 'run':
      p.phase = t * TAU;
      p.stride = 5;
      p.bob = -Math.abs(Math.sin(t * TAU)) * 2.5;
      p.tail = Math.sin(t * TAU) * 0.5;
      break;
    case 'attack':
      p.lunge = [-4, -6, 11, 9, 2][i];
      p.mouth = [0, 0.4, 1, 1, 0.3][i];
      p.squash = [0.06, 0.1, -0.08, -0.04, 0][i];
      p.tail = [0.6, 0.8, -0.6, -0.4, 0][i];
      break;
    case 'hurt':
      p.squash = i === 0 ? -0.12 : 0.05;
      p.lunge = i === 0 ? -6 : -2;
      p.tail = -0.8;
      break;
    case 'die':
      p.down = [0.25, 0.55, 0.85, 1][i];
      p.lunge = -i * 1.5;
      break;
  }
  return p;
}
