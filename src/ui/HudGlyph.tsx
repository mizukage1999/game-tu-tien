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
    <svg
      className="hud-frame"
      viewBox="0 0 320 140"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 25V9Q2 2 10 2h112l5-1h66l5 1h112q8 0 8 8v120q0 8-8 8H180l-20-2-20 2H10q-8 0-8-8V25Z"
        stroke="#a77c39"
      />
      <path
        d="M5 27V13l8-8h108M199 5h108l8 8v16M5 112v15l8 8h122l25-2 25 2h122l8-8v-16M1 20l7 5-4 9m315-14-7 5 4 9M145 136l15-4 15 4m-22 0 7-2 7 2"
        stroke="#f1d38b"
        strokeWidth="1.2"
      />
    </svg>
  );
}
