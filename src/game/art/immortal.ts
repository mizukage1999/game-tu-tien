import Phaser from 'phaser';
import { makeCanvas } from './canvas';

/** Paint at 2x; display sizes stay in world units so mobile scaling keeps clean edges. */
export function buildImmortalArt(scene: Phaser.Scene) {
  for (const kind of ['sword', 'crane', 'thanh_linh_thao', 'linh_chi', 'ngung_lo']) {
    const key = `immortal-${kind}`;
    if (scene.textures.exists(key)) continue;
    const [canvas, ctx] = makeCanvas(320, 200);
    ctx.scale(2, 2);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (kind === 'sword') {
      const glow = ctx.createRadialGradient(80, 55, 4, 80, 55, 74);
      glow.addColorStop(0, '#6ddfe988'); glow.addColorStop(1, '#6ddfe900');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, 160, 100);
      ctx.fillStyle = '#8cbad2';
      ctx.beginPath(); ctx.moveTo(22, 57); ctx.lineTo(126, 43); ctx.lineTo(150, 50);
      ctx.lineTo(126, 57); ctx.lineTo(22, 62); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#e7fbff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(26, 57); ctx.lineTo(143, 50); ctx.stroke();
      ctx.strokeStyle = '#e5c578'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(30, 45); ctx.lineTo(33, 70); ctx.stroke();
      ctx.strokeStyle = '#34587c'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(12, 61); ctx.lineTo(30, 58); ctx.stroke();
    } else if (kind === 'crane') {
      ctx.fillStyle = '#c0d2df';
      ctx.beginPath(); ctx.moveTo(60, 58); ctx.lineTo(8, 56); ctx.lineTo(42, 72); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f1f4f2';
      ctx.beginPath(); ctx.ellipse(75, 62, 34, 14, -0.1, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#e9eee9'; ctx.lineWidth = 10;
      ctx.beginPath(); ctx.moveTo(100, 60); ctx.bezierCurveTo(118, 58, 105, 29, 126, 31); ctx.stroke();
      ctx.fillStyle = '#e0504a'; ctx.beginPath(); ctx.ellipse(125, 28, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e7bd75'; ctx.beginPath(); ctx.moveTo(130, 31); ctx.lineTo(151, 35); ctx.lineTo(131, 37); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#18263c'; ctx.beginPath(); ctx.arc(128, 33, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#dbe5e8'; ctx.strokeStyle = '#8dabb9'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(86, 60); ctx.quadraticCurveTo(68, 18, 27, 14);
      ctx.lineTo(43, 41); ctx.lineTo(35, 38); ctx.lineTo(58, 60); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#344756'; ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(35 + i * 6, 24 + i * 3); ctx.lineTo(58 + i * 4, 52); ctx.stroke(); }
    } else {
      ctx.translate(80, 60);
      ctx.fillStyle = '#7be3bb28'; ctx.beginPath(); ctx.ellipse(0, 9, 23, 9, 0, 0, Math.PI * 2); ctx.fill();
      if (kind === 'ngung_lo') {
        ctx.fillStyle = '#83e2f0'; ctx.strokeStyle = '#dcfcff'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(0, -25); ctx.bezierCurveTo(-24, 1, -13, 14, 0, 14);
        ctx.bezierCurveTo(13, 14, 24, 1, 0, -25); ctx.fill(); ctx.stroke();
      } else if (kind === 'linh_chi') {
        ctx.strokeStyle = '#dfbc8a'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(0, 12); ctx.quadraticCurveTo(5, 0, 1, -12); ctx.stroke();
        ctx.fillStyle = '#cd7c66'; ctx.strokeStyle = '#f4c58f'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(0, -13, 19, 11, -0.15, Math.PI, Math.PI * 2); ctx.lineTo(17, -10); ctx.quadraticCurveTo(0, -3, -19, -10); ctx.fill(); ctx.stroke();
      } else {
        ctx.strokeStyle = '#7dbca0'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, 13); ctx.lineTo(0, -23); ctx.stroke();
        for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
          ctx.fillStyle = i % 2 ? '#77c996' : '#ade1a6';
          ctx.beginPath(); ctx.ellipse(side * 8, -i * 9, 11, 4, side * -0.6, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
    scene.textures.addCanvas(key, canvas)?.setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
}
