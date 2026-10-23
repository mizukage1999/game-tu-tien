import { useEffect, useState } from 'react';
import { ITEMS, QUESTS } from '../../data';
import { EventBus } from '../../game/EventBus';
import {
  HOME_MAX_LEVEL, HOME_QUEST, homeMeditateRate, homeUpgradeCost,
  immortalProgress, MOUNTS, mountUnlocked, RECIPES, recipeCheck, storyOrder, storyChapter,
} from '../../game/systems/immortal';
import { objectiveText } from '../../game/systems/quest';
import { itemName, npcName, questNames, useGame } from '../../store/gameStore';
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
  const acceptQuest = useGame((s) => s.acceptQuest);
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

  return <div className={`immortal-journey${tab === 'world' ? ' atlas-open' : ''}`}>
    <div className="immortal-intro">
      <span className="immortal-seal" aria-hidden="true">道</span>
      <div><small>{childhood ? 'VƯƠNG GIA THÔN · THIẾT TRỤ' : 'SƠN HÀ TIÊN LỘ'}</small><h2>{childhood ? 'Những ngày còn thơ' : 'Một đời cầu đạo'}</h2><p>{childhood ? 'Từ mái nhà bên sông, bước đầu tiên đi về phía núi.' : 'Đi qua sơn hà, giữ một lời hẹn trở về.'}</p></div>
      <span className="immortal-counter">{completed}<small> / {order.length} duyên ngộ</small></span>
    </div>
    <div className="immortal-tabs" role="tablist" aria-label="Hoạt động tu tiên">
      {TABS.map((t) => <button key={t.id} id={`journey-tab-${t.id}`} role="tab" aria-controls={`journey-panel-${t.id}`} aria-selected={tab === t.id} disabled={childhood && !['story', 'world'].includes(t.id)} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}><span aria-hidden="true">{t.glyph}</span>{t.label}</button>)}
    </div>
    <div role="tabpanel" id={`journey-panel-${tab}`} aria-labelledby={`journey-tab-${tab}`}>
      {tab === 'story' && <>
        <p className="immortal-note">{childhood ? 'Chương mở đầu phóng tác về tuổi thơ Thiết Trụ. Làm việc nhà, khám phá làng, từ biệt gia đình rồi tham gia khảo hạch nhập môn.' : 'Theo lời Vân Hạc, tìm lại Thanh Vân chân nhân và khám phá những con đường của Linh Sơn.'}</p>
        {order.map((id, index) => {
          const def = QUESTS[id];
          const quest = quests[id];
          const available = !quest && (!def.requires || quests[def.requires]?.status === 'done') && (!childhood || id.startsWith('village_'));
          const active = quest && quest.status !== 'done';
          const showChapter = index === 0 || storyChapter(id) !== storyChapter(order[index - 1]);
          return <div key={id}>
            {showChapter && <h3 className="immortal-chapter">{storyChapter(id)}</h3>}
            <article className={`immortal-story ${active || available ? 'current' : ''} ${quest?.status === 'done' ? 'complete' : ''}`}>
              <span className="immortal-step">{quest?.status === 'done' ? '✓' : String(index + 1).padStart(2, '0')}</span>
              <div><h4>{def.name}<small>{quest?.status === 'done' ? 'Đã hoàn thành' : quest?.status === 'ready' ? 'Chờ báo đáp' : available ? 'Duyên mới' : active ? 'Đang thực hiện' : 'Chưa mở'}</small></h4>
                <p>{def.story ?? def.desc}</p>
                {(active || available) && <>
                  <p className="immortal-instruction">{def.desc}</p>
                  {quest && <ul className="immortal-objectives">{def.objectives.map((o, i) => <li key={i} className={(quest.progress[i] ?? 0) >= o.count ? 'done' : ''}>{objectiveText(o, questNames)} <b>{quest.progress[i] ?? 0}/{o.count}</b></li>)}</ul>}
                  {available ? <button className="btn gold" onClick={() => acceptQuest(id)}>Nhận lời chỉ dẫn</button>
                    : <button className="btn gold" onClick={() => EventBus.emit('cmd:questGo', id)}>{quest?.status === 'ready' && def.turnIn ? `Về gặp ${npcName(def.turnIn)}` : 'Tiếp tục hành trình'}</button>}
                </>}
              </div>
            </article>
          </div>;
        })}
        {!currentId && <p className="immortal-note">Bạch hạc đã nhận chủ. Con đường tìm Thanh Vân vẫn còn phía trước. Trong lúc chờ chương tiếp theo, hãy chăm động phủ, luyện đan và khám phá bí cảnh.</p>}
      </>}
      {tab === 'world' && <WorldAtlas/>}
      {tab === 'alchemy' && <>
        <div className="immortal-feature"><span className="immortal-feature-glyph" aria-hidden="true">丹</span><div><h3>Giữ lửa, kết đan</h3><p>Hái dược quanh sân viện bằng E hoặc chạm khi đứng gần. Yêu Đan rơi từ yêu thú. Mỗi mẻ luyện thành 1 viên, không có tỉ lệ thất bại.</p></div></div>
        <div className="immortal-recipes">{RECIPES.map((recipe) => {
          const reason = recipeCheck(player, recipe.id);
          return <article key={recipe.id} className="immortal-card">
            <div className="immortal-card-heading"><span className={`immortal-pill pill-${recipe.id}`} aria-hidden="true"/><div><h4>{recipe.name}</h4><small>Đã có {player.inventory[recipe.id] ?? 0} · Đã luyện {progress.crafted[recipe.id] ?? 0}</small></div><span className="immortal-tag">Cấp {recipe.level}</span></div>
            <p>{recipe.desc}</p><Costs cost={recipe.cost}/>
            <button className="btn gold" disabled={!!reason || status !== 'alive'} onClick={() => craftPill(recipe.id)}>{reason ?? 'Khai lò luyện đan'}</button>
          </article>;
        })}</div>
        <button className="btn" onClick={() => setMenu('bag')}>Mở túi dùng đan dược</button>
      </>}
      {tab === 'home' && <>
        <div className="immortal-feature"><span className="immortal-feature-glyph" aria-hidden="true">府</span><div><h3>Động Phủ Thanh Vân</h3><p>Một chốn an thân giữa núi mây. Linh mạch để tu luyện, dược điền nuôi đan đạo.</p></div></div>
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
        <div className="immortal-feature"><span className="immortal-feature-glyph" aria-hidden="true">御</span><div><h3>Đạp gió, vượt ngàn mây</h3><p>Kiếm và hạc xuất hiện dưới nhân vật, tăng tốc di chuyển. Tấn công hoặc trúng đòn sẽ hạ xuống; vào phó bản sẽ tạm dừng ngự hành.</p></div></div>
        <div className="immortal-home-grid">{MOUNTS.map((mount) => {
          const open = mountUnlocked(mount.id, quests);
          return <article className="immortal-card" key={mount.id}><span className="immortal-mount-glyph" aria-hidden="true">{mount.id === 'sword' ? '⚔' : '羽'}</span><h4>{mount.name}</h4><p>{mount.desc}</p><p className="immortal-note">{open ? `Tốc độ di chuyển ×${mount.speed}` : `Mở sau: ${QUESTS[mount.quest].name}`}</p><button className="btn gold" disabled={!open || status !== 'alive'} onClick={() => selectMount(progress.mount === mount.id ? null : mount.id)}>{progress.mount === mount.id ? 'Hạ xuống' : open ? mount.id === 'sword' ? 'Ngự kiếm' : 'Cưỡi hạc' : 'Chưa kết duyên'}</button></article>;
        })}</div>
      </>}
    </div>
    {tab === 'story' && currentAim && <div className="immortal-shortcuts"><span>{childhood ? 'Đường từ quê nhà' : 'Chuẩn bị hành trang'}</span><button className="btn" onClick={() => setTab('world')}>Sơn Hà Đồ</button>{!childhood && <><button className="btn" onClick={() => setTab('alchemy')}>Luyện đan</button><button className="btn" onClick={() => setMenu('cultivate')}>Tu luyện / Đột phá</button></>}{homeOpen && <button className="btn" onClick={() => setTab('home')}>Động phủ</button>}</div>}
    <div className="immortal-wallet">{['thanh_linh_thao', 'ngung_lo', 'linh_chi', 'yeu_dan'].map((id) => <span key={id} style={{ color: ITEMS[id].color }}>{itemName(id)} <b>{player.inventory[id] ?? 0}</b></span>)}</div>
  </div>;
}
