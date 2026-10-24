import { useState } from 'react';
import { NAME_MAX, normalizeName } from '../game/systems/character';
import type { Sex } from '../game/systems/save';
import { createCharacter } from '../store/gameStore';
import { EntryScreen } from './EntryScreen';
import { HeroPortrait } from './HeroPortrait';

const CHOICES: { sex: Sex; label: string }[] = [
  { sex: 'female', label: 'Lý Mộ Uyển' },
  { sex: 'male', label: 'Vương Lâm' },
];

export function CreateCharacter({ onDone }: { onDone: () => void }) {
  const [sex, setSex] = useState<Sex>('male');
  const [name, setName] = useState('Vương Lâm');
  const [error, setError] = useState('');

  const submit = () => {
    const cleaned = normalizeName(name);
    if (!cleaned) {
      setError(`Tên từ 1 đến ${NAME_MAX} ký tự.`);
      return;
    }
    createCharacter(cleaned, sex);
    onDone();
  };

  return (
    <EntryScreen kind="create">
      <form
        className="entry-card create-card-v5"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <h2>Chọn nhân vật</h2>
        <p className="muted">
          Theo tuổi thơ {sex === 'female' ? 'Mộ Uyển' : 'Thiết Trụ'} tại Vương Gia Thôn, viết tiếp
          hành trình tu tiên.
        </p>
        <div className="create-sexes">
          {CHOICES.map((c) => (
            <button
              key={c.sex}
              type="button"
              aria-pressed={sex === c.sex}
              className={`create-sex${sex === c.sex ? ' on' : ''}`}
              onClick={() => {
                setSex(c.sex);
                if (CHOICES.some((c) => c.label === name)) setName(c.label);
              }}
            >
              <HeroPortrait sex={c.sex} />
              <span>
                {c.label}
                <small>{c.sex === 'female' ? 'Mộ Uyển · Tuổi thơ' : 'Thiết Trụ · Tuổi thơ'}</small>
              </span>
            </button>
          ))}
        </div>
        <label className="create-name">
          Tên nhân vật
          <input
            value={name}
            maxLength={NAME_MAX}
            placeholder="Ví dụ: Tuyết Kỳ"
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
          />
        </label>
        {error ? (
          <p className="create-error" role="alert">
            {error}
          </p>
        ) : null}
        <button className="entry-start" type="submit">
          <span>Bắt Đầu</span>
          <b aria-hidden="true">→</b>
        </button>
      </form>
    </EntryScreen>
  );
}
