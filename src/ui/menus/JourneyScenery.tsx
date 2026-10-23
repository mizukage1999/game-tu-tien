/** Lightweight vector scenery stays sharp at phone and desktop resolutions. */
export function JourneyScenery({ village = false }: { village?: boolean }) {
  return <svg className="journey-scenery" viewBox="0 0 800 240" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id="journey-sky" x2="0" y2="1"><stop stopColor="#1b4263"/><stop offset="1" stopColor="#91b9b0"/></linearGradient>
      <linearGradient id="journey-mist" x2="0" y2="1"><stop stopColor="#b4dbd6" stopOpacity="0"/><stop offset="1" stopColor="#b4dbd6" stopOpacity=".7"/></linearGradient>
    </defs>
    <path fill="url(#journey-sky)" d="M0 0h800v240H0z"/>
    <circle cx="620" cy="54" r="29" fill="#f4dfad" opacity=".8"/>
    <path d="M0 180 80 80 118 124 167 26 220 120 270 72 335 186 405 94 450 131 504 22 565 120 610 80 663 158 739 30 800 140V240H0Z" fill="#426e83"/>
    <path d="m142 92 25-66 18 35-13-7-11 37-8-12zm335-15 27-55 19 32-15-8-15 37zm238-1 24-46 16 24-13-4-18 47z" fill="#aac7c8" opacity=".6"/>
    <path fill="url(#journey-mist)" d="M0 87h800v153H0z"/>
    <path d="M0 199 70 160 145 186 212 146 285 177 370 166 445 207 530 174 600 190 700 150 800 176V240H0" fill="#214c52"/>
    <path d="M340 240q78-67 160-36t300-20v56" fill="#7cb6b7"/>
    <path d="M519 219q62-71 121-9m-118 5q60-61 116-9" fill="none" stroke="#d2c29a" strokeWidth="7"/>
    <svg x="475" y="48" width="165" height="165" viewBox="0 0 514 542"><image href="/assets/maps/world-nature.png" width="1536" height="1024"/></svg>
    {village ? <svg x="590" y="72" width="220" height="150" viewBox="0 0 668 476"><image href="/assets/maps/world-village.png" width="1536" height="1024"/></svg>
      : <svg x="565" y="30" width="240" height="190" viewBox="0 0 538 522"><image href="/assets/maps/world-sect.png" width="1536" height="1024"/></svg>}
    <svg x="700" y="105" width="140" height="145" viewBox="1037 522 499 471"><image href="/assets/maps/world-sect.png" width="1536" height="1024"/></svg>
    <path d="M0 228q150-17 300 0t500 0" fill="none" stroke="#b7d1c0" strokeOpacity=".2" strokeWidth="18"/>
  </svg>;
}
