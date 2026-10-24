import { useEffect, useRef, useState } from 'react';
import { ATLAS_PLACES } from '../../data/worldAtlas';
import { getMap } from '../../game/maps';
import { EventBus } from '../../game/EventBus';
import { portalToward } from '../../game/systems/questNav';
import { mapGateReason } from '../../game/systems/worldAccess';
import { isChildhood } from '../../game/systems/origin';
import { useGame } from '../../store/gameStore';
import './world.css';
import './world-atlas-v4.css';
import { MapCompass } from '../MapCompass';

export function WorldAtlas() {
  const player = useGame(s => s.player), quests = useGame(s => s.quests), here = useGame(s => s.mapId);
  const [selected, setSelected] = useState(ATLAS_PLACES.some(m => m.id === here) ? here : 'dai_thua_vien');
  const [group, setGroup] = useState('Tất cả'), [zoom, setZoom] = useState(1);
  const viewport = useRef<HTMLDivElement>(null), [fitWidth, setFitWidth] = useState(900);
  useEffect(() => {
    const el = viewport.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const fit = () => setFitWidth(Math.max(1, Math.floor(Math.min(el.clientWidth, el.clientHeight * 1.5))));
    fit(); const observer = new ResizeObserver(fit); observer.observe(el);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const pin = viewport.current?.querySelector<HTMLButtonElement>(`[data-pin="${selected}"]`);
    pin?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [selected, zoom, fitWidth]);
  const place = ATLAS_PLACES.find(m => m.id === selected)!;
  const context = { childhood: isChildhood(player), quests, reputation: player.adventure?.reputation ?? 0 };
  const reason = (id: string) => mapGateReason(getMap(id), context)
    ?? (id !== here && !portalToward(getMap(here), id, player.level, context) ? 'Chưa mở đường đến khu vực này.' : null);
  const locked = reason(place.id);
  const visible = ATLAS_PLACES.filter(m => group === 'Tất cả' || m.group === group);
  const discovered = player.world?.discovered ?? [];
  const go = () => { if (!locked && selected !== here) EventBus.emit('cmd:travel', selected); };

  return <section className="world-atlas" aria-label="Sơn Hà Đồ">
    <aside className="atlas-sidebar">
      <label className="atlas-filter">Khu vực<select aria-label="Lọc khu vực" value={group} onChange={e => setGroup(e.target.value)}>
        {['Tất cả', ...new Set(ATLAS_PLACES.map(m => m.group))].map(g => <option key={g}>{g}</option>)}
      </select></label>
      <nav className="atlas-places" aria-label="Địa điểm thế giới">
        {visible.map(m => <button key={m.id} data-map={m.id} className={`${selected === m.id ? 'selected' : ''} ${here === m.id ? 'current' : ''}`} onClick={() => setSelected(m.id)} aria-pressed={selected === m.id}>
          <span className="atlas-place-icon" aria-hidden="true">{m.icon}</span>
          <span><strong>{m.name}</strong><small>{here === m.id ? 'Đang ở đây' : reason(m.id) ? 'Chưa mở' : discovered.includes(m.id) ? 'Đã khám phá' : m.group}</small></span>
        </button>)}
      </nav>
    </aside>
    <div className="atlas-main">
      <div className="atlas-map-viewport" ref={viewport} tabIndex={0} aria-label="Bản đồ thế giới, cuộn để xem các vùng">
        <div className="atlas-painted-map" style={{ width: `${zoom * fitWidth}px` }}>
          <img src="/assets/maps/world-chart-v4.png" alt="Sơn hà, thành trấn, tông môn, rừng trúc, thác nước và bí cảnh" draggable={false} />
          <div className="atlas-map-title" aria-hidden="true"><small>CỬU HUYỀN</small><span>Sơn Hà Đồ</span></div>
          <MapCompass />
          {ATLAS_PLACES.map(m => <button key={m.id} className={`atlas-pin ${m.primary ? 'atlas-primary' : ''} ${m.id === here ? 'here' : ''} ${m.id === selected ? 'selected' : ''} ${reason(m.id) ? 'locked' : ''}`}
            style={{ left: `${m.x}%`, top: `${m.y}%` }} data-pin={m.id} aria-label={`Chọn ${m.name}`} aria-pressed={m.id === selected} onClick={() => setSelected(m.id)}>
            <span aria-hidden="true">{m.icon}</span><strong>{m.name}</strong>{m.id === here && <i>Bạn đang ở đây</i>}
          </button>)}
        </div>
      </div>
      <div className="atlas-tools">
        <span><b>▲</b> Vị trí hiện tại <b>◇</b> Địa điểm <b>✦</b> Bí cảnh</span>
        <div role="group" aria-label="Thu phóng bản đồ">
          <button onClick={() => setZoom(Math.max(1, zoom - .25))} disabled={zoom === 1} aria-label="Thu nhỏ">−</button>
          <button onClick={() => setZoom(1)} aria-label="Khôi phục kích thước">{Math.round(zoom * 100)}%</button>
          <button onClick={() => setZoom(Math.min(2, zoom + .25))} disabled={zoom === 2} aria-label="Phóng to">+</button>
        </div>
      </div>
      <footer className="atlas-detail" data-selected-map={place.id}>
        <div><small>{place.group} · {place.id === here ? 'Đang ở đây' : discovered.includes(place.id) ? 'Đã khám phá' : 'Chưa đặt chân tới'}</small><h3>{place.name}</h3><p>{locked ?? place.desc}</p></div>
        <button className="btn gold" disabled={!!locked || place.id === here} onClick={go}>{place.id === here ? 'Đang ở đây' : locked ? 'Chưa mở đường' : 'Dẫn đường'}</button>
      </footer>
    </div>
  </section>;
}
