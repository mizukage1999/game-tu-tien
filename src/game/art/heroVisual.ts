/** Shared world scale keeps local and remote bodies consistent without changing physics. */
export const HERO_WORLD_SCALE = 0.94;
export const MOBILE_ADULT_SCALE = 0.85;

/** Keep proportions, foot anchors and gameplay coordinates independent of screen size. */
export function mobileActorScale(mobile: boolean, child = false) {
  return mobile && !child ? MOBILE_ADULT_SCALE : 1;
}

export function heroWorldScale(mobile: boolean, child = false) {
  return HERO_WORLD_SCALE * mobileActorScale(mobile, child);
}
