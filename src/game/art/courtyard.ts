import type Phaser from 'phaser';

/** Regions use normalized source coordinates; generated art has uneven row heights. */
export const COURTYARD_ATLAS = 'courtyard-architecture';
export const COURTYARD_PROPS: Record<string, {
  region: [number, number, number, number]; height: number; originY: number; originX?: number;
  fallback: string; fade?: boolean; glowY?: number;
}> = {
  'court-column': { region: [.065, 0, .20, .38], height: 224, originY: .97, fallback: 'pillar', fade: true },
  'court-column-banner': { region: [.405, 0, .23, .38], height: 224, originX: .38, originY: .97, fallback: 'pillar', fade: true },
  'court-lantern': { region: [.775, 0, .145, .38], height: 176, originY: .97, fallback: 'lantern', glowY: 108 },
  'court-stone-post': { region: [.075, .415, .19, .265], height: 108, originY: .97, fallback: 'pillar' },
  'court-railing': { region: [.32, .415, .40, .30], height: 124, originY: .75, fallback: 'rock' },
  'court-banner': { region: [.775, .375, .145, .33], height: 176, originY: .97, fallback: 'pillar', fade: true },
  'court-notice': { region: [.025, .72, .30, .265], height: 136, originY: .97, fallback: 'pillar', fade: true },
  'court-planter': { region: [.37, .74, .295, .245], height: 86, originY: .97, fallback: 'bush' },
  'court-burner': { region: [.73, .705, .235, .285], height: 128, originY: .97, fallback: 'burner' },
};

export function registerCourtyardFrames(scene: Phaser.Scene) {
  if (!scene.textures.exists(COURTYARD_ATLAS)) return;
  const texture = scene.textures.get(COURTYARD_ATLAS);
  const source = texture.getSourceImage() as HTMLImageElement;
  for (const [key, prop] of Object.entries(COURTYARD_PROPS)) {
    const [x, y, width, height] = prop.region;
    if (!texture.has(key)) texture.add(key, 0, Math.round(x * source.width), Math.round(y * source.height), Math.round(width * source.width), Math.round(height * source.height));
  }
}
