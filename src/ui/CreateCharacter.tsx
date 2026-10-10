import { useState } from 'react';
import { portraitUrl } from '../game/art/icons';
import { NAME_MAX, normalizeName } from '../game/systems/character';
import type { Sex } from '../game/systems/save';
import { createCharacter } from '../store/gameStore';

const CHOICES: { sex: Sex; label: string; art: string }[] = [
  { sex: 'female', label: 'Nữ', art: 'player' },
  { sex: 'male', label: 'Nam', art: 'player_male' },
];

export function CreateCharacter({ onDone }: { onDone: () => void }) {
  const [sex, setSex] = useState<Sex>('female');
  const [name, setName] = useState('');
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
    <div className="create-screen">
      <form
        className="create-card panel-ornate"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <h1>Tạo nhân vật</h1>
        <p className="muted">Chọn dáng, đặt tên, rồi vào Đại Thừa Viện.</p>
        <div className="create-sexes">
          {CHOICES.map((c) => (
            <button
              key={c.sex}
              type="button"
              className={`create-sex${sex === c.sex ? ' on' : ''}`}
              onClick={() => setSex(c.sex)}
            >
              <img src={portraitUrl(c.art, 160)} alt="" />
              <span>{c.label}</span>
            </button>
          ))}
        </div>
        <label className="create-name">
          Tên nhân vật
          <input
            value={name}
            maxLength={NAME_MAX}
            autoFocus
            placeholder="Ví dụ: Tuyết Kỳ"
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
          />
        </label>
        {error ? <p className="create-error">{error}</p> : null}
        <button className="btn gold" type="submit">
          Vào thế giới
        </button>
      </form>
    </div>
  );
}
