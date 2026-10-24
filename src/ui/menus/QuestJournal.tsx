import { useState, type CSSProperties } from 'react';
import { QUESTS, type QuestDef } from '../../data';
import { EventBus } from '../../game/EventBus';
import { itemIconUrl } from '../../game/art/icons';
import { objectiveText } from '../../game/systems/quest';
import { originText } from '../../game/systems/origin';
import { trackQuest } from '../../game/systems/questNav';
import { itemName, npcName, questNames, useGame } from '../../store/gameStore';
import { useTrackedQuest } from '../useTrackedQuest';
import { CultHeading } from './CultivationUI';
import { SectGlyph } from './SectGlyph';
import './quest-sect.css';

export function QuestScenery({ scene, className = '' }: { scene: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`quest-scenery ${className}`}
      style={
        {
          backgroundPosition: `${(scene % 3) * 50}% ${Math.floor(scene / 3) * 100}%`,
        } as CSSProperties
      }
    />
  );
}
function sceneFor(id: string, def: QuestDef) {
  if (id.startsWith('village_')) return 0;
  if (def.objectives.some((o) => o.type === 'gather' || o.type === 'collect')) return 2;
  if (def.objectives.some((o) => o.type === 'craft')) return 4;
  if (def.objectives.some((o) => o.type === 'clearDungeon' || o.type === 'kill')) return 3;
  return 1;
}
const STATUS = { active: 'Đang tiến hành', ready: 'Có thể trả', done: 'Đã hoàn thành' };
type Filter = 'current' | 'ready' | 'done' | 'all';

export function QuestJournal() {
  const quests = useGame((s) => s.quests),
    player = useGame((s) => s.player);
  const status = useGame((s) => s.status),
    dungeon = useGame((s) => s.dungeon);
  const tracked = useTrackedQuest();
  const [filter, setFilter] = useState<Filter>('current');
  const [selected, setSelected] = useState<string | null>(null);
  const entries = Object.entries(quests).filter(([id]) => !!QUESTS[id]);
  const activeCount = entries.filter(([, q]) => q.status !== 'done').length;
  const shown = entries
    .filter(
      ([, q]) =>
        filter === 'all' || (filter === 'current' ? q.status !== 'done' : q.status === filter),
    )
    .sort(
      ([a, qa], [b, qb]) =>
        Number(b === tracked) - Number(a === tracked) ||
        Number(qa.status === 'done') - Number(qb.status === 'done') ||
        Number(qb.status === 'ready') - Number(qa.status === 'ready') ||
        Number(QUESTS[b].kind === 'main') - Number(QUESTS[a].kind === 'main'),
    );
  const id = shown.find(([key]) => key === selected)?.[0] ?? shown[0]?.[0];
  const def = id ? QUESTS[id] : null,
    q = id ? quests[id] : null;

  return (
    <div className="cult-quest-journal">
      <nav className="cult-side chronicle-side" aria-label="Mục nhiệm vụ">
        <button className="active" aria-current="page">
          <SectGlyph kind="quest" />
          <span>Tất cả</span>
          <small>{activeCount}</small>
        </button>
        <div className="chronicle-side-poem">
          <small>TIÊN LỘ</small>Từng bước đi,
          <br />
          viết một đời cầu đạo.
        </div>
      </nav>
      <section className="quest-journal-list" aria-label="Danh sách nhiệm vụ">
        <header className="chronicle-list-heading">
          <select
            aria-label="Trạng thái nhiệm vụ"
            value={filter}
            onChange={(e) => setFilter(e.target.value as Filter)}
          >
            <option value="current">Đang tiến hành</option>
            <option value="ready">Có thể trả</option>
            <option value="done">Đã hoàn thành</option>
            <option value="all">Tất cả trạng thái</option>
          </select>
          <span>{shown.length} nhiệm vụ</span>
        </header>
        <div className="quest-journal-scroll">
          {shown.map(([key, progress]) => {
            const d = QUESTS[key],
              aimIndex = d.objectives.findIndex((o, i) => (progress.progress[i] ?? 0) < o.count);
            const aim = d.objectives[Math.max(0, aimIndex)];
            return (
              <button
                key={key}
                data-quest={key}
                className={`quest-journal-card ${id === key ? 'selected' : ''}`}
                aria-pressed={id === key}
                onClick={() => setSelected(key)}
              >
                <QuestScenery scene={sceneFor(key, d)} />
                <span className="quest-journal-card-copy">
                  <span className={`chronicle-tag ${d.kind}`}>
                    {d.kind === 'main' ? 'Chính' : 'Phụ'}
                  </span>
                  <b>{originText(d.name, player)}</b>
                  <span>
                    {progress.status === 'ready' && d.turnIn
                      ? `Trả cho ${npcName(d.turnIn)}`
                      : aim
                        ? objectiveText(aim, questNames)
                        : originText(d.desc, player)}
                  </span>
                  <small>
                    {key === tracked && progress.status !== 'done'
                      ? '◆ Đang theo dõi'
                      : STATUS[progress.status]}
                  </small>
                </span>
                <span className="quest-card-chevron" aria-hidden="true">
                  ›
                </span>
              </button>
            );
          })}
          {!shown.length && (
            <div className="chronicle-empty">
              <SectGlyph kind="quest" />
              <h3>Chưa có nhiệm vụ</h3>
              <p>Đổi trạng thái để xem nhiệm vụ khác, hoặc tìm NPC có dấu ! trên bản đồ.</p>
            </div>
          )}
        </div>
        <footer className="chronicle-list-footer">
          {entries.filter(([, p]) => p.status === 'done').length} đã hoàn thành · {activeCount} đang
          thực hiện
        </footer>
      </section>
      <section className="quest-journal-detail" aria-label="Chi tiết nhiệm vụ">
        {id && def && q ? (
          <>
            <div className="quest-journal-detail-scroll">
              <header className="quest-journal-hero">
                <QuestScenery scene={sceneFor(id, def)} />
                <div>
                  <span className={`chronicle-tag ${def.kind}`}>
                    {def.kind === 'main' ? 'Chính tuyến' : 'Nhiệm vụ phụ'}
                  </span>
                  <h2>{originText(def.name, player)}</h2>
                  <p>{originText(def.story ?? def.desc, player)}</p>
                </div>
              </header>
              <div className="quest-journal-objectives">
                <CultHeading>Mục tiêu nhiệm vụ</CultHeading>
                {def.objectives.map((o, i) => {
                  const n = Math.min(o.count, q.progress[i] ?? 0),
                    done = q.status === 'done' || n >= o.count;
                  return (
                    <div className={`quest-journal-objective ${done ? 'complete' : ''}`} key={i}>
                      <span className="quest-objective-check" aria-hidden="true">
                        {done ? '✓' : ''}
                      </span>
                      <span>{objectiveText(o, questNames)}</span>
                      <b>
                        {done ? o.count : n}/{o.count}
                      </b>
                    </div>
                  );
                })}
              </div>
              <div className="quest-journal-guidance">
                <CultHeading>Hướng dẫn</CultHeading>
                <p>{originText(def.desc, player)}</p>
                {def.turnIn && (
                  <p className={q.status === 'ready' ? 'quest-return-ready' : 'chronicle-muted'}>
                    Trả nhiệm vụ: {npcName(def.turnIn)}
                    {q.status === 'ready' ? ' · Đã đủ điều kiện' : ''}
                  </p>
                )}
              </div>
              <div className="quest-journal-rewards">
                <CultHeading>Phần thưởng</CultHeading>
                <div className="chronicle-rewards">
                  {!!def.rewards.exp && (
                    <span className="chronicle-reward exp">
                      <b>EXP</b>
                      <small>{def.rewards.exp.toLocaleString('vi-VN')}</small>
                    </span>
                  )}
                  {!!def.rewards.linhKhi && (
                    <span className="chronicle-reward" title="Linh Khí">
                      <img src={itemIconUrl('linh_khi', 64)} alt="Linh Khí" />
                      <small>{def.rewards.linhKhi}</small>
                    </span>
                  )}
                  {Object.entries(def.rewards.items ?? {}).map(([item, n]) => (
                    <span className="chronicle-reward" key={item} title={itemName(item)}>
                      <img src={itemIconUrl(item, 64)} alt={itemName(item)} />
                      <small>×{n}</small>
                    </span>
                  ))}
                </div>
                {q.status === 'done' && (
                  <p className="chronicle-muted">Đã hoàn thành và nhận phần thưởng.</p>
                )}
              </div>
            </div>
            <footer className="quest-journal-actions">
              <button
                className={`cult-btn ${tracked === id ? '' : 'gold'}`}
                disabled={q.status === 'done'}
                onClick={() => trackQuest(tracked === id ? null : id)}
              >
                {tracked === id ? 'Bỏ theo dõi' : 'Theo dõi'}
              </button>
              <button
                className="cult-btn"
                disabled={q.status === 'done' || status !== 'alive' || !!dungeon}
                onClick={() => EventBus.emit('cmd:questGo', id)}
              >
                {q.status === 'ready' ? 'Đến trả nhiệm vụ' : 'Đến vị trí'}
              </button>
            </footer>
          </>
        ) : (
          <div className="chronicle-empty">
            <SectGlyph kind="quest" />
            <h2>Nhật ký tiên lộ</h2>
            <p>Chọn một nhiệm vụ để xem mục tiêu và phần thưởng.</p>
          </div>
        )}
      </section>
    </div>
  );
}
