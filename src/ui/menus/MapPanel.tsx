import { useEffect, useRef, useState } from 'react';
import { getMap } from '../../game/maps';
import { TILE } from '../../game/art/tiles';
import { useGame, npcName } from '../../store/gameStore';
import { EventBus } from '../../game/EventBus';
import { WorldAtlas } from './WorldAtlas';
import { herbNodes } from '../../game/systems/immortal';
import { overviewFrame, overviewPoint, overviewTile } from '../../game/systems/mapProjection';
import { useMapPreview } from '../useMapPreview';
import './map-panel.css';

export function MapPanel() {
  const id = useGame(s => s.mapId), mm = useGame(s => s.minimap);
  const [mode, setMode] = useState<'local' | 'world'>('local');
  const canvas = useRef<HTMLCanvasElement>(null), viewport = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 1000, height: 620 });
  const map = getMap(id), preview = useMapPreview(id);

  useEffect(() => {
    const el = viewport.current;
    if (!el || mode !== 'local') return;
    const resize = () => setSize({ width: Math.max(1, Math.round(el.clientWidth * 1.5)), height: Math.max(1, Math.round(el.clientHeight * 1.5)) });
    resize(); const observer = new ResizeObserver(resize); observer.observe(el);
    return () => observer.disconnect();
  }, [mode]);

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx || mode !== 'local') return;
    const { width, height } = size, frame = overviewFrame(map, width, height);
    ctx.clearRect(0, 0, width, height);
    if (preview) { ctx.imageSmoothingQuality = 'high'; ctx.drawImage(preview, frame.x, frame.y, frame.width, frame.height); }
    const mark = (x: number, y: number, glyph: string, color: string, radius = 10) => {
      const p = overviewPoint(map, x, y, width, height);
      ctx.fillStyle = '#091b2de8'; ctx.strokeStyle = color; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.font = 'bold 15px Segoe UI'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = color; ctx.fillText(glyph, p.x, p.y + .5);
    };
    for (const p of map.portals) mark((p.rect[0] + p.rect[2] / 2) * TILE, (p.rect[1] + p.rect[3] / 2) * TILE, '◇', '#8ee6ff', 12);
    for (const n of map.npcs) mark((n.x + .5) * TILE, (n.y + .5) * TILE, '!', '#ffe2a1');
    for (const p of map.points ?? []) mark((p.x + .5) * TILE, (p.y + .5) * TILE, '◆', '#cbd8a4', 8);
    for (const h of herbNodes(id)) mark((h.x + .5) * TILE, (h.y + .5) * TILE, '♧', '#9ee6aa', 8);
    for (const m of mm.monsters) mark(m.x, m.y, '•', '#ff8079', 5);
    mark(mm.player.x, mm.player.y, '▲', '#ffffff', 12);
  }, [mode, map, mm, id, preview, size]);

  return <section className="map-panel">
    <nav className="map-mode-tabs" aria-label="Loại bản đồ">
      <button className={mode === 'local' ? 'active' : ''} onClick={() => setMode('local')}>Khu vực</button>
      <button className={mode === 'world' ? 'active' : ''} onClick={() => setMode('world')}>Thế giới</button>
      <span>{mode === 'local' ? map.name : 'Sơn Hà Đồ'}</span>
    </nav>
    {mode === 'world' ? <WorldAtlas /> : <div className="local-map-view">
      <div className="local-map-canvas-wrap" ref={viewport}>
        <canvas ref={canvas} width={size.width} height={size.height} aria-label={`Bản đồ ${map.name}, chạm để dẫn đường`}
          onClick={e => {
            const r = e.currentTarget.getBoundingClientRect(), turned = !!e.currentTarget.closest('.app.turned');
            const x = turned ? (e.clientY - r.top) / r.height : (e.clientX - r.left) / r.width;
            const y = turned ? (r.right - e.clientX) / r.width : (e.clientY - r.top) / r.height;
            const tile = overviewTile(map, x * size.width, y * size.height, size.width, size.height);
            if (tile) EventBus.emit('cmd:mapWalk', tile);
          }} />
        {!preview && <span className="map-preview-loading">Đang vẽ địa hình…</span>}
        <div className="local-map-name"><small>BẢN ĐỒ KHU VỰC</small><strong>{map.name}</strong></div>
      </div>
      <aside className="local-map-sidebar">
        <h4>Điểm đến</h4>
        <div className="map-targets">{map.npcs.map((n, i) => <button key={`${n.id}-${i}`} onClick={() => EventBus.emit('cmd:mapWalk', { x: n.x, y: n.y + 1 })}>! <span>{npcName(n.id)}</span></button>)}
          {(map.points ?? []).map(p => <button key={p.id} onClick={() => EventBus.emit('cmd:mapWalk', { x: p.x, y: p.y })}>◆ <span>{p.name}</span></button>)}
          {map.portals.map((p, i) => <button key={`portal-${i}`} onClick={() => EventBus.emit('cmd:mapWalk', { x: p.rect[0] + Math.floor(p.rect[2] / 2), y: p.rect[1] + Math.floor(p.rect[3] / 2) })}>◇ <span>{p.label}</span></button>)}
        </div>
        <div className="map-legend"><span>▲ Bạn</span><span>! NPC</span><span>◇ Cổng</span><span>• Quái / tán tu</span><span>♧ Dược liệu</span><span>◆ Tương tác</span></div>
        <p>Chạm lên bản đồ hoặc chọn điểm đến để dẫn đường.</p>
      </aside>
    </div>}
  </section>;
}
