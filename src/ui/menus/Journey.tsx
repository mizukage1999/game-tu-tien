import { useEffect, useState } from 'react';
import { ITEMS, QUESTS } from '../../data';
import { EventBus } from '../../game/EventBus';
import {
  HOME_MAX_LEVEL, HOME_QUEST, homeMeditateRate, homeUpgradeCost,
  immortalProgress, MOUNTS, mountUnlocked, RECIPES, recipeCheck, storyOrder,
} from '../../game/systems/immortal';
import { StoryChapters } from './StoryChapters';
import { JourneyFeatureHeader } from './JourneyFeatureHeader';
import { itemIconUrl } from '../../game/art/icons';
import { itemName, useGame } from '../../store/gameStore';
import { isChildhood } from '../../game/systems/origin';
import { WorldAtlas } from './WorldAtlas';
import './journey.css';

const TABS = [
  { id: 'story', label: 'Cốt Truyện', glyph: '卷' },
  { id: 'alchemy', label: 'Đan Phòng', glyph: '丹' },
  { id: 'home', label: 'Động Phủ', glyph: '府' },
  { id: 'mounts', label: 'Ngự Hành', glyph: '御' },
  { id: 'world', label: 'Sơn Hà Đồ', glyph: '山' },
] as const;
type Tab = typeof TABS[number]['id'];

function Costs({ cost }: { cost: Record<string, number> }) {
  const player = useGame((s) => s.player);
  return <div className="immortal-costs">{Object.entries(cost).map(([id, qty]) => {
    const have = id === 'linh_khi' ? player.linhKhi : player.inventory[id] ?? 0;
    return <span key={id} className={have >= qty ? 'enough' : 'short'}>{itemName(id)} <b>{have}/{qty}</b></span>;
  })}</div>;
}

export function Journey() {
  const player = useGame((s) => s.player);
  const quests = useGame((s) => s.quests);
  const mapId = useGame((s) => s.mapId);
  const status = useGame((s) => s.status);

  const craftPill = useGame((s) => s.craftPill);
  const upgradeHome = useGame((s) => s.upgradeHome);
  const harvestGarden = useGame((s) => s.harvestGarden);
  const selectMount = useGame((s) => s.selectMount);
  const setMenu = useGame((s) => s.setMenu);
  const [tab, setTab] = useState<Tab>('story');
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const progress = immortalProgress(player);
  const order = storyOrder(player);
  const childhood = isChildhood(player);
  const completed = order.filter((id) => quests[id]?.status === 'done').length;
  const homeOpen = quests[HOME_QUEST]?.status === 'done';
  const gardenWait = Math.max(0, Math.ceil((progress.gardenReadyAt - now) / 1000));
  const currentId = order.find((id) => quests[id]?.status !== 'done');
  const currentAim = currentId && QUESTS[currentId].objectives.find((o, i) => (quests[currentId]?.progress[i] ?? 0) < o.count);

  return <div className={`immortal-journey${tab === 'world' ? ' atlas-open' : tab === 'story' ? ' story-open' : ' feature-open'}`}>
    <div className="immortal-intro">
      <span className="immortal-seal" aria-hidden="true">道</span>
      <div><small>{childhood ? 'VƯƠNG GIA THÔN · THIẾT TRỤ' : 'SƠN HÀ TIÊN LỘ'}</small><h2>{childhood ? 'Những ngày còn thơ' : 'Một đời cầu đạo'}</h2><p>{childhood ? 'Từ mái nhà bên sông, bước đầu tiên đi về phía núi.' : 'Đi qua sơn hà, giữ một lời hẹn trở về.'}</p></div>
      <span className="immortal-counter">{completed}<small> / {order.length} duyên ngộ</small></span>
    </div>
    <div className="immortal-tabs" role="tablist" aria-label="Hoạt động tu tiên">
      {TABS.map((t) => <button key={t.id} id={`journey-tab-${t.id}`} role="tab" aria-controls={`journey-panel-${t.id}`} aria-selected={tab === t.id} disabled={childhood && !['story', 'world'].includes(t.id)} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}><span aria-hidden="true">{t.glyph}</span>{t.label}</button>)}
    </div>
    <div role="tabpanel" id={`journey-panel-${tab}`} aria-labelledby={`journey-tab-${tab}`}>
      {tab === 'story' && <StoryChapters/>}
      {tab === 'world' && <WorldAtlas/>}
      {tab === 'alchemy' && <>
        <JourneyFeatureHeader type="alchemy" detail={`Đã luyện ${Object.values(progress.crafted).reduce((sum, n) => sum + n, 0)} viên · ${RECIPES.length} đan phương`}/>
        <div className="immortal-recipes">{RECIPES.map((recipe) => {
          const reason = recipeCheck(player, recipe.id);
          return <article key={recipe.id} className="immortal-card">
            <div className="immortal-card-heading"><img className="journey-pill-icon" src={itemIconUrl(recipe.id)} alt=""/><div><h4>{recipe.name}</h4><small>Đã có {player.inventory[recipe.id] ?? 0} · Đã luyện {progress.crafted[recipe.id] ?? 0}</small></div><span className="immortal-tag">Cấp {recipe.level}</span></div>
            <p>{recipe.desc}</p><Costs cost={recipe.cost}/>
            <button className="btn gold" disabled={!!reason || status !== 'alive'} onClick={() => craftPill(recipe.id)}>{reason ?? 'Khai lò luyện đan'}</button>
          </article>;
        })}</div>
        <button className="btn" onClick={() => setMenu('bag')}>Mở túi dùng đan dược</button>
      </>}
      {tab === 'home' && <>
        <JourneyFeatureHeader type="home" detail={homeOpen ? `Linh mạch cấp ${progress.homeLevel} · Linh khí ×${homeMeditateRate(progress.homeLevel)}` : `Mở sau: ${QUESTS[HOME_QUEST].name}`}/>
        {!homeOpen ? <p className="immortal-note">Hoàn thành duyên ngộ “Lò Đan Khai Hỏa” và trả nhiệm vụ cho Vân Hạc để nhận động phủ riêng.</p> : <>
          <div className="immortal-home-grid">
            <article className="immortal-card"><h4>Linh mạch · Cấp {progress.homeLevel}</h4><p>Tọa thiền tại động phủ: linh khí ×{homeMeditateRate(progress.homeLevel)}. Nâng cấp cũng tăng sản lượng dược điền.</p>
              <button className="btn gold" disabled={status !== 'alive'} onClick={() => EventBus.emit('cmd:home')}>{mapId === 'dong_phu' ? 'Rời động phủ' : 'Về động phủ'}</button>
              {mapId === 'dong_phu' && <button className="btn" onClick={() => { EventBus.emit('cmd:meditate'); setMenu(null); }}>Tọa thiền tại linh mạch</button>}
            </article>
            <article className="immortal-card"><h4>Dược điền</h4><p>Mỗi 90 giây: {2 + progress.homeLevel} Thanh Linh Thảo, 1 Linh Chi và 2 Ngưng Lộ. Đợt thu hoạch đầu tiên sẵn sàng khi nhận phủ.</p>
              <button className="btn gold" disabled={mapId !== 'dong_phu' || gardenWait > 0 || status !== 'alive'} onClick={() => harvestGarden()}>{mapId !== 'dong_phu' ? 'Về phủ để thu hoạch' : gardenWait > 0 ? `Sinh trưởng · ${gardenWait}s` : 'Thu hoạch dược điền'}</button>
            </article>
          </div>
          <article className="immortal-card"><h4>Bồi dưỡng động phủ</h4>{progress.homeLevel < HOME_MAX_LEVEL ? <><Costs cost={homeUpgradeCost(progress.homeLevel)}/><button className="btn gold" disabled={status !== 'alive' || Object.entries(homeUpgradeCost(progress.homeLevel)).some(([id, qty]) => (id === 'linh_khi' ? player.linhKhi : player.inventory[id] ?? 0) < qty)} onClick={upgradeHome}>Nâng lên cấp {progress.homeLevel + 1}</button></> : <p>Linh mạch đã đạt cấp tối đa.</p>}</article>
        </>}
      </>}
      {tab === 'mounts' && <>
        <JourneyFeatureHeader type="mounts" detail={`${MOUNTS.filter(m => mountUnlocked(m.id, quests)).length}/${MOUNTS.length} duyên ngự hành · ${progress.mount ? MOUNTS.find(m => m.id === progress.mount)?.name : 'Chưa chọn tọa kỵ'}`}/>
        <div className="immortal-home-grid">{MOUNTS.map((mount) => {
          const open = mountUnlocked(mount.id, quests);
          return <article className="immortal-card" key={mount.id}><div className={`journey-mount-art mount-${mount.id}`}><img src="/assets/journey/mounts.png" alt=""/></div><h4>{mount.name}</h4><p>{mount.desc}</p><p className="immortal-note">{open ? `Tốc độ di chuyển ×${mount.speed}` : `Mở sau: ${QUESTS[mount.quest].name}`}</p><button className="btn gold" disabled={!open || status !== 'alive'} onClick={() => selectMount(progress.mount === mount.id ? null : mount.id)}>{progress.mount === mount.id ? 'Hạ xuống' : open ? mount.id === 'sword' ? 'Ngự kiếm' : 'Cưỡi hạc' : 'Chưa kết duyên'}</button></article>;
        })}</div>
      </>}
    </div>
    {tab === 'story' && currentAim && <div className="immortal-shortcuts"><span>{childhood ? 'Đường từ quê nhà' : 'Chuẩn bị hành trang'}</span><button className="btn" onClick={() => setTab('world')}>Sơn Hà Đồ</button>{!childhood && <><button className="btn" onClick={() => setTab('alchemy')}>Luyện đan</button><button className="btn" onClick={() => setMenu('cultivate')}>Tu luyện / Đột phá</button></>}{homeOpen && <button className="btn" onClick={() => setTab('home')}>Động phủ</button>}</div>}
    <div className="immortal-wallet">{['thanh_linh_thao', 'ngung_lo', 'linh_chi', 'yeu_dan'].map((id) => <span key={id} style={{ color: ITEMS[id].color }}>{itemName(id)} <b>{player.inventory[id] ?? 0}</b></span>)}</div>
  </div>;
}
