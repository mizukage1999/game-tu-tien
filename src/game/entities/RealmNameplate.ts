import Phaser from 'phaser';
import { realmStyle, type RealmIdentity, type RealmStyle } from '../systems/realmStyle';

export const REALM_CREST_TEXTURE = 'realm-crests-v1';
/** Shared by the local player, remote players and wandering cultivators. */
export class RealmNameplate extends Phaser.GameObjects.Container {
  private crest: Phaser.GameObjects.Image;
  private title: Phaser.GameObjects.Text;
  private phase: Phaser.GameObjects.Text;
  private playerName: Phaser.GameObjects.Text;
  private appearance: RealmStyle = realmStyle({ child: true });
  private signature = '';
  constructor(
    scene: Phaser.Scene,
    identity: RealmIdentity,
    name: string,
    color = '#ffffff',
    depth = 90000,
  ) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(depth);
    const font = {
      fontFamily: 'Cambria, Georgia, "Times New Roman", serif',
      color: '#ffffff',
      stroke: '#06101c',
      strokeThickness: 3,
      resolution: 2,
    };
    this.crest = scene.add
      .image(0, -38, scene.textures.exists(REALM_CREST_TEXTURE) ? REALM_CREST_TEXTURE : 'shadow', 0)
      .setDisplaySize(120, 60);
    this.title = scene.add
      .text(0, -39, '', { ...font, fontSize: '16px', fontStyle: 'bold italic' })
      .setOrigin(0.5, 0.5);
    this.phase = scene.add
      .text(0, -18, '', {
        ...font,
        fontSize: '10px',
        strokeThickness: 1,
        backgroundColor: '#061321',
        padding: { x: 6, y: 1 },
      })
      .setOrigin(0.5, 1);
    this.playerName = scene.add
      .text(0, 0, name, {
        ...font,
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color,
      })
      .setOrigin(0.5, 1);
    this.add([this.crest, this.title, this.phase, this.playerName]);
    this.sync(identity, name, color);
  }
  sync(identity: RealmIdentity, name: string, color = '#ffffff') {
    const key = JSON.stringify([identity.level, identity.realm, identity.child, name, color]);
    if (key === this.signature) return;
    const style = realmStyle(identity);
    this.signature = key;
    this.appearance = style;
    this.playerName.setText(name).setColor(color);
    const decorated = style.index >= 0;
    this.crest.setVisible(decorated && this.scene.textures.exists(REALM_CREST_TEXTURE));
    if (decorated && this.crest.visible)
      this.crest.setTexture(REALM_CREST_TEXTURE, style.index).setDisplaySize(120, 60);
    this.title
      .setText(style.name)
      .setColor(style.color)
      .setY(decorated ? -39 : -22)
      .setFontSize(decorated ? 16 : 11)
      .setFontStyle(decorated ? 'bold italic' : 'normal');
    this.title.setShadow(0, 0, style.color, decorated ? 5 : 0, false, true);
    this.phase.setVisible(!!style.phase).setText(style.phase).setColor(style.color);
  }
  setNameColor(color: string) {
    if (this.playerName.style.color !== color) this.playerName.setColor(color);
  }
  place(x: number, y: number, visible = true) {
    this.setPosition(x, y).setVisible(visible);
    const density = (this.scene.registry.get('render-density') as number) || 1,
      zoom = this.scene.cameras.main.zoom / density;
    const compact = !!this.scene.registry.get('phone-layout');
    this.setScale((compact ? 0.8 : 0.95) / Math.max(0.1, zoom));
    const stage = this.appearance.phaseIndex,
      alpha = [0.64, 0.8, 0.95, 1][stage];
    this.crest.setAlpha(stage === 3 ? 0.92 + Math.sin(this.scene.time.now / 550) * 0.08 : alpha);
  }
  clickable(open: () => void) {
    this.setSize(120, 68);
    this.setInteractive(
      new Phaser.Geom.Rectangle(-60, -68, 120, 68),
      Phaser.Geom.Rectangle.Contains,
    );
    if (this.input) this.input.cursor = 'pointer';
    this.on('pointerdown', open);
  }
}
