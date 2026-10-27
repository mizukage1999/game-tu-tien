import type { ReactNode } from 'react';
import { optimizedAsset } from '../data/assetDelivery';
import { getMap } from '../game/maps';
import { heroName, isChildhood } from '../game/systems/origin';
import { realmNameAtLevel } from '../game/systems/progression';
import { useGame } from '../store/gameStore';
import './entry-screen.css';

export function EntryScreen({ children, kind = '' }: { children: ReactNode; kind?: string }) {
  return (
    <main className={`entry-screen entry-${kind}`} style={{ backgroundImage: `url('${optimizedAsset('/assets/ui/login-v5.png')}')` }}>
      <div className="entry-vignette" aria-hidden="true" />
      <div className="entry-content">
        <header className="entry-brand">
          <small>NGHỊCH MỆNH TRƯỜNG SINH</small>
          <h1>
            Cửu Huyền<span>天逆</span>
          </h1>
          <p>Một bước phàm trần · Vạn dặm tiên lộ</p>
        </header>
        {children}
      </div>
      <div className="entry-caption" aria-hidden="true">
        <span>一念修仙</span>
        <p>
          Một niệm tu tiên
          <br />
          Một đời nghịch mệnh
        </p>
      </div>
      <footer className="entry-footer">
        <span>TU TIÊN · VƯƠNG GIA THÔN</span>
        <span>Hành trình của bạn bắt đầu từ đây</span>
      </footer>
    </main>
  );
}

export function StartScreen({ onStart }: { onStart: () => void }) {
  const player = useGame((s) => s.player),
    mapId = useGame((s) => s.mapId);
  const map = getMap(mapId);
  return (
    <EntryScreen kind="welcome">
      <section className="entry-card entry-resume" aria-label="Tiếp tục hành trình">
        <div className="entry-eyebrow">TIÊN DUYÊN CHƯA DỨT</div>
        <h2>{heroName(player)}</h2>
        <p className="entry-summary">
          {isChildhood(player)
            ? 'Những ngày còn thơ'
            : `Lv.${player.level} · ${realmNameAtLevel(player.level)}`}
        </p>
        <div className="entry-location">
          <i aria-hidden="true" />
          <span>{map.name}</span>
          <small>Đã lưu hành trình</small>
        </div>
        <button className="entry-start" onClick={onStart}>
          <span>Tiếp Tục</span>
          <b aria-hidden="true">→</b>
        </button>
      </section>
    </EntryScreen>
  );
}
