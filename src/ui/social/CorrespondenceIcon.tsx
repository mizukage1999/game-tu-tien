export function CorrespondenceIcon({ kind }: { kind: 'mail' | 'friends' | 'invites' | 'search' }) {
  return (
    <svg className="correspondence-icon" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      {kind === 'mail' ? (
        <>
          <path d="M4 8h24v17H4zM4 8l12 10L28 8M4 25l8-9m16 9-8-9" />
          <path d="m13 9 3-3 3 3" />
        </>
      ) : kind === 'search' ? (
        <>
          <circle cx="14" cy="14" r="8" />
          <path d="m20 20 8 8" />
        </>
      ) : (
        <>
          <circle cx="13" cy="10" r="5" />
          <path d="M3 27v-3a10 10 0 0 1 20 0v3H3ZM22 6a5 5 0 0 1 0 9m4 5a8 8 0 0 1 3 7" />
          {kind === 'invites' && <path d="M25 2v8m-4-4h8" />}
        </>
      )}
    </svg>
  );
}
