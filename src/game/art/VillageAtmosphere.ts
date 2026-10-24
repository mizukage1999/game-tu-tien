import type Phaser from 'phaser';

/** Distant, camera-relative scenery. A single image, without per-frame canvases
 * or filters, also works with Phaser's Canvas renderer on older phones. */
export class VillageAtmosphere {
  private backdrop: Phaser.GameObjects.Image;
  constructor(private scene: Phaser.Scene, texture = 'village-dawn-v3', frame?: string) {
    this.backdrop = scene.add.image(0, 0, texture, frame).setDepth(-11000).setScrollFactor(0).setAlpha(.78);
    this.fit();
  }

  fit() {
    const camera = this.scene.cameras.main;
    const scale = Math.max(camera.width / this.backdrop.width, camera.height / this.backdrop.height) * 1.22 / camera.zoom;
    this.backdrop.setScale(scale);
    this.update();
  }

  update() {
    const camera = this.scene.cameras.main;
    this.backdrop.setPosition(camera.width / 2 - (camera.scrollX - 800) * .018,
      camera.height / 2 - (camera.scrollY - 300) * .012);
  }
}
