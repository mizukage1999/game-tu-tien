export function SectGlyph({
  kind,
}: {
  kind: 'overview' | 'register' | 'quest' | 'contribution' | 'members';
}) {
  return (
    <svg className="sect-glyph" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      {kind === 'overview' ? (
        <>
          <path d="M3 13 16 4l13 9H3ZM5 27h22M7 25V14m6 11V14m6 11V14m6 11V14M2 29h28M16 2v3" />
          <path d="M7 10h18" />
        </>
      ) : kind === 'members' ? (
        <>
          <circle cx="12" cy="10" r="5" />
          <path d="M3 28v-4a9 9 0 0 1 18 0v4H3ZM22 6a5 5 0 0 1 0 9m3 5a7 7 0 0 1 4 7" />
        </>
      ) : kind === 'contribution' ? (
        <>
          <path d="m16 3 10 7v12l-10 7-10-7V10l10-7ZM16 8v16M10 16h12" />
          <path d="m12 12 4-4 4 4m-8 8 4 4 4-4" />
        </>
      ) : (
        <>
          <path d="M9 4h17v22H9M6 8H3v21h19v-3M12 10h10m-10 5h10m-10 5h6" />
          {kind === 'register' && <path d="m20 27 8-8 2 2-8 8-3 1 1-3Z" />}
        </>
      )}
    </svg>
  );
}
