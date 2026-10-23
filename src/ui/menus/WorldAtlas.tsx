import { useEffect, useRef } from 'react';
import { NEW_MAPS } from '../../data/world';
import { getMap } from '../../game/maps';
import { EventBus } from '../../game/EventBus';
import { portalToward } from '../../game/systems/questNav';
import { mapGateReason } from '../../game/systems/worldAccess';
import { isChildhood } from '../../game/systems/origin';
import { useGame } from '../../store/gameStore';
import './world.css';

const MAPS = [...NEW_MAPS, { id: 'dai_thua_vien', name: 'Đại Thừa Viện', group: 'Sơn môn', desc: 'Sân viện dành cho đệ tử mới, Linh Đài và dược viên của Vân Hạc.', color: '#e4c58d', icon: '院' }];
const NODES: Record<string, [number, number]> = { vuong_gia_thon: [70, 180], ngoai_mon: [225, 180], dai_thua_vien: [380, 240], linh_son_tong: [550, 240], dinh_ta: [380, 85], rung_linh_thu: [550, 85], bi_canh_thach_linh: [710, 35], thac_ngoc: [710, 180] };
const LINKS = [['vuong_gia_thon', 'ngoai_mon'], ['ngoai_mon', 'dai_thua_vien'], ['ngoai_mon', 'dinh_ta'], ['dai_thua_vien', 'linh_son_tong'], ['linh_son_tong', 'dinh_ta'], ['dinh_ta', 'rung_linh_thu'], ['dinh_ta', 'thac_ngoc'], ['rung_linh_thu', 'thac_ngoc'], ['rung_linh_thu', 'bi_canh_thach_linh']];
function Preview({ id }: { id: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d'); if (!ctx) return;
    const map = getMap(id);
    const colors: Record<string, string> = { grass: '#637d4b', flower: '#8c9e64', darkgrass: '#345443', dirt: '#a08a65', path: '#c6b58a', marble: '#c0d0d8', stone: '#a3aaa5', wall: '#485664', platform: '#d2dfdf', water: '#397c91', bridge: '#aa8557', cave: '#273b5d', farmland: '#938556' };
    ctx.clearRect(0, 0, 160, 100);
    const size = 140 / (map.width + map.height);
    for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
      const px = 10 + (map.height + x - y) * size, py = 12 + (x + y) * size / 2;
      ctx.fillStyle = colors[map.terrain[y][x]] ?? '#607468';
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + size, py + size / 2); ctx.lineTo(px, py + size); ctx.lineTo(px - size, py + size / 2); ctx.fill();
    }
    for (const p of map.npcs) { ctx.fillStyle = '#ffe6a0'; ctx.beginPath(); ctx.arc(10 + (map.height + p.x - p.y) * size, 12 + (p.x + p.y) * size / 2, 2, 0, Math.PI * 2); ctx.fill(); }
  }, [id]);
  return <canvas ref={canvas} width={160} height={100} aria-label={`Địa hình ${getMap(id).name}`} />;
}

export function WorldAtlas() {
  const player = useGame((s) => s.player), quests = useGame((s) => s.quests), here = useGame((s) => s.mapId);
  const context = { childhood: isChildhood(player), quests };
  const reason = (id: string) => mapGateReason(getMap(id), context) ?? (id !== here && !portalToward(getMap(here), id, player.level, context) ? 'Chưa mở đường đến khu vực này.' : null);
  return <div className="world-atlas">
    <div className="immortal-feature"><span className="immortal-feature-glyph">山</span><div><h3>Sơn Hà Đồ</h3><p>Chọn địa điểm để dẫn đường qua các cổng đã mở. Làng quê, sơn môn và sơn dã nối thành một hành trình.</p></div></div>
    <svg viewBox="0 0 790 300" className="world-route-map" aria-label="Đường nối các bản đồ">
      {LINKS.map(([a, b]) => <line key={`${a}-${b}`} x1={NODES[a][0]} y1={NODES[a][1]} x2={NODES[b][0]} y2={NODES[b][1]} stroke="#789185" strokeWidth="2" strokeDasharray="5 5" />)}
      {MAPS.map((m) => { const locked = reason(m.id); const [x, y] = NODES[m.id]; return <g key={m.id} role="button" tabIndex={0} aria-label={`Dẫn đường tới ${m.name}`} aria-disabled={!!locked || m.id === here} onClick={() => !locked && EventBus.emit('cmd:travel', m.id)} onKeyDown={(e) => e.key === 'Enter' && !locked && EventBus.emit('cmd:travel', m.id)} opacity={locked ? .4 : 1}>
        <circle cx={x} cy={y} r={m.id === here ? 23 : 19} fill="#1d3434" stroke={m.color} strokeWidth={m.id === here ? 3 : 1} /><text x={x} y={y + 6} textAnchor="middle" fill={m.color} fontSize="19">{m.icon}</text><text x={x} y={y + 39} textAnchor="middle" fill="#dce7dd" fontSize="12">{m.name.split(' · ')[0]}</text><title>{locked ?? m.desc}</title>
      </g>; })}
    </svg>
    <div className="world-map-cards">{MAPS.map((m) => { const locked = reason(m.id); return <article key={m.id} className={`world-map-card ${here === m.id ? 'current' : ''}`}>
      <Preview id={m.id}/><div><small>{m.group} · {here === m.id ? 'Đang ở đây' : player.world?.discovered.includes(m.id) ? 'Đã khám phá' : 'Chưa đặt chân tới'}</small><h4>{m.name}</h4><p>{m.desc}</p><button className="btn" disabled={!!locked || here === m.id} onClick={() => EventBus.emit('cmd:travel', m.id)}>{here === m.id ? 'Đang ở đây' : locked ?? 'Dẫn đường tới đây'}</button></div>
    </article>; })}</div>
  </div>;
}
