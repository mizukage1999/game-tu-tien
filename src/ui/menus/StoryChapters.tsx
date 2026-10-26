import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { QUESTS, type QuestRewards } from '../../data';
import { heroFor } from '../../data/heroes';
import { EventBus } from '../../game/EventBus';
import { itemIconUrl } from '../../game/art/icons';
import { journeyQuestState, journeyStages } from '../../game/systems/journey';
import { isChildhood, originText } from '../../game/systems/origin';
import { objectiveText } from '../../game/systems/quest';
import { trackQuest } from '../../game/systems/questNav';
import { itemName, npcName, questNames, useGame } from '../../store/gameStore';
import { ChildHeroPortrait, RosterPortrait } from '../HeroArt';
import { CultLock } from './CultivationUI';
import { QuestScenery } from './QuestJournal';

type Detail = 'tasks' | 'story' | 'rewards';
const LABELS = {
  active: 'Đang thực hiện',
  ready: 'Đến trả nhiệm vụ',
  done: 'Đã nhận thưởng',
  available: 'Nhận nhiệm vụ',
  locked: 'Chưa mở',
};
const PATHS = [
  'M18 76 C28 82 35 72 41 67',
  'M41 67 C42 57 19 65 29 48',
  'M29 48 C31 34 55 52 58 35',
  'M58 35 C60 21 80 32 77 17',
  'M77 17 C100 18 92 30 83 48',
  'M83 48 C66 54 67 62 81 72',
  'M81 72 C92 80 73 85 84 91',
];

function Prizes({ rewards }: { rewards: QuestRewards }) {
  return (
    <div className="road-prizes" aria-label="Phần thưởng nhiệm vụ">
      {!!rewards.exp && (
        <span className="road-prize road-exp" title="EXP">
          <b>EXP</b>
          <small>{rewards.exp.toLocaleString('vi-VN')}</small>
        </span>
      )}
      {!!rewards.linhKhi && (
        <span className="road-prize" title="Linh Khí">
          <img src={itemIconUrl('linh_khi', 48)} alt="Linh Khí" />
          <small>{rewards.linhKhi.toLocaleString('vi-VN')}</small>
        </span>
      )}
      {Object.entries(rewards.items ?? {}).map(([id, n]) => (
        <span key={id} className="road-prize" title={itemName(id)}>
          <img src={itemIconUrl(id, 48)} alt={itemName(id)} />
          <small>×{n}</small>
        </span>
      ))}
    </div>
  );
}

export function StoryChapters() {
  const player = useGame((s) => s.player),
    quests = useGame((s) => s.quests),
    status = useGame((s) => s.status),
    dungeon = useGame((s) => s.dungeon),
    trial = useGame((s) => s.tribulation),
    accept = useGame((s) => s.acceptQuest);
  const stages = journeyStages(player),
    order = stages.flatMap((s) => s.ids),
    current = order.find((id) => quests[id]?.status !== 'done'),
    currentStage = stages.find((s) => s.ids.includes(current ?? '')) ?? stages[stages.length - 1];
  const [choice, setChoice] = useState<string | null>(null),
    [detail, setDetail] = useState<Detail>('tasks');
  const selected = stages.find((s) => s.id === choice) ?? currentStage,
    scroll = useRef<HTMLDivElement>(null);
  const child = isChildhood(player),
    hero = heroFor(player),
    selectedIndex = stages.indexOf(selected),
    done = selected.ids.filter((id) => quests[id]?.status === 'done').length,
    focus = selected.ids.find((id) => quests[id]?.status !== 'done') ?? selected.ids[0];
  const blocked =
    status !== 'alive'
      ? 'Cần hồi phục trước khi tiếp tục.'
      : dungeon
        ? 'Rời phó bản để tiếp tục nhiệm vụ bên ngoài.'
        : trial
          ? 'Hãy vượt qua Thiên Kiếp trước.'
          : null;
  const Portrait = child ? ChildHeroPortrait : RosterPortrait;
  useEffect(() => {
    if (scroll.current) scroll.current.scrollTop = 0;
  }, [selected.id, detail]);
  const go = (id: string) => {
    if (blocked) return;
    trackQuest(id);
    EventBus.emit('cmd:questGo', id);
  };
  return (
    <div className="journey-roadbook">
      <section className="road-map-panel" aria-label="Bản đồ hành trình tu tiên">
        <div className="road-map-view">
          <div className="road-map-title">
            <small>TỪ VƯƠNG GIA THÔN</small>
            <h2>Hành Trình Tu Tiên</h2>
            <p>Từng bước rời quê nhà, viết nên một đời cầu đạo.</p>
          </div>
          <svg
            className="road-route"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {stages.slice(0, -1).map((stage, i) => (
              <path
                key={stage.id}
                d={
                  PATHS.find((path) => path.startsWith(`M${stage.point[0]} ${stage.point[1]} `)) ??
                  `M${stage.point.join(' ')} L${stages[i + 1].point.join(' ')}`
                }
                className={
                  stage.ids.every((id) => quests[id]?.status === 'done') ? 'travelled' : ''
                }
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
          <nav aria-label="Các chặng tiên lộ">
            {stages.map((s, i) => {
              const count = s.ids.filter((id) => quests[id]?.status === 'done').length,
                locked = s.ids.every((id) => journeyQuestState(id, quests, player) === 'locked'),
                isCurrent = s.id === currentStage.id,
                complete = count === s.ids.length;
              return (
                <button
                  key={s.id}
                  type="button"
                  data-stage={s.id}
                  aria-pressed={s.id === selected.id}
                  aria-label={`Chặng ${i + 1}: ${s.name}, ${count}/${s.ids.length} nhiệm vụ${locked ? ', chưa mở' : ''}`}
                  className={`road-node ${locked ? 'locked' : ''} ${isCurrent ? 'current' : ''} ${complete ? 'complete' : ''} ${s.point[1] > 82 ? 'last' : ''}`}
                  style={
                    { '--node-x': `${s.point[0]}%`, '--node-y': `${s.point[1]}%` } as CSSProperties
                  }
                  onClick={() => {
                    setChoice(s.id);
                    setDetail('tasks');
                  }}
                >
                  <span className="road-node-ring">
                    {locked ? (
                      <CultLock />
                    ) : isCurrent ? (
                      <Portrait id={hero.id} />
                    ) : (
                      <QuestScenery scene={s.scene} />
                    )}
                    <span className="road-node-number">{complete ? '✓' : i + 1}</span>
                  </span>
                  <span className="road-node-label">
                    <b>{s.name}</b>
                    <small>
                      {count}/{s.ids.length}
                    </small>
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
        <footer className="road-map-progress">
          <div>
            <span className="road-chest" aria-hidden="true">
              ✦
            </span>
            <h3>
              Tiến độ chặng {selectedIndex + 1}
              <small>{selected.name}</small>
            </h3>
            <b>
              {done}/{selected.ids.length} <small>nhiệm vụ</small>
            </b>
          </div>
          <progress value={done} max={selected.ids.length} aria-label="Tiến độ chặng đang xem" />
          <div className="road-checkpoints">
            {selected.ids.map((id, i) => (
              <span
                key={id}
                className={quests[id]?.status === 'done' ? 'complete' : ''}
                title={originText(QUESTS[id].name, player)}
              >
                <b>{quests[id]?.status === 'done' ? '✓' : i + 1}</b>
                <small>{quests[id]?.status === 'done' ? 'Đã xong' : 'Nhiệm vụ'}</small>
              </span>
            ))}
          </div>
        </footer>
      </section>
      <section className="road-detail" aria-label="Chi tiết chặng tiên lộ">
        <header className="road-detail-hero">
          <QuestScenery scene={selected.scene} />
          <Portrait id={hero.id} className="road-header-portrait" />
          <div>
            <small>{originText(selected.chapter, player)}</small>
            <h2>
              {selectedIndex + 1}. {selected.name}
            </h2>
            <p>{originText(QUESTS[focus].story ?? QUESTS[focus].desc, player)}</p>
          </div>
        </header>
        <nav className="road-detail-tabs" role="tablist" aria-label="Nội dung chặng">
          {(
            [
              ['tasks', 'Nhiệm Vụ'],
              ['story', 'Cốt Truyện'],
              ['rewards', 'Thưởng Chặng'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              type="button"
              id={`road-tab-${id}`}
              aria-controls={`road-panel-${id}`}
              aria-selected={detail === id}
              onClick={() => setDetail(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div
          className="road-detail-scroll"
          role="tabpanel"
          id={`road-panel-${detail}`}
          aria-labelledby={`road-tab-${detail}`}
          ref={scroll}
        >
          {detail === 'tasks' &&
            selected.ids.map((id, i) => {
              const def = QUESTS[id],
                q = quests[id],
                state = journeyQuestState(id, quests, player),
                total = def.objectives.reduce((sum, o) => sum + o.count, 0),
                progress =
                  state === 'done'
                    ? total
                    : def.objectives.reduce(
                        (sum, o, j) => sum + Math.min(q?.progress[j] ?? 0, o.count),
                        0,
                      );
              return (
                <article key={id} data-quest={id} className={`road-task ${state}`}>
                  <h4>
                    <span aria-hidden="true">
                      {state === 'locked' ? '♙' : state === 'done' ? '✓' : '✧'}
                    </span>
                    {selectedIndex + 1}-{i + 1}. {originText(def.name, player)}
                  </h4>
                  <div className="road-task-main">
                    <QuestScenery
                      scene={
                        def.objectives.some((o) => o.type === 'gather' || o.type === 'collect')
                          ? 2
                          : def.objectives.some(
                                (o) => o.type === 'kill' || o.type === 'clearDungeon',
                              )
                            ? 3
                            : selected.scene
                      }
                    />
                    <div className="road-task-copy">
                      <p>{originText(def.desc, player)}</p>
                      <span className="road-task-state">
                        {state === 'ready' && def.turnIn
                          ? `Trả cho ${npcName(def.turnIn)}`
                          : LABELS[state]}
                        <b>
                          {progress}/{total}
                        </b>
                      </span>
                      <progress value={progress} max={total} aria-label={`Tiến độ ${def.name}`} />
                    </div>
                  </div>
                  {(state === 'active' || state === 'ready') && (
                    <details className="road-objectives">
                      <summary>Mục tiêu chi tiết</summary>
                      {def.objectives.map((o, j) => (
                        <p key={j}>
                          {objectiveText(o, questNames)}{' '}
                          <b>
                            {Math.min(q?.progress[j] ?? 0, o.count)}/{o.count}
                          </b>
                        </p>
                      ))}
                    </details>
                  )}
                  <footer>
                    <Prizes rewards={def.rewards} />
                    <button
                      type="button"
                      className={`cult-btn ${state === 'ready' || state === 'available' ? 'gold' : ''}`}
                      disabled={!!blocked || state === 'locked' || state === 'done'}
                      onClick={() => (state === 'available' ? accept(id) : go(id))}
                    >
                      {state === 'active' ? 'Đến ngay' : LABELS[state]}
                    </button>
                  </footer>
                  {state === 'locked' && (
                    <p className="road-lock-reason">
                      {child && !id.startsWith('village_')
                        ? 'Mở sau khi nhập môn'
                        : def.requires
                          ? `Hoàn thành: ${originText(QUESTS[def.requires]?.name ?? def.requires, player)}`
                          : 'Chưa mở'}
                    </p>
                  )}
                </article>
              );
            })}
          {detail === 'story' && (
            <div className="road-story">
              <small>{originText(selected.chapter, player)}</small>
              <h3>{selected.name}</h3>
              {selected.ids.map((id, i) => (
                <article key={id}>
                  <h4>
                    {i + 1}. {originText(QUESTS[id].name, player)}
                  </h4>
                  <p>{originText(QUESTS[id].story ?? QUESTS[id].desc, player)}</p>
                </article>
              ))}
            </div>
          )}
          {detail === 'rewards' && (
            <div className="road-reward-ledger">
              <p>
                Phần thưởng được trao khi hoàn thành hoặc trả từng nhiệm vụ. Không cần nhận lại ở
                đây.
              </p>
              {selected.ids.map((id) => (
                <article key={id}>
                  <h4>{originText(QUESTS[id].name, player)}</h4>
                  <Prizes rewards={QUESTS[id].rewards} />
                  <span className={quests[id]?.status === 'done' ? 'received' : ''}>
                    {quests[id]?.status === 'done' ? '✓ Đã nhận cùng nhiệm vụ' : 'Chưa nhận'}
                  </span>
                </article>
              ))}
            </div>
          )}
        </div>
        <footer className="road-detail-footer">
          <span role="status">
            {blocked ?? `${done}/${selected.ids.length} nhiệm vụ đã hoàn thành`}
          </span>
          <button
            type="button"
            className="cult-btn"
            onClick={() => {
              setChoice(null);
              setDetail('tasks');
            }}
          >
            Chặng hiện tại
          </button>
        </footer>
      </section>
    </div>
  );
}
