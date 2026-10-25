import { useState, type CSSProperties } from 'react';
import { ITEMS, RARITIES, rarityOf, type RarityId, type ItemDef } from '../../data';
import { gameStore, itemName, useGame, type MenuTab } from '../../store/gameStore';
import { itemIconUrl } from '../../game/art/icons';
import { canEquip, realmNameAtLevel } from '../../game/systems/progression';
import {
  enhancementLevel,
  enhanceCost,
  enhanceChance,
  MAX_ENHANCEMENT,
  ENHANCEMENT_STONE,
} from '../../game/systems/enhancement';
import {
  INVENTORY_GROUPS,
  filteredInventory,
  inventoryEntries,
  inventoryGroup,
  type InventoryGroup,
  type InventoryView,
  type InventorySort,
} from '../../game/systems/inventory';
import { CultHeading, CultLock } from './CultivationUI';
import { equipmentBaseId } from '../../game/systems/equipment';
import './bag.css';

const RARITY_LABELS: Record<RarityId, string> = {
  white: 'Trắng',
  blue: 'Xanh',
  green: 'Lục',
  purple: 'Tím',
  orange: 'Cam',
  red: 'Đỏ',
  pink: 'Hồng',
};
type ItemDestination = {
  label: string;
  menu: MenuTab;
  section?: 'alchemy' | 'home' | 'companions' | 'story';
  home?: 'field' | 'furnace' | 'artifact';
};
function itemDestination(id: string | undefined): ItemDestination | null {
  if (!id) return null;
  if (id === 'kiem_pho') return { label: 'Nâng kỹ năng', menu: 'skills' };
  if (id === 'tinh_luyen_thach') return { label: 'Cường hóa trang bị', menu: 'character' };
  if (id === 'linh_thach') return { label: 'Đến cửa hàng', menu: 'shop' };
  if (id === 'linh_khi') return { label: 'Tu luyện', menu: 'cultivate' };
  if (id === 'thuc_an_linh_thu')
    return { label: 'Nuôi linh thú', menu: 'journey', section: 'companions' };
  if (id.startsWith('hat_'))
    return { label: 'Đến linh điền', menu: 'journey', section: 'home', home: 'field' };
  if (id.startsWith('cong_thuc_') || id === 'huyen_thiet')
    return { label: 'Đến lò đan', menu: 'journey', section: 'home', home: 'furnace' };
  if (id === 'phap_bao_ngoc')
    return { label: 'Vận dụng pháp bảo', menu: 'journey', section: 'home', home: 'artifact' };
  if (['thanh_linh_thao', 'linh_chi', 'ngung_lo', 'yeu_dan', 'pha_canh_dan'].includes(id))
    return { label: 'Đến Đan Phòng', menu: 'journey', section: 'alchemy' };
  if (id === 'thach_linh_an') return { label: 'Xem cốt truyện', menu: 'journey', section: 'story' };
  return null;
}
export function BagPanel() {
  const p = useGame((s) => s.player),
    status = useGame((s) => s.status),
    equip = useGame((s) => s.equip),
    unequip = useGame((s) => s.unequip),
    consume = useGame((s) => s.consumeItem),
    act = useGame((s) => s.adventureAction),
    salvage = useGame((s) => s.salvageLegacy),
    patch = useGame((s) => s.patch),
    setMenu = useGame((s) => s.setMenu);
  const [group, setGroup] = useState<InventoryGroup>('all'),
    [rarity, setRarity] = useState('all'),
    [view, setView] = useState<InventoryView>('all'),
    [sort, setSort] = useState<InventorySort>('rarity');
  const [selectedId, setSelectedId] = useState(''),
    [notice, setNotice] = useState('');
  const owned = inventoryEntries(p),
    entries = filteredInventory(owned, { group, rarity, view, sort }),
    selected = entries.find((e) => e.id === selectedId) ?? entries[0];
  const id = selected?.id,
    def: ItemDef | undefined = id
      ? (ITEMS[id] ?? {
          name: id,
          kind: 'material',
          color: '#a6b5c8',
          desc: 'Vật phẩm chưa có thông tin công dụng.',
        })
      : undefined,
    r = def?.rarity ? rarityOf(def.rarity) : undefined;
  const n = enhancementLevel(id ? p.adventure?.enhancements[id] : 0),
    stones = enhanceCost(n)[ENHANCEMENT_STONE] ?? 0;
  const req = id && def?.kind === 'equipment' ? canEquip(id, p.level) : null;
  const current = def?.slot ? p.equipment[def.slot] : null,
    currentBonus = current ? ITEMS[current]?.bonus : undefined;
  const base = def?.bonus,
    enhanced = (value: number) => Math.round(value * (1 + n * 0.12));
  const worn = !!selected?.worn,
    usable = def?.kind === 'consumable';
  const destination = itemDestination(id);
  const primary = () => {
    if (!id || !def) return;
    if (def.kind === 'equipment' && def.slot) {
      if (worn) {
        unequip(def.slot);
        setNotice(`Đã tháo ${def.name}, cất lại vào túi.`);
      } else {
        equip(id);
        setNotice(
          equipmentBaseId(gameStore.getState().player.equipment[def.slot] ?? '') === equipmentBaseId(id)
            ? `Đã trang bị ${def.name}.`
            : (gameStore.getState().toasts.slice(-1)[0]?.text ?? 'Chưa thể trang bị vật phẩm này.'),
        );
      }
    } else if (usable) {
      consume(id);
      setNotice(`Đã dùng ${def.name} ×1.`);
    } else if (destination) {
      if (destination.section)
        patch({
          journeySection: destination.section,
          ...(destination.home ? { homeSection: destination.home } : {}),
        });
      setMenu(destination.menu);
    }
  };
  const primaryLabel =
    def?.kind === 'equipment'
      ? worn
        ? 'Tháo xuống'
        : 'Trang bị'
      : usable
        ? 'Sử dụng'
        : (destination?.label ?? 'Không thể sử dụng trực tiếp');
  const controls = def?.kind === 'equipment' || usable;
  const changeFilter = (action: () => void) => {
    action();
    setNotice('');
  };
  return (
    <div className="cult-bag">
      <aside className="cult-bag-sidebar">
        <nav className="cult-side" aria-label="Nhóm vật phẩm">
          {INVENTORY_GROUPS.map(([key, icon, name]) => (
            <button
              key={key}
              data-group={key}
              aria-pressed={group === key}
              className={group === key ? 'active' : ''}
              onClick={() => changeFilter(() => setGroup(key))}
            >
              <i aria-hidden="true">{icon}</i>
              <span>{name}</span>
            </button>
          ))}
        </nav>
        <div className="cult-bag-sort">
          <label>
            Sắp xếp
            <select
              aria-label="Sắp xếp túi đồ"
              value={sort}
              onChange={(e) => setSort(e.target.value as InventorySort)}
            >
              <option value="rarity">Phẩm chất</option>
              <option value="name">Tên vật phẩm</option>
              <option value="quantity">Số lượng</option>
            </select>
          </label>
          <small>
            {owned.length} loại vật phẩm · {Object.values(p.equipment).filter(Boolean).length} đang
            dùng
          </small>
        </div>
      </aside>
      <section className="cult-bag-library" aria-label="Vật phẩm sở hữu">
        <nav className="cult-library-tabs" aria-label="Vị trí vật phẩm">
          {[
            ['all', 'Tất cả'],
            ['bag', 'Trong túi'],
            ['worn', 'Đang dùng'],
          ].map(([key, name]) => (
            <button
              key={key}
              data-view={key}
              aria-pressed={view === key}
              className={view === key ? 'active' : ''}
              onClick={() => changeFilter(() => setView(key as InventoryView))}
            >
              {name}
            </button>
          ))}
        </nav>
        <nav className="cult-bag-rarities" aria-label="Phẩm chất vật phẩm">
          <button
            aria-pressed={rarity === 'all'}
            className={rarity === 'all' ? 'active' : ''}
            onClick={() => changeFilter(() => setRarity('all'))}
          >
            ◇ Tất cả
          </button>
          {RARITIES.map((r) => (
            <button
              key={r.id}
              data-rarity={r.id}
              aria-pressed={rarity === r.id}
              className={rarity === r.id ? 'active' : ''}
              style={{ color: r.color }}
              onClick={() => changeFilter(() => setRarity(r.id))}
            >
              ◆ {RARITY_LABELS[r.id]}
            </button>
          ))}
        </nav>
        <div className="cult-bag-grid">
          {entries.map((e) => {
            const item = ITEMS[e.id],
              color = item?.rarity ? rarityOf(item.rarity).color : (item?.color ?? '#9ab2c0'),
              locked = item?.kind === 'equipment' && !canEquip(e.id, p.level).ok,
              rank = enhancementLevel(p.adventure?.enhancements[e.id]);
            return (
              <button
                key={e.id}
                data-item={e.id}
                className={`cult-bag-item ${id === e.id ? 'selected' : ''}`}
                style={{ '--loot-color': color } as CSSProperties}
                aria-pressed={id === e.id}
                aria-label={`${itemName(e.id)}${item?.slot ? ` +${rank}` : ''} · ${e.quantity}${e.worn ? ' · đang dùng' : ''}`}
                title={`${itemName(e.id)}${item?.slot ? ` +${rank}` : ''} ×${e.quantity}`}
                onClick={() => {
                  setSelectedId(e.id);
                  setNotice('');
                }}
              >
                <img src={itemIconUrl(e.id, 256)} alt="" />
                {rank > 0 && <b className="cult-item-enhance">+{rank}</b>}
                {e.worn > 0 && (
                  <span className="cult-item-worn" title="Đang trang bị">
                    ✓
                  </span>
                )}
                {locked && (
                  <span className="cult-item-lock">
                    <CultLock />
                  </span>
                )}
                <span className="cult-item-quality" aria-hidden="true">
                  ◆
                </span>
                <b className="cult-item-quantity">{e.quantity.toLocaleString('vi-VN')}</b>
              </button>
            );
          })}
          {Array.from({ length: Math.max(0, 24 - entries.length) }, (_, i) => (
            <span key={`empty-${i}`} className="cult-bag-slot-empty" aria-hidden="true" />
          ))}
        </div>
        <div className="cult-bag-count">
          <span>
            {entries.length} / {owned.length} ô
          </span>
          <small>Chọn vật phẩm để xem chi tiết</small>
        </div>
      </section>
      <section className="cult-bag-detail" aria-label="Chi tiết vật phẩm">
        {selected && id && def ? (
          <>
            <div className="cult-bag-detail-scroll">
              <header className="cult-item-heading">
                <small>{INVENTORY_GROUPS.find((g) => g[0] === inventoryGroup(id))?.[2]}</small>
                <h2 style={{ color: r?.color ?? '#f2d99f' }}>{def.name}</h2>
                <div className="cult-skill-tags">
                  {r && <span style={{ borderColor: r.color, color: r.color }}>{r.name}</span>}
                  {worn && <span className="on">Đang dùng</span>}
                  {n > 0 && <span>+{n}</span>}
                </div>
              </header>
              <div
                className="cult-item-showcase"
                style={{ '--loot-color': r?.color ?? def.color } as CSSProperties}
              >
                <div className="cult-item-pedestal" />
                <img src={itemIconUrl(id, 256)} alt={def.name} />
                <div>
                  <span>
                    Trong túi <b>{selected.bag.toLocaleString('vi-VN')}</b>
                  </span>
                  {worn && (
                    <span>
                      Trang bị <b>{selected.worn}</b>
                    </span>
                  )}
                  {def.reqLevel && (
                    <span className={req && !req.ok ? 'short' : ''}>
                      Yêu cầu <b>Lv.{def.reqLevel}</b>
                    </span>
                  )}
                </div>
              </div>
              {base && (
                <>
                  <CultHeading>Thuộc tính trang bị</CultHeading>
                  <dl className="cult-loot-stats">
                    {(
                      [
                        ['atk', 'Công kích'],
                        ['def', 'Phòng ngự'],
                        ['hp', 'Sinh lực'],
                      ] as const
                    )
                      .filter(([k]) => base[k])
                      .map(([k, name]) => {
                        const value = enhanced(base[k] ?? 0),
                          other = enhancementLevel(
                            current ? p.adventure?.enhancements[current] : 0,
                          ),
                          diff = value - Math.round((currentBonus?.[k] ?? 0) * (1 + other * 0.12));
                        return (
                          <div key={k}>
                            <dt>{name}</dt>
                            <dd>
                              +{value.toLocaleString('vi-VN')}
                              {!worn && current && (
                                <small className={diff >= 0 ? 'up' : 'down'}>
                                  {diff >= 0 ? '+' : ''}
                                  {diff} so với đang dùng
                                </small>
                              )}
                            </dd>
                          </div>
                        );
                      })}
                  </dl>
                </>
              )}
              <CultHeading>{base ? 'Đặc tính vật phẩm' : 'Công dụng'}</CultHeading>
              <p className="cult-item-description">{def.desc}</p>
              {def.reqLevel && (
                <p className={`cult-item-requirement ${req && !req.ok ? 'short' : ''}`}>
                  {realmNameAtLevel(def.reqLevel)} · Lv.{def.reqLevel}
                </p>
              )}
              {usable && (
                <p className="cult-item-effect">
                  {def.heal
                    ? `Hồi ${Math.round(def.heal * 100)}% sinh lực và linh lực.`
                    : def.cultivation
                      ? `+${def.cultivation.exp} EXP · +${def.cultivation.linhKhi} Linh Khí`
                      : ''}
                </p>
              )}
              {def.slot && (
                <div className="cult-item-enhancement">
                  <CultHeading>Cường hóa</CultHeading>
                  <p>
                    {n >= MAX_ENHANCEMENT
                      ? 'Đã đạt tối đa +12.'
                      : `Lên +${n + 1} · Thành công ${Math.round(enhanceChance(n) * 100)}%`}
                  </p>
                  {n < MAX_ENHANCEMENT && (
                    <span>
                      <img src={itemIconUrl(ENHANCEMENT_STONE)} alt="" />
                      Đá Cường Hóa {p.inventory[ENHANCEMENT_STONE] ?? 0}/{stones}
                    </span>
                  )}
                </div>
              )}
            </div>
            <footer className="cult-bag-actions">
              <p className="cult-notice" role="status">
                {notice ||
                  (req && !req.ok
                    ? req.reason
                    : controls && status !== 'alive'
                      ? 'Cần hồi phục để sử dụng vật phẩm.'
                      : '')}
              </p>
              <div className="cult-action-row">
                {def.slot && (
                  <button
                    className="cult-btn gold"
                    data-action="enhance"
                    disabled={
                      status !== 'alive' || n >= MAX_ENHANCEMENT || (p.inventory[ENHANCEMENT_STONE] ?? 0) < stones
                    }
                    onClick={() => {
                      act({ type: 'enhance', id });
                      const next = enhancementLevel(
                        gameStore.getState().player.adventure?.enhancements[id],
                      );
                      setNotice(
                        next > n
                          ? `Cường hóa thành công lên +${next}.`
                          : `Thất bại. Trang bị giữ +${n}.`,
                      );
                    }}
                  >
                    Cường hóa{n < 12 ? ` +${n + 1}` : ''}
                  </button>
                )}
                <button
                  className={`cult-btn ${!def.slot ? 'gold' : ''}`}
                  data-action="primary"
                  disabled={
                    controls ? status !== 'alive' || (!worn && !!req && !req.ok) : !destination
                  }
                  onClick={primary}
                >
                  {primaryLabel}
                </button>
                {def.kind === 'equipment' && def.slot !== 'weapon' && selected.bag > 0 && !worn && (
                  <button
                    className="cult-btn"
                    data-action="salvage"
                    title="Phân giải món này thành 2 Huyền Thiết"
                    onClick={() => {
                      salvage(id);
                      setNotice('Đã phân giải thành 2 Huyền Thiết.');
                    }}
                  >
                    Phân giải
                  </button>
                )}
              </div>
            </footer>
          </>
        ) : (
          <div className="cult-bag-empty">
            <span aria-hidden="true">◇</span>
            <h2>{owned.length ? 'Không có vật phẩm phù hợp' : 'Túi đồ đang trống'}</h2>
            <p>
              {owned.length
                ? 'Thử nhóm hoặc phẩm chất khác.'
                : 'Khám phá sơn hà, thu thập vật phẩm trên hành trình.'}
            </p>
            {notice && (
              <p className="cult-notice" role="status">
                {notice}
              </p>
            )}
            <button
              className="cult-btn"
              onClick={() => {
                setGroup('all');
                setRarity('all');
                setView('all');
              }}
            >
              Xem tất cả
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
