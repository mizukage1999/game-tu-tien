import Phaser from 'phaser';

export type DamageKind = 'enemy' | 'crit' | 'player' | 'heal' | 'info';

const STYLES: Record<DamageKind, { color: string; stroke: string; size: number }> = {
  enemy: { color: '#ff5a4a', stroke: '#3a0606', size: 22 },
  crit: { color: '#ffd84a', stroke: '#5a2a00', size: 30 },
  player: { color: '#ff9a9a', stroke: '#300000', size: 20 },
  heal: { color: '#6dff8f', stroke: '#053a12', size: 20 },
  info: { color: '#bfe9ff', stroke: '#06223a', size: 16 },
};

/** Pooled floating combat numbers. */
export class DamageText {
  private pool: Phaser.GameObjects.Text[] = [];

  constructor(private scene: Phaser.Scene) {}

  private obtain(): Phaser.GameObjects.Text {
    const t =
      this.pool.pop() ??
      this.scene.add.text(0, 0, '', {
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontStyle: 'bold',
      });
    t.setActive(true).setVisible(true).setAlpha(1).setScale(1);
    return t;
  }

  private release(t: Phaser.GameObjects.Text) {
    t.setActive(false).setVisible(false);
    this.pool.push(t);
  }

  show(x: number, y: number, text: string, kind: DamageKind) {
    const st = STYLES[kind];
    const t = this.obtain();
    t.setText(text)
      .setFontSize(st.size)
      .setColor(st.color)
      .setStroke(st.stroke, 4)
      .setShadow(0, 2, 'rgba(0,0,0,0.5)', 2, true, true)
      .setOrigin(0.5)
      .setPosition(x + Phaser.Math.Between(-10, 10), y)
      .setDepth(100000);
    const big = kind === 'crit';
    t.setScale(big ? 1.6 : 1.25);
    this.scene.tweens.add({ targets: t, scale: 1, duration: 140, ease: 'Back.Out' });
    this.scene.tweens.add({
      targets: t,
      y: y - (big ? 58 : 44),
      alpha: { from: 1, to: 0 },
      delay: big ? 380 : 260,
      duration: 620,
      ease: 'Cubic.Out',
      onComplete: () => this.release(t),
    });
  }
}
