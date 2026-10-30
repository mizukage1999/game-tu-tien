import { useRef, useState, type CSSProperties } from 'react';
import { NAME_MIN, NAME_MAX, normalizeName } from '../game/systems/character';
import { createCharacter } from '../store/gameStore';
import { HEROES, heroFor, type HeroId } from '../data/heroes';
import { availableHeroSkillIds } from '../data/heroSkills';
import { SKILLS } from '../data';
import { HeroFigure, HeroSpellGlyph, RosterPortrait } from './HeroArt';
import { WangSkillGlyph } from './WangSkillArt';
import './character-select.css';
import { claimCharacterName } from '../net/characterName';
import { optimizedAsset } from '../data/assetDelivery';

function Radar({ values }: { values: readonly number[] }) {
  const point = (i: number, radius: number) =>
    `${100 + Math.sin((i * Math.PI * 2) / 5) * radius},${92 - Math.cos((i * Math.PI * 2) / 5) * radius}`;
  return (
    <svg
      className="roster-radar"
      viewBox="0 0 200 185"
      role="img"
      aria-label="Lối chơi: công kích, phòng thủ, khống chế, hỗ trợ, cơ động"
    >
      {[25, 50, 70].map((r) => (
        <polygon
          key={r}
          points={values.map((_, i) => point(i, r)).join(' ')}
          fill="none"
          stroke="#a4875755"
        />
      ))}
      {values.map((_, i) => (
        <line
          key={i}
          x1="100"
          y1="92"
          x2={point(i, 70).split(',')[0]}
          y2={point(i, 70).split(',')[1]}
          stroke="#a4875740"
        />
      ))}
      <polygon
        points={values.map((v, i) => point(i, v * 14)).join(' ')}
        fill="var(--hero-color)"
        fillOpacity=".28"
        stroke="var(--hero-color)"
      />
      {['Công', 'Thủ', 'Khống chế', 'Hỗ trợ', 'Cơ động'].map((v, i) => (
        <text
          key={v}
          x={point(i, 88).split(',')[0]}
          y={Number(point(i, 81).split(',')[1]) + 4}
          textAnchor="middle"
        >
          {v}
        </text>
      ))}
    </svg>
  );
}

export function CreateCharacter({ onDone }: { onDone: () => void }) {
  const [selected, setSelected] = useState<HeroId>('wang_lam');
  const [filter, setFilter] = useState('all');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const submitting = useRef(false);
  const hero = heroFor({ heroId: selected });
  const [spellIndex, setSpellIndex] = useState(0);
  const spells = availableHeroSkillIds(hero.id),
    spell = spells[spellIndex];
  const choose = (id: HeroId) => {
    setSelected(id);
    setSpellIndex(0);
    setError('');
  };
  return (
    <main
      className="roster-entry"
      style={
        {
          '--hero-color': hero.color,
          backgroundImage: `url('${optimizedAsset('/assets/heroes-v7/selection.png')}')`,
        } as CSSProperties
      }
    >
      <header className="roster-header">
        <div>
          <small>NGHỊCH MỆNH TRƯỜNG SINH</small>
          <h1>Cửu Huyền</h1>
        </div>
        <span>
          KHỞI ĐẦU TIÊN LỘ <b>01 / CHỌN NHÂN VẬT</b>
        </span>
      </header>
      <form
        className="roster-layout"
        onSubmit={async (e) => {
          e.preventDefault();
          if (submitting.current) return;
          const cleaned = normalizeName(name);
          if (!cleaned) {
            setError(`Tên nhân vật cần từ ${NAME_MIN} đến ${NAME_MAX} ký tự, không chứa ký tự ẩn.`);
            return;
          }
          submitting.current = true;
          setCreating(true);
          setError('');
          try {
            const reserved = await claimCharacterName(cleaned);
            createCharacter(reserved, hero.sex, hero.id);
            onDone();
          } catch (cause) {
            setError(
              cause instanceof Error ? cause.message : 'Chưa tạo được nhân vật. Hãy thử lại.',
            );
          } finally {
            submitting.current = false;
            setCreating(false);
          }
        }}
      >
        <section className="roster-library" aria-label="Chọn nhân vật">
          <h2>
            <span>✦</span> Chọn nhân vật <small>8 pháp môn</small>
          </h2>
          <nav className="roster-filters" aria-label="Lọc nhân vật">
            {[
              ['all', 'Tất cả'],
              ['male', 'Nam'],
              ['female', 'Nữ'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                disabled={creating}
                aria-pressed={filter === id}
                onClick={() => setFilter(id)}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="roster-grid">
            {HEROES.filter((h) => filter === 'all' || h.sex === filter).map((h) => (
              <button
                key={h.id}
                type="button"
                disabled={creating}
                data-hero={h.id}
                className={h.id === hero.id ? 'selected' : ''}
                aria-pressed={h.id === hero.id}
                onClick={() => choose(h.id)}
                style={{ '--card-color': h.color } as CSSProperties}
              >
                <RosterPortrait id={h.id} />
                <span className="roster-card-school">
                  {h.symbol} {h.school}
                </span>
                <b>{h.name}</b>
                <small>{h.sex === 'male' ? 'Nam' : 'Nữ'}</small>
              </button>
            ))}
          </div>
          <p className="roster-origin">
            <b>⌖ Vương Gia Thôn</b>
            <span>Mọi hành trình đều bắt đầu từ nơi này.</span>
          </p>
        </section>
        <div className="roster-display" key={hero.id}>
          <div className="roster-halo" />
          <HeroFigure id={hero.id} />
          <span className="roster-dais" />
          <small>{hero.motto}</small>
        </div>
        <section className="roster-details" aria-label="Thông tin nhân vật">
          <div className="roster-details-content">
            <div className="roster-identity">
              <span className="roster-school">
                {hero.symbol} {hero.school}
              </span>
              <h2>{hero.name}</h2>
              <p>{hero.desc}</p>
            </div>
            <Radar values={hero.ratings} />
            <div className="roster-spells" role="group" aria-label="Kỹ năng nhân vật">
              {spells.map((id, i) => (
                <button
                  key={id}
                  type="button"
                  aria-label={SKILLS[id].name}
                  aria-pressed={spellIndex === i}
                  onClick={() => setSpellIndex(i)}
                >
                  {hero.id==='wang_lam' ? <WangSkillGlyph id={id} /> : <HeroSpellGlyph id={id} />}
                </button>
              ))}
            </div>
            <div className="roster-spell-info" aria-live="polite">
              <b>{SKILLS[spell].name}</b>
              <span>{SKILLS[spell].desc}</span>
              <small>
                {(SKILLS[spell].unlockLevel ?? 1) === 1
                  ? 'Có từ đầu'
                  : `Mở ở Lv.${SKILLS[spell].unlockLevel}`}{' '}
                · {SKILLS[spell].cooldownMs / 1000}s · {SKILLS[spell].mpCost} MP
              </small>
            </div>
          </div>
          <div className="roster-actions">
            <label className="roster-name">
              Tên nhân vật
              <input
                value={name}
                required
                minLength={NAME_MIN}
                maxLength={NAME_MAX}
                placeholder={`Nhập tên bạn thích (${NAME_MIN}–${NAME_MAX} ký tự)`}
                onChange={(e) => {
                  setName(e.target.value);
                  setError('');
                }}
                autoComplete="off"
                disabled={creating}
              />
            </label>
            {error && (
              <p className="roster-error" role="alert">
                {error}
              </p>
            )}
            <button className="roster-enter" type="submit" disabled={creating} aria-busy={creating}>
              {creating ? 'Đang giữ tên…' : 'Vào game'} <span>→</span>
            </button>
            <p className="roster-footnote">Đánh thường · 3 chiêu tùy chọn · 1 lướt</p>
          </div>
        </section>
      </form>
    </main>
  );
}
