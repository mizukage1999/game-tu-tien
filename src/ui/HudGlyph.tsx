export function HudGlyph({ kind }: { kind: 'hp' | 'mp' | 'book' | 'quest' | 'party' | 'pin' }) {
  return (
    <svg
      className={`hud-glyph hud-glyph-${kind}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      {kind === 'hp' ? (
        <path fill="currentColor" d="M12 21 3.8 13C-2 6 6 0 12 6 18 0 26 6 20.2 13Z" />
      ) : kind === 'mp' ? (
        <path
          fill="currentColor"
          d="M12 1C11 6 4 11 4 15a8 8 0 0 0 16 0c0-4-7-9-8-14Zm-4 14c0 3 2 4 4 5-4 0-6-2-4-5Z"
        />
      ) : kind === 'pin' ? (
        <>
          <path
            stroke="currentColor"
            strokeWidth="1.7"
            d="M12 21s7-7 7-13a7 7 0 0 0-14 0c0 6 7 13 7 13Z"
          />
          <circle cx="12" cy="8" r="2.5" fill="currentColor" />
        </>
      ) : kind === 'party' ? (
        <>
          <circle cx="12" cy="7" r="4" fill="currentColor" />
          <circle cx="3.5" cy="9" r="2.5" fill="currentColor" />
          <circle cx="20.5" cy="9" r="2.5" fill="currentColor" />
          <path
            fill="currentColor"
            d="M5 22v-3a7 7 0 0 1 14 0v3ZM0 21v-4a4 4 0 0 1 5-4l-2 8Zm24 0v-4a4 4 0 0 0-5-4l2 8Z"
          />
        </>
      ) : kind === 'book' ? (
        <path
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
          d="M12 5C9 2 4 3 2 4v16c3-2 7-2 10 0 3-2 7-2 10 0V4c-2-1-7-2-10 1Zm0 0v15M5 7l4 1M5 11l4 1m6-4 4-1m-4 5 4-1"
        />
      ) : (
        <path
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
          d="M7 3h14l-2 4H7l-2 14h13l2-14M7 3H3L1 7h6M8 11h8m-8 4h6M5 21l-3-3M12 2v5"
        />
      )}
    </svg>
  );
}

export function HudFrame() {
  return (
    <div className="hud-frame" aria-hidden="true">
      {['tl', 'tr', 'bl', 'br'].map((corner) => (
        <svg
          key={corner}
          className={`hud-corner hud-corner-${corner}`}
          viewBox="0 0 32 32"
          fill="none"
        >
          <path d="M1 31V15C1 6 6 1 15 1h16M4 30V16C4 8 8 4 16 4h14" stroke="#bd8a3d" />
          <path
            d="M2 24c6-3 4-11 11-11 5 0 6 6 2 7-4 1-5-4-1-4M5 6c6 3 11-5 19-3M6 5c3 6-5 11-3 19M7 13l6-6 4 1-9 9Z"
            stroke="#ffe2a0"
            strokeWidth="1.2"
          />
          <path d="m4 4 3-2 3 3-5 5-3-3Z" fill="#ffe6b0" />
        </svg>
      ))}
    </div>
  );
}

/** Small static ornament: no timer, filter animation or pointer target. */
export function HudLantern() {
  return (
    <svg className="hud-lantern" viewBox="0 0 32 102" fill="none" aria-hidden="true">
      <path
        d="M16 1v13m-8 2 8-6 8 6M6 20l-3 4 3 35-3 4h26l-3-4 3-35-3-4Z"
        fill="#7e3c12"
        stroke="#eec369"
      />
      <path d="M7 25h18v32H7Z" fill="#ffbf40" stroke="#fff0af" />
      <path d="M11 25h10v32H11Z" fill="#ffdf7c" />
      <path d="m16 29 6 12-6 12-6-12Z" fill="#fff2b6" stroke="#eeb351" />
      <path d="M4 22h24M4 60h24M16 64v9" stroke="#ffdf8e" strokeWidth="2" />
      <path d="m16 71-4 5 4 5 4-5Z" fill="#dd4930" stroke="#ffce77" />
      <path d="m14 80-5 19 5-3 2 5 2-5 5 3-5-19Z" fill="#c32b23" />
      <path d="m16 82-2 14m3-14 2 14" stroke="#f56843" />
    </svg>
  );
}
