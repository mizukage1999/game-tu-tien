import type { HeroId } from '../../data/heroes';

// Native vector item art stays crisp on phone DPR without another texture atlas.
const SHAPES: Partial<Record<HeroId, string>> = {
  ly_mo_uyen:
    '<g transform="rotate(16 48 48)"><path d="M29 14h38v67H29z" fill="url(#metal)"/><path d="M35 20h26v54H35z" stroke="#fff2be"/><path d="M48 25v39m-9-30 18 12-18 9m2 7 14 6M38 77h20" stroke="#ac341c" stroke-width="3"/></g>',
  tham_nguyet:
    '<path d="M33 13q57 35 0 70M33 13 55 48 33 83M18 48h60m-9-8 12 8-12 8" stroke="url(#metal)" stroke-width="5"/><path d="M33 13 55 48 33 83" stroke="#e4ffd3" stroke-width="1.5"/>',
  so_thien:
    '<path d="m21 14 45 49-9 8Q31 47 21 14Zm54 0L30 63l9 8Q65 47 75 14Z" fill="url(#metal)" stroke="#ffe4c0"/><path d="m60 67 13 15M36 67 23 82M54 74l16-15M26 59l16 15" stroke="#cda86b" stroke-width="5"/>',
  hong_lien:
    '<path d="m48 15 30 33-30 33-30-33Z" fill="#631826" stroke="url(#metal)" stroke-width="4"/><path d="M49 24c16 22-3 20 9 34 3-9 8-9 9-19 13 34-25 43-35 18-4-12 6-19 6-25 0 11 8 16 11-8Z" fill="url(#metal)"/>',
  vu_minh:
    '<path d="M30 12v73" stroke="#e9c784" stroke-width="5"/><path d="M34 17h36l-8 20 8 20H34Z" fill="#3e194e" stroke="url(#metal)" stroke-width="3"/><path d="m43 27 16 15m0-15L43 42m1 9 7-15 8 15" stroke="#d9a7ff" stroke-width="2.5"/>',
  quan_vo_tran:
    '<path d="M48 36v48" stroke="url(#metal)" stroke-width="6"/><circle cx="48" cy="25" r="15" stroke="url(#metal)" stroke-width="5"/><g stroke="#ffe1a0" stroke-width="2"><circle cx="33" cy="34" r="7"/><circle cx="48" cy="39" r="7"/><circle cx="63" cy="34" r="7"/></g><path d="m48 7 5 9-5 9-5-9Z" fill="#fff2be"/>',
  diep_ly:
    '<g transform="rotate(17 48 48)"><path d="M25 21h12v56H25zm17-5h12v64H42zm17 5h12v56H59Z" fill="url(#metal)" stroke="#b9f7ff" stroke-width="1.5"/><path d="M25 32h46M25 66h46" stroke="#c59d50" stroke-width="3"/><path d="m29 41 4 12m13-17 4 18m13-13 4 12" stroke="#07537d" stroke-width="2"/></g>',
};
const cache = new Map<string, string>();
export function schoolWeaponIcon(hero: HeroId, color: string) {
  const shape = SHAPES[hero];
  if (!shape) return undefined;
  const key = hero + color;
  let url = cache.get(key);
  if (url) return url;
  url =
    'data:image/svg+xml,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><defs><radialGradient id="a"><stop stop-color="${color}" stop-opacity=".35"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient><linearGradient id="metal" x2="1" y2="1"><stop stop-color="#fff2b9"/><stop offset=".5" stop-color="${color}"/><stop offset="1" stop-color="#9fd8ed"/></linearGradient></defs><circle cx="48" cy="48" r="47" fill="url(#a)"/><g fill="none" stroke-linecap="round" stroke-linejoin="round">${shape}</g></svg>`,
    );
  cache.set(key, url);
  return url;
}
