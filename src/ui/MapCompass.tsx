export function MapCompass() {
  return <svg className="map-compass" viewBox="0 0 90 100" aria-hidden="true">
    <circle cx="45" cy="53" r="28" fill="#0617249c" stroke="#c2a066" strokeWidth=".8" />
    <circle cx="45" cy="53" r="24" fill="none" stroke="#c2a06670" strokeWidth=".6" />
    <path d="M45 14 50 48 84 53 50 58 45 92 40 58 6 53 40 48Z" fill="#d4b476" stroke="#f0d49a" strokeWidth=".6" />
    <path d="m45 14 0 39 5-5Zm39 39H45l5 5ZM45 92V53l-5 5ZM6 53h39l-5-5Z" fill="#725a35" />
    <circle cx="45" cy="53" r="3" fill="#f8dda0" />
    <text x="45" y="9" fill="#ead3a2" textAnchor="middle" fontSize="9" fontFamily="Georgia,serif">Bắc</text>
  </svg>;
}
