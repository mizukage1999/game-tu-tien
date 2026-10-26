export function JourneyGlyph({
  kind,
}: {
  kind: 'story' | 'alchemy' | 'home' | 'mounts' | 'companions' | 'world';
}) {
  return (
    <svg className="journey-glyph" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      {kind === 'story' ? (
        <>
          <path d="M8 5h17v22H8V5Zm0 0H4v5h4m17 12h3v5h-3M12 11h9m-9 5h9m-9 5h5" />
          <path d="m13 2 3 3 3-3" />
        </>
      ) : kind === 'alchemy' ? (
        <>
          <path d="M9 12c-8 16 22 16 14 0H9Zm0 0-3-3m17 3 3-3M7 25h18M11 29h10M11 8h10M16 3v5M11 18h10m-5-4v8" />
          <path d="M6 17H3v5h6m17-5h3v5h-6" />
        </>
      ) : kind === 'home' ? (
        <>
          <path d="m3 13 13-9 13 9H3Zm3 0v14h20V13M10 27V17h12v10M3 29h26M9 8h14M16 1v4" />
        </>
      ) : kind === 'mounts' ? (
        <>
          <path d="m6 25 18-18 4-4-2 6L8 27l-2-2Zm12-11 5 5m-9 2 5 5M2 21c1-7 7-13 14-15M8 30c6 0 13-5 17-11" />
        </>
      ) : kind === 'companions' ? (
        <>
          <path d="M9 18c-5 3-4 10 1 10 3 0 3-2 6-2s3 2 6 2c5 0 6-7 1-10-5-4-9-4-14 0Z" />
          <ellipse cx="7" cy="12" rx="3" ry="4" />
          <ellipse cx="14" cy="7" rx="3" ry="4" />
          <ellipse cx="22" cy="8" rx="3" ry="4" />
          <ellipse cx="28" cy="14" rx="2" ry="3" />
        </>
      ) : (
        <>
          <path d="m2 26 8-18 8 18H2Zm12 0L24 5l7 21H14ZM8 13l2 2 2-2m10 0 2 2 2-2M4 30h24" />
          <circle cx="16" cy="5" r="2" />
        </>
      )}
    </svg>
  );
}
