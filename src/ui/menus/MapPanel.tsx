import { useEffect, useRef, useState } from 'react';
import { getMap } from '../../game/maps';
import { TILE } from '../../game/art/tiles';
import { useGame, npcName } from '../../store/gameStore';
import { EventBus } from '../../game/EventBus';
import { WorldAtlas } from './WorldAtlas';
import { herbNodes } from '../../game/systems/immortal';
import './map-panel.css';
const COLORS: Record<string, string> = {
  grass: '#59774a',
  darkgrass: '#335443',
  flower: '#81966d',
  dirt: '#8f7959',
  path: '#c1ac7f',
  marble: '#a0b9b7',
  platform: '#a6bfc5',
  water: '#305d7a',
  bridge: '#a27b50',
  cave: '#384861',
  stone: '#839392',
  wall: '#172b38',
  farmland: '#806e48',
};
export function MapPanel() {
  const id = useGame((s) => s.mapId),
    mm = useGame((s) => s.minimap),
    canvas = useRef<HTMLCanvasElement>(null),
    [mode, setMode] = useState<'local' | 'world'>('local');
  const map = getMap(id);
  useEffect(() => {
    const c = canvas.current,
      ctx = c?.getContext('2d');
    if (!c || !ctx || mode !== 'local') return;
    const sx = c.width / map.width,
      sy = c.height / map.height;
    ctx.clearRect(0, 0, c.width, c.height);
    map.terrain.forEach((row, y) =>
      row.forEach((t, x) => {
        ctx.fillStyle = map.blocked[y][x] && t !== 'water' ? '#26363b' : COLORS[t];
        ctx.fillRect(x * sx, y * sy, sx + 0.4, sy + 0.4);
      }),
    );
    const mark = (x: number, y: number, glyph: string, color: string) => {
      ctx.font = 'bold 17px Segoe UI';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#13232b';
      ctx.strokeText(glyph, x * sx, y * sy);
      ctx.fillStyle = color;
      ctx.fillText(glyph, x * sx, y * sy);
    };
    for (const p of map.portals)
      mark(p.rect[0] + p.rect[2] / 2, p.rect[1] + p.rect[3] / 2, '◇', '#87d4ff');
    for (const n of map.npcs) mark(n.x + 0.5, n.y + 0.5, '!', '#f4d787');
    for (const p of map.points ?? []) mark(p.x + 0.5, p.y + 0.5, '◆', '#bfc79c');
    for (const h of herbNodes(id)) mark(h.x + 0.5, h.y + 0.5, '♧', '#a4e39b');
    for (const m of mm.monsters) mark(m.x / TILE, m.y / TILE, '•', '#f28e7c');
    mark(mm.player.x / TILE, mm.player.y / TILE, '▲', '#fff');
  }, [mode, map, mm, id]);
  return (
    <div className="map-panel">
      <div className="life-tabs">
        <button className={mode === 'local' ? 'active' : ''} onClick={() => setMode('local')}>
          Bản đồ hiện tại
        </button>
        <button className={mode === 'world' ? 'active' : ''} onClick={() => setMode('world')}>
          Thế giới
        </button>
      </div>
      {mode === 'world' ? (
        <WorldAtlas />
      ) : (
        <>
          <h3>{map.name}</h3>
          <div className="map-legend">
            <span>▲ Bạn</span>
            <span>! NPC / nhiệm vụ</span>
            <span>◇ Cổng</span>
            <span>• Quái / tán tu</span>
            <span>♧ Dược liệu</span>
            <span>◆ Tương tác</span>
          </div>
          <canvas
            width={640}
            height={420}
            ref={canvas}
            aria-label={`Bản đồ ${map.name}, chạm để dẫn đường`}
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect(),
                turned = !!e.currentTarget.closest('.app.turned');
              const x = turned ? (e.clientY - r.top) / r.height : (e.clientX - r.left) / r.width,
                y = turned ? (r.right - e.clientX) / r.width : (e.clientY - r.top) / r.height;
              EventBus.emit('cmd:mapWalk', {
                x: Math.floor(x * map.width),
                y: Math.floor(y * map.height),
              });
            }}
          />
          <p className="muted">
            Chạm vị trí trống để dẫn đường. Chọn Thế giới để tìm đường qua các khu vực.
          </p>
          <div className="map-targets">
            {map.npcs.map((n) => (
              <button
                className="btn small"
                key={n.id}
                onClick={() => EventBus.emit('cmd:mapWalk', { x: n.x, y: n.y + 1 })}
              >
                ! {npcName(n.id)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
